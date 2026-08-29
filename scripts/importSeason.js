#!/usr/bin/env node
/**
 * Импорт целого сезона Жайыка с kffleague.kz в Supabase.
 *
 * Использование:
 *   node scripts/importSeason.js --dry-run      # только показать план
 *   node scripts/importSeason.js                # выполнить импорт
 *   node scripts/importSeason.js --only 1274    # один матч
 *
 * Что делает:
 *   1. Берёт список всех игр команды за сезон из реального API сайта
 *      (`/api/v1/teams/{teamId}/games?season_id=...` — найден инспекцией
 *      сетевых запросов страницы команды, т.к. вкладки догружаются JS).
 *   2. Для каждого соперника находит/создаёт строку в `public.teams`.
 *   3. Для сыгранных матчей парсит страницу матча (составы, события,
 *      ссылки на видео) и пишет:
 *        - недостающих игроков обеих команд в `players`;
 *        - РЕАЛЬНУЮ заявку в `match_lineups` (is_starter) — иначе матч-центр
 *          вынужден угадывать стартовый состав по ростеру;
 *        - голы/карточки/замены в `match_events`;
 *        - счёт/статус/ссылки на видео в `matches`.
 *   4. Предстоящие матчи добавляет/обновляет в `matches` (без составов).
 *
 * Скрипт идемпотентен: заявки и события матча переписываются целиком
 * (сначала удаляются строки этого матча), игроки/команды — только
 * добавляются недостающие. Ничего лишнего не удаляет.
 *
 * Нужны переменные окружения NEXT_PUBLIC_SUPABASE_URL и
 * SUPABASE_SERVICE_ROLE_KEY (service-role, т.к. запись обходит RLS).
 */

const axios = require("axios");

const { scrapeMatch } = require("./kffScraper.js");

const API_BASE = "https://kffleague.kz/api/v1";
const USER_AGENT =
  "Mozilla/5.0 (compatible; ZhaiyqAppMatchScraper/1.0; +https://kffleague.kz/ru/matches)";
const ZHAIYQ_KFF_TEAM_ID = 633;
const REQUEST_DELAY_MS = 400;
const COMPETITION_LABEL = "ПЕРВАЯ ЛИГА КАЗАХСТАНА 2026";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Ключ для сравнения названий и фамилий. Казахские буквы сводим к
 * русским аналогам: KFF пишет «Мұхаметжанов»/«Бердәулетов», а в нашей
 * БД те же игроки заведены как «МУХАМЕТЖАНОВ»/«БЕРДАУЛЕТОВ», и без этого
 * они не находятся. Номер формы в сопоставлении всё равно участвует,
 * так что разные игроки со схожими фамилиями не слипнутся.
 */
const LETTER_FOLD = {
  ё: "е", ұ: "у", ү: "у", ә: "а", і: "и", ғ: "г",
  қ: "к", ң: "н", ө: "о", һ: "х",
};

function normalizeLabel(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[ёұүәігқңөһ]/g, (c) => LETTER_FOLD[c] ?? c)
    .replace(/[^a-zа-я0-9]+/gi, "");
}

function isZhaiyqName(name) {
  const s = normalizeLabel(name);
  return s.includes("жайык") || s.includes("zhaiyq") || s.includes("jaiyq");
}

/** «ФАМИЛИЯ Имя» — конвенция, уже используемая в `public.players`. */
function dbNameForPlayer(firstName, lastName) {
  return [lastName, firstName].filter(Boolean).join(" ").trim().toUpperCase();
}

function createSupabaseAdmin() {
  // eslint-disable-next-line global-require -- ленивая загрузка, чтобы парсинг работал без ключей
  const { createClient } = require("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в окружении.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function fetchSeasonGames(teamId, seasonId) {
  const season =
    seasonId ??
    (
      await axios.get(`${API_BASE}/teams/${teamId}/seasons/default`, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        timeout: 20000,
      })
    ).data.season_id;

  const res = await axios.get(
    `${API_BASE}/teams/${teamId}/games?season_id=${season}&lang=ru`,
    {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      timeout: 20000,
    },
  );
  return { seasonId: season, games: res.data.items ?? [] };
}

// ---------------------------------------------------------------------------

class Importer {
  constructor(supabase, { dryRun, competition }) {
    this.sb = supabase;
    this.dryRun = dryRun;
    this.competition = competition || COMPETITION_LABEL;
    this.teams = [];
    this.playersByTeam = new Map();
    this.matches = [];
    this.summary = {
      teamsCreated: [],
      playersInserted: 0,
      playersUpdated: 0,
      matchesCreated: [],
      matchesUpdated: 0,
      lineupsInserted: 0,
      eventsInserted: 0,
      warnings: [],
    };
  }

  async loadState() {
    const [{ data: teams, error: te }, { data: matches, error: me }] =
      await Promise.all([
        this.sb.from("teams").select("*"),
        this.sb.from("matches").select("*"),
      ]);
    if (te) throw new Error(`teams select: ${te.message}`);
    if (me) throw new Error(`matches select: ${me.message}`);
    this.teams = teams ?? [];
    this.matches = matches ?? [];
  }

  async playersOf(teamId) {
    // В dry-run у только что «созданных» команд id фиктивный — в БД такой
    // строки нет, ходить за игроками бессмысленно.
    if (String(teamId).startsWith("dry-")) {
      if (!this.playersByTeam.has(teamId)) this.playersByTeam.set(teamId, []);
      return this.playersByTeam.get(teamId);
    }
    if (this.playersByTeam.has(teamId)) return this.playersByTeam.get(teamId);
    const { data, error } = await this.sb
      .from("players")
      .select("*")
      .eq("team_id", teamId);
    if (error) throw new Error(`players select: ${error.message}`);
    const rows = data ?? [];
    this.playersByTeam.set(teamId, rows);
    return rows;
  }

  /**
   * Сначала точное совпадение, и только потом — по подстроке, выбирая
   * ближайшую по длине. Иначе «Кайрат» цепляется к «Кайрат-Жастар»
   * (одно название — префикс другого) и игроки уезжают не в ту команду.
   */
  findTeam(name) {
    const target = normalizeLabel(name);
    if (!target) return null;
    const exact = this.teams.find((t) => normalizeLabel(t.name ?? "") === target);
    if (exact) return exact;
    // Подстрока допускается только при высокой схожести длин: «кайрат»
    // и «кайратжастар» — разные клубы, хотя одно является префиксом
    // другого, и брать их за одну команду нельзя.
    const partial = this.teams
      .filter((t) => {
        const c = normalizeLabel(t.name ?? "");
        if (!c || !(c.includes(target) || target.includes(c))) return false;
        return Math.min(c.length, target.length) / Math.max(c.length, target.length) >= 0.8;
      })
      .sort(
        (a, b) =>
          Math.abs(normalizeLabel(a.name ?? "").length - target.length) -
          Math.abs(normalizeLabel(b.name ?? "").length - target.length),
      );
    return partial[0] ?? null;
  }

  async findOrCreateTeam(name, logoUrl) {
    const found = this.findTeam(name);
    if (found) {
      // Досыпаем логотип командам, заведённым раньше без него: он нужен и
      // на самой карточке матча, и как NOT NULL значение `matches.logo_url`.
      if (!found.logo_url && logoUrl && !this.dryRun) {
        const { error } = await this.sb
          .from("teams")
          .update({ logo_url: logoUrl })
          .eq("id", found.id);
        if (!error) found.logo_url = logoUrl;
      } else if (!found.logo_url && logoUrl) {
        found.logo_url = logoUrl;
      }
      return found;
    }
    if (this.dryRun) {
      const stub = { id: `dry-${normalizeLabel(name)}`, name };
      this.teams.push(stub);
      this.summary.teamsCreated.push(name);
      return stub;
    }
    const { data, error } = await this.sb
      .from("teams")
      .insert({ name, logo_url: logoUrl ?? null })
      .select("*")
      .single();
    if (error) throw new Error(`teams insert "${name}": ${error.message}`);
    this.teams.push(data);
    this.summary.teamsCreated.push(name);
    return data;
  }

  /**
   * Досыпает недостающих игроков команды и обновляет позицию/фото у
   * существующих. Совпадение — по номеру формы И фамилии: номер сам по себе
   * за сезон может переходить к другому человеку.
   */
  async syncPlayers(teamId, kffPlayers) {
    const existing = await this.playersOf(teamId);
    const toInsert = [];

    for (const p of kffPlayers) {
      const surname = normalizeLabel(p.lastName || "");
      const match = existing.find((row) => {
        if (row.number == null || p.number == null) return false;
        if (Number(row.number) !== Number(p.number)) return false;
        const rowName = normalizeLabel(row.name ?? "");
        return Boolean(surname) && rowName.includes(surname);
      });

      if (match) {
        const patch = {};
        // Позицию из заявки НЕ трогаем: в составе на матч KFF отдаёт
        // тактическую роль именно в этой игре, и она гуляет от матча к
        // матчу. Канонической считаем позицию из ростера команды —
        // её синхронизирует режим `--positions`.
        if (p.photoUrl && !match.photo_url) patch.photo_url = p.photoUrl;
        if (Object.keys(patch).length && !this.dryRun) {
          const { error } = await this.sb
            .from("players")
            .update(patch)
            .eq("id", match.id);
          if (error) throw new Error(`players update: ${error.message}`);
          Object.assign(match, patch);
          this.summary.playersUpdated += 1;
        }
        continue;
      }

      toInsert.push({
        team_id: teamId,
        name: dbNameForPlayer(p.firstName, p.lastName),
        number: p.number ?? null,
        position: p.positionCode,
        photo_url: p.photoUrl ?? null,
      });
    }

    if (!toInsert.length) return;
    this.summary.playersInserted += toInsert.length;
    if (this.dryRun) {
      for (const r of toInsert) existing.push({ ...r, id: `dry-${r.name}` });
      return;
    }
    const { data, error } = await this.sb
      .from("players")
      .insert(toInsert)
      .select("*");
    if (error) throw new Error(`players insert: ${error.message}`);
    existing.push(...(data ?? []));
  }

  /** Ищет игрока команды по номеру + фамилии (для заявок и событий). */
  async resolvePlayerId(teamId, number, fullName) {
    const rows = await this.playersOf(teamId);
    const surname = normalizeLabel(String(fullName || "").split(/\s+/).pop() || "");
    const byNumber = rows.filter(
      (r) => r.number != null && number != null && Number(r.number) === Number(number),
    );
    if (byNumber.length === 1) return byNumber[0].id;
    const exact = byNumber.find((r) => normalizeLabel(r.name ?? "").includes(surname));
    if (exact) return exact.id;
    const bySurname = rows.find(
      (r) => surname && normalizeLabel(r.name ?? "").includes(surname),
    );
    return bySurname?.id ?? null;
  }

  /**
   * Сопоставление идёт по дате + стороне, а НЕ по названию соперника:
   * в БД те же клубы записаны иначе («Batyr» латиницей, «Шахтер» без ё,
   * «Академия Онтустик»), и сравнение по имени наплодило бы дубликаты
   * матчей. Для одной команды пара (дата, дома/в гостях) уникальна.
   */
  findMatchRow(dateIso, opponentName, isHome, wantStatus) {
    const candidates = this.matches.filter(
      (m) =>
        String(m.match_date ?? "").slice(0, 10) === dateIso &&
        Boolean(m.is_home) === isHome,
    );
    if (!candidates.length) return null;
    // В базе рядом с реальными матчами лежат устаревшие мок-строки со
    // статусом `upcoming` на ту же дату. Берём строку с подходящим
    // статусом, иначе импорт «оживит» мок-строку и получится дубль.
    return candidates.find((m) => m.status === wantStatus) ?? candidates[0];
  }

  async upsertMatchRow(game, opponent, isHome, kffLogoUrl) {
    const dateIso = game.date;
    const zhaiyqScore = isHome ? game.home_score : game.away_score;
    const opponentScore = isHome ? game.away_score : game.home_score;
    const status = game.status === "finished" ? "finished" : "upcoming";
    const matchDate = `${dateIso}T${game.time ?? "00:00"}:00`;

    const existing = this.findMatchRow(dateIso, opponent.name, isHome, status);
    if (existing) {
      const patch = {};
      // Приводим название соперника к каноническому (как на KFF): матч-центр
      // связывает `matches.opponent` с `teams.name` по имени, а в БД лежат
      // расхождения вроде «Batyr»/«Шахтер», из-за которых состав гостей
      // не находится.
      if (existing.opponent !== opponent.name) patch.opponent = opponent.name;
      if (status === "finished") {
        if (existing.zhaiyq_score !== zhaiyqScore) patch.zhaiyq_score = zhaiyqScore;
        if (existing.opponent_score !== opponentScore) {
          patch.opponent_score = opponentScore;
        }
        if (existing.status !== "finished") patch.status = "finished";
      }
      if (Object.keys(patch).length) {
        this.summary.matchesUpdated += 1;
        if (!this.dryRun) {
          const { error } = await this.sb
            .from("matches")
            .update(patch)
            .eq("id", existing.id);
          if (error) throw new Error(`matches update: ${error.message}`);
        }
        Object.assign(existing, patch);
      }
      return existing;
    }

    const row = {
      match_date: matchDate,
      opponent: opponent.name,
      // `matches.logo_url` — NOT NULL, поэтому нужен хоть какой-то путь.
      logo_url: opponent.logo_url ?? kffLogoUrl ?? "",
      is_home: isHome,
      zhaiyq_score: status === "finished" ? zhaiyqScore : null,
      opponent_score: status === "finished" ? opponentScore : null,
      competition: this.competition,
      status,
      match_details: null,
    };
    this.summary.matchesCreated.push(`${dateIso} ${opponent.name} (${status})`);
    if (this.dryRun) {
      const stub = { ...row, id: `dry-match-${dateIso}` };
      this.matches.push(stub);
      return stub;
    }
    const { data, error } = await this.sb
      .from("matches")
      .insert(row)
      .select("*")
      .single();
    if (error) throw new Error(`matches insert: ${error.message}`);
    this.matches.push(data);
    return data;
  }

  /**
   * Есть ли в `match_lineups` колонка позиции в матче. Она добавляется
   * миграцией 20260829130000 и может отсутствовать — тогда пишем заявку
   * без неё, а поле строится по канонной позиции из `players`.
   */
  async supportsPositionOverride() {
    if (this._posOverride === undefined) {
      const { error } = await this.sb
        .from("match_lineups")
        .select("position_override")
        .limit(1);
      this._posOverride = !error;
      if (!error) return this._posOverride;
      this.summary.warnings.push(
        "В `match_lineups` нет колонки position_override — составы записаны " +
          "без позиции в матче (примените миграцию 20260829130000 и " +
          "перезапустите импорт, чтобы схемы на поле стали точными).",
      );
    }
    return this._posOverride;
  }

  /** Полностью переписывает заявку матча реальными составами KFF. */
  async writeLineups(matchRow, sides) {
    const withPosition = await this.supportsPositionOverride();
    const rows = [];
    for (const { teamId, lineup } of sides) {
      if (!lineup) continue;
      for (const [group, isStarter] of [
        [lineup.starters ?? [], true],
        [lineup.substitutes ?? [], false],
      ]) {
        for (const p of group) {
          const playerId = await this.resolvePlayerId(teamId, p.number, `${p.firstName} ${p.lastName}`);
          if (!playerId) {
            this.summary.warnings.push(
              `Не нашли в БД игрока ${p.lastName} #${p.number} (${matchRow.opponent})`,
            );
            continue;
          }
          const row = {
            match_id: matchRow.id,
            team_id: teamId,
            player_id: playerId,
            is_starter: isStarter,
          };
          // Роль именно в этом матче (KFF `position`: GK/DEF/MID/FWD).
          if (withPosition && p.positionCode) row.position_override = p.positionCode;
          rows.push(row);
        }
      }
    }
    if (!rows.length) return;
    this.summary.lineupsInserted += rows.length;
    if (this.dryRun) return;
    await this.sb.from("match_lineups").delete().eq("match_id", matchRow.id);
    const { error } = await this.sb.from("match_lineups").insert(rows);
    if (error) throw new Error(`match_lineups insert: ${error.message}`);
  }

  /** Полностью переписывает события матча. */
  async writeEvents(matchRow, scraped, homeTeamId, awayTeamId) {
    const rows = [];
    for (const e of scraped.events ?? []) {
      const teamId =
        e.teamKffId === scraped.homeTeam?.id
          ? homeTeamId
          : e.teamKffId === scraped.awayTeam?.id
            ? awayTeamId
            : null;
      if (!teamId) continue;
      const isSub = e.eventType.includes("sub");
      // Для замены KFF отдаёт уходящего в player_*, выходящего — в player2_*.
      const mainId = await this.resolvePlayerId(
        teamId,
        isSub ? e.player2Number : e.playerNumber,
        isSub ? e.player2Name : e.playerName,
      );
      const outId = isSub
        ? await this.resolvePlayerId(teamId, e.playerNumber, e.playerName)
        : null;
      if (!mainId) {
        this.summary.warnings.push(
          `Событие ${e.minute}' ${e.eventType}: не нашли игрока ${isSub ? e.player2Name : e.playerName}`,
        );
        continue;
      }
      rows.push({
        match_id: matchRow.id,
        team_id: teamId,
        minute: e.minute,
        type: e.eventType,
        player_id: mainId,
        player_out_id: outId,
      });
    }
    if (!rows.length) return;
    this.summary.eventsInserted += rows.length;
    if (this.dryRun) return;
    await this.sb.from("match_events").delete().eq("match_id", matchRow.id);
    const { error } = await this.sb.from("match_events").insert(rows);
    if (error) throw new Error(`match_events insert: ${error.message}`);
  }

  async importGame(game) {
    const homeIsZhaiyq = game.home_team?.id === ZHAIYQ_KFF_TEAM_ID;
    const opponentKff = homeIsZhaiyq ? game.away_team : game.home_team;
    const isHome = homeIsZhaiyq;

    const opponent = await this.findOrCreateTeam(
      opponentKff?.name ?? "Соперник",
      opponentKff?.logo_url,
    );
    const matchRow = await this.upsertMatchRow(game, opponent, isHome, opponentKff?.logo_url);

    if (game.status !== "finished") {
      return { matchRow, scraped: null };
    }

    const scraped = await scrapeMatch(String(game.id));
    const zhaiyq = this.findTeam("Жайык");
    if (!zhaiyq) throw new Error("Команда «Жайык» не найдена в public.teams");

    const homeTeamId = homeIsZhaiyq ? zhaiyq.id : opponent.id;
    const awayTeamId = homeIsZhaiyq ? opponent.id : zhaiyq.id;

    if (scraped.lineups) {
      const homeRoster = [
        ...(scraped.lineups.home?.starters ?? []),
        ...(scraped.lineups.home?.substitutes ?? []),
      ];
      const awayRoster = [
        ...(scraped.lineups.away?.starters ?? []),
        ...(scraped.lineups.away?.substitutes ?? []),
      ];
      await this.syncPlayers(homeTeamId, homeRoster);
      await this.syncPlayers(awayTeamId, awayRoster);
      await this.writeLineups(matchRow, [
        { teamId: homeTeamId, lineup: scraped.lineups.home },
        { teamId: awayTeamId, lineup: scraped.lineups.away },
      ]);
    }

    await this.writeEvents(matchRow, scraped, homeTeamId, awayTeamId);

    const videoPatch = {};
    if (scraped.highlightUrl && matchRow.highlight_url !== scraped.highlightUrl) {
      videoPatch.highlight_url = scraped.highlightUrl;
    }
    if (scraped.fullMatchUrl && matchRow.full_match_url !== scraped.fullMatchUrl) {
      videoPatch.full_match_url = scraped.fullMatchUrl;
    }
    if (Object.keys(videoPatch).length && !this.dryRun) {
      const { error } = await this.sb
        .from("matches")
        .update(videoPatch)
        .eq("id", matchRow.id);
      if (error) throw new Error(`matches video update: ${error.message}`);
    }

    return { matchRow, scraped };
  }
}

/**
 * Приводит `players.position` к КАНОНИЧЕСКОЙ позиции игрока из ростера
 * команды (`/api/v1/teams/{id}/players`). Позиция из заявки на матч для
 * этого не годится: там тактическая роль конкретной игры, из-за чего у
 * одного и того же футболиста она меняется от матча к матчу и схема на
 * поле получается вида «2-6-2» вместо 4-4-2.
 */
async function syncCanonicalPositions(supabase, seasonId, games, { dryRun }) {
  const { mapPosition } = require("./kffScraper.js");
  const kffTeams = new Map();
  for (const g of games) {
    for (const t of [g.home_team, g.away_team]) {
      if (t?.id && !kffTeams.has(t.id)) kffTeams.set(t.id, t.name);
    }
  }

  const { data: dbTeams, error } = await supabase.from("teams").select("*");
  if (error) throw new Error(`teams select: ${error.message}`);

  let updated = 0;
  const notFound = [];

  for (const [kffId, kffName] of kffTeams) {
    const target = normalizeLabel(kffName);
    const dbTeam = (dbTeams ?? []).find((t) => {
      const c = normalizeLabel(t.name ?? "");
      return c && (c.includes(target) || target.includes(c));
    });
    if (!dbTeam) {
      notFound.push(kffName);
      continue;
    }

    const res = await axios.get(
      `${API_BASE}/teams/${kffId}/players?season_id=${seasonId}&lang=ru`,
      { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, timeout: 20000 },
    );
    const roster = res.data.items ?? [];
    const { data: dbPlayers } = await supabase
      .from("players")
      .select("*")
      .eq("team_id", dbTeam.id);

    for (const kp of roster) {
      const pos = mapPosition(kp.position, kp.position_code);
      if (!pos) continue;
      const surname = normalizeLabel(kp.last_name || "");
      const row = (dbPlayers ?? []).find(
        (r) =>
          r.number != null &&
          kp.number != null &&
          Number(r.number) === Number(kp.number) &&
          surname &&
          normalizeLabel(r.name ?? "").includes(surname),
      );
      if (!row || row.position === pos) continue;
      if (!dryRun) {
        const { error: uErr } = await supabase
          .from("players")
          .update({ position: pos })
          .eq("id", row.id);
        if (uErr) throw new Error(`players position update: ${uErr.message}`);
      }
      updated += 1;
    }
    await sleep(REQUEST_DELAY_MS);
  }

  return { updated, notFound };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const positionsOnly = args.includes("--positions");
  const onlyIdx = args.indexOf("--only");
  const onlyId = onlyIdx !== -1 ? args[onlyIdx + 1] : null;
  // Турниры на KFF — это разные «сезоны»: 204 — Первая лига, 202 — Кубок.
  const seasonIdx = args.indexOf("--season");
  const seasonArg = seasonIdx !== -1 ? Number(args[seasonIdx + 1]) : null;
  // Подпись турнира в `matches.competition` для новых строк.
  const compIdx = args.indexOf("--competition");
  const competition = compIdx !== -1 ? args[compIdx + 1] : null;

  const supabase = createSupabaseAdmin();

  if (positionsOnly) {
    const { seasonId, games } = await fetchSeasonGames(ZHAIYQ_KFF_TEAM_ID, seasonArg);
    const r = await syncCanonicalPositions(supabase, seasonId, games, { dryRun });
    console.error(
      `${dryRun ? "[DRY-RUN] " : ""}Позиции обновлены у ${r.updated} игрок(ов).` +
        (r.notFound.length ? ` Не найдены в БД команды: ${r.notFound.join(", ")}` : ""),
    );
    return;
  }

  const importer = new Importer(supabase, { dryRun, competition });
  await importer.loadState();

  const { seasonId, games } = await fetchSeasonGames(ZHAIYQ_KFF_TEAM_ID, seasonArg);
  const targets = onlyId ? games.filter((g) => String(g.id) === onlyId) : games;

  console.error(
    `${dryRun ? "[DRY-RUN] " : ""}Сезон ${seasonId}: ${targets.length} матч(ей) к обработке.`,
  );

  for (const game of targets) {
    const label = `${game.date} ${game.home_team?.name} ${game.home_score ?? "-"}:${game.away_score ?? "-"} ${game.away_team?.name}`;
    try {
      await importer.importGame(game);
      console.error(`  ✓ ${label}`);
    } catch (e) {
      console.error(`  ✗ ${label} — ${e.message}`);
      importer.summary.warnings.push(`${label}: ${e.message}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  console.error("\n=== ИТОГ ===");
  console.error(JSON.stringify(importer.summary, null, 2));
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[importSeason] ошибка:", err.message);
    process.exitCode = 1;
  });
}

module.exports = { Importer, fetchSeasonGames };
