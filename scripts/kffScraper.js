#!/usr/bin/env node
/**
 * Парсер + импортёр страницы матча kffleague.kz.
 *
 * Использование:
 *   node scripts/kffScraper.js <matchId | matchUrl> [--out путь.json] [--import]
 *
 * Примеры:
 *   node scripts/kffScraper.js 1274
 *   node scripts/kffScraper.js https://kffleague.kz/ru/matches/1274 --out match-1274.json
 *   node scripts/kffScraper.js 1274 --import
 *
 * Как это работает:
 * kffleague.kz — Next.js App Router сайт: страница матча рендерится на
 * сервере, и почти все данные (детали матча, ссылки на видео, составы,
 * фото игроков) уже присутствуют в HTML первого ответа — внутри
 * RSC-пейлоада, который стример Next.js пишет как
 * `self.__next_f.push([1, "<json>"])`. Поэтому headless-браузер
 * (puppeteer) не нужен для этих данных: простого GET-запроса (axios)
 * достаточно. cheerio используется для выборки самих `<script>`-тегов —
 * дальше строка внутри тега уже содержит валидный (экранированный) JSON,
 * который просто нужно вычленить и распарсить.
 *
 * Исключение — вкладка "Статистика" (владение мячом, удары и т.д.):
 * даже когда `detail.has_stats === true`, сама страница матча не
 * встраивает эти числа в серверный HTML (проверено на матче 1274 —
 * ни блока `matches:<id>:ru:stat*`, ни слова "possession"/"владение" в
 * ответе нет). Похоже, вкладка догружает статистику отдельным клиентским
 * запросом. `parseMatchStats()` ищет такой блок на случай, если для
 * каких-то матчей/лиг сайт всё же отдаёт его сразу, но если данных нет —
 * функция честно возвращает `null`, а не выдумывает числа.
 *
 * --import пишет результат в Supabase (нужны переменные окружения
 * NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY — service-role,
 * не anon, т.к. запись в players/teams/matches требует обхода RLS):
 *   - находит/создаёт `teams` для обеих команд по названию;
 *   - для соперника (не «Жайык») — ВСТАВЛЯЕТ недостающих игроков в
 *     `players` с их team_id, именем, номером, позицией и фото;
 *   - для существующей команды (например, «Жайык») — только ОБНОВЛЯЕТ
 *     позицию/фото уже существующих игроков, совпавших по номеру и
 *     фамилии (никогда не создаёт новых и не переименовывает чужих
 *     игроков просто из-за совпадения номера формы);
 *   - находит нужную строку `matches` по дате + сопернику и проставляет
 *     highlight_url/full_match_url/home_team_id/away_team_id;
 *   - если статистика матча найдена — пишет её в `match_stats`; если нет
 *     (как для матча 1274) — оставляет как есть и предупреждает в логе.
 *
 * Уважайте сайт: скрипт делает один GET-запрос на матч, без параллелизма
 * и повторов. Перед регулярным/массовым использованием проверьте
 * https://kffleague.kz/robots.txt и условия использования сайта.
 */

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const USER_AGENT =
  "Mozilla/5.0 (compatible; ZhaiyqAppMatchScraper/1.0; +https://kffleague.kz/ru/matches)";

/** Принимает и голый ID ("1274"), и полный URL страницы матча. */
function resolveMatchUrl(input) {
  const trimmed = String(input || "").trim();
  if (!trimmed) {
    throw new Error("Укажите ID матча или ссылку на страницу матча kffleague.kz");
  }
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`Некорректный ID матча: "${trimmed}"`);
  }
  return `https://kffleague.kz/ru/matches/${trimmed}`;
}

function matchIdFromUrl(url) {
  const m = url.match(/\/matches\/(\d+)/);
  if (!m) throw new Error(`Не удалось определить ID матча из URL: ${url}`);
  return m[1];
}

/**
 * Все инлайн `<script>` без src — именно там Next.js складывает
 * `self.__next_f.push(...)` со стриминговым RSC-пейлоадом.
 */
function collectInlineScripts(html) {
  const $ = cheerio.load(html);
  const chunks = [];
  $("script:not([src])").each((_, el) => {
    const text = $(el).contents().text();
    if (text && text.includes("self.__next_f.push")) {
      chunks.push(text);
    }
  });
  return { $, combined: chunks.join("\n") };
}

/**
 * Ищет `\"<key>\":{...}` внутри объединённого текста RSC-скриптов и
 * вырезает сбалансированный по фигурным скобкам JSON-объект, затем
 * снимает экранирование кавычек (`\"` -> `"`) и парсит его.
 * Простой, но надёжный способ вытащить конкретный именованный узел
 * пейлоада, не реализуя полностью протокол RSC-стриминга.
 */
function extractEscapedJsonObject(source, key) {
  const marker = `\\"${key}\\":{`;
  const markerIdx = source.indexOf(marker);
  if (markerIdx === -1) return null;

  const start = markerIdx + marker.length - 1; // позиция открывающей `{`
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        const raw = source.slice(start, i + 1);
        const unescaped = raw.replace(/\\"/g, '"');
        return JSON.parse(unescaped);
      }
    }
  }
  return null;
}

/** Все ключи вида `matches:<id>:ru:<key>`, встреченные в RSC-пейлоаде. */
function findRscKeysForMatch(combined, matchId) {
  const re = new RegExp(`matches:${matchId}:ru:([a-z_]+)`, "g");
  const keys = new Set();
  let m;
  while ((m = re.exec(combined))) keys.add(m[1]);
  return [...keys];
}

function normalizePhotoUrl(raw) {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "$undefined") return null;
  return trimmed;
}

/**
 * Жёсткий маппинг позиций под коды нашей БД.
 * Реальный формат, который отдаёт страница матча — английские коды
 * (`position: "GK"/"DEF"/"MID"/"FWD"`, `amplua: "Gk"/"D"/"M"/"F"`), а не
 * русский текст — поэтому мапим оба варианта, плюс русские слова на
 * случай, если для другого раздела сайта формат ответа отличается.
 */
const POSITION_MAP = {
  вратарь: "вр",
  защитник: "зщ",
  полузащитник: "пз",
  нападающий: "нп",
  gk: "вр",
  def: "зщ",
  mid: "пз",
  fwd: "нп",
  g: "вр",
  d: "зщ",
  m: "пз",
  f: "нп",
};

function mapPosition(rawPosition, amplua) {
  const tryValue = (v) => {
    if (!v) return null;
    return POSITION_MAP[String(v).trim().toLowerCase()] ?? null;
  };
  return tryValue(rawPosition) ?? tryValue(amplua) ?? null;
}

function normalizePlayer(p) {
  return {
    playerId: p.player_id,
    firstName: p.first_name ?? null,
    lastName: p.last_name ?? null,
    number: p.number ?? null,
    position: p.position ?? null,
    positionCode: mapPosition(p.position, p.amplua),
    amplua: p.amplua ?? null,
    fieldPosition: p.field_position ?? null,
    isCaptain: Boolean(p.is_captain),
    photoUrl: normalizePhotoUrl(p.photo_url),
    countryCode: p.country?.code ?? null,
  };
}

function normalizeTeamLineup(team) {
  if (!team) return null;
  return {
    teamId: team.team_id,
    teamName: team.team_name,
    formation: team.formation ?? null,
    kitColor: team.kit_color ?? null,
    coachName: team.coach_name ?? null,
    starters: (team.starters ?? []).map(normalizePlayer),
    substitutes: (team.substitutes ?? []).map(normalizePlayer),
  };
}

function normalizeMatchStatsSide(side) {
  if (!side || typeof side !== "object") return null;
  const pick = (...names) => {
    for (const n of names) {
      if (side[n] != null) return side[n];
    }
    return null;
  };
  return {
    possession: pick("possession", "possession_pct", "ball_possession"),
    shots: pick("shots", "total_shots", "shots_total"),
    shotsOnTarget: pick("shots_on_target", "on_target_shots"),
    corners: pick("corners", "corner_kicks"),
    offsides: pick("offsides"),
    saves: pick("saves", "goalkeeper_saves"),
    yellowCards: pick("yellow_cards", "yellows"),
  };
}

/**
 * Пытается найти блок статистики матча в RSC-пейлоаде. Возвращает `null`,
 * если такого блока нет — см. пояснение о вкладке "Статистика" в шапке
 * файла. Никогда не подставляет мок-данные вместо реальных чисел.
 */
function parseMatchStats(combined, matchId) {
  const statKeys = findRscKeysForMatch(combined, matchId).filter((k) =>
    /stat/i.test(k),
  );
  for (const key of statKeys) {
    const raw = extractEscapedJsonObject(combined, `matches:${matchId}:ru:${key}`);
    if (!raw) continue;
    const home = raw.home_team ?? raw.home ?? null;
    const away = raw.away_team ?? raw.away ?? null;
    if (home || away) {
      return { home: normalizeMatchStatsSide(home), away: normalizeMatchStatsSide(away) };
    }
  }
  return null;
}

/**
 * События матча (голы/карточки/замены) — в отличие от статистики, этот
 * блок реально встроен в HTML (`matches:<id>:ru:events`). Для замены
 * KFF отдаёт `player_id/player_name` как игрока, УХОДЯЩЕГО с поля, и
 * `player2_id/player2_name` — как выходящего НА поле (проверено на
 * матче 1274: `player2_name` в этих событиях совпадает с игроком,
 * реально появившимся на замену по протоколу).
 */
function parseMatchEvents(combined, matchId) {
  const raw = extractEscapedJsonObject(combined, `matches:${matchId}:ru:events`);
  if (!raw?.events) return [];
  return raw.events.map((e) => ({
    kffEventId: e.id,
    half: e.half ?? null,
    minute: e.minute,
    eventType: (e.event_type ?? "").toLowerCase(),
    teamKffId: e.team_id,
    teamName: e.team_name ?? null,
    // Обычные события (гол/карточка): единственный участник.
    // Замена: playerNumber/playerName — кто ушёл, player2Number/player2Name — кто вышел.
    playerNumber: typeof e.player_number === "number" ? e.player_number : null,
    playerName: e.player_name || null,
    player2Number: typeof e.player2_number === "number" ? e.player2_number : null,
    player2Name: e.player2_name || null,
    videoUrl: e.video_url || null,
  }));
}

/**
 * Скачивает и парсит страницу одного матча.
 * @param {string} matchIdOrUrl ID матча ("1274") или полный URL страницы.
 */
async function scrapeMatch(matchIdOrUrl) {
  const url = resolveMatchUrl(matchIdOrUrl);
  const matchId = matchIdFromUrl(url);

  const res = await axios.get(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "ru-RU,ru;q=0.9",
    },
    timeout: 20000,
  });

  const { $, combined } = collectInlineScripts(res.data);

  const detail = extractEscapedJsonObject(combined, `matches:${matchId}:ru:detail`);
  const lineupPayload = extractEscapedJsonObject(combined, `matches:${matchId}:ru:lineup`);

  if (!detail) {
    throw new Error(
      `Не нашли блок matches:${matchId}:ru:detail в HTML — возможно, разметка сайта изменилась.`,
    );
  }

  const lineups = lineupPayload?.lineups ?? null;
  const stats = parseMatchStats(combined, matchId);
  const events = parseMatchEvents(combined, matchId);

  return {
    matchId: Number(matchId),
    sourceUrl: url,
    scrapedAt: new Date().toISOString(),
    pageTitle: $("title").first().text().trim() || null,
    date: detail.date ?? null,
    time: detail.time ?? null,
    status: detail.status ?? null,
    hasStatsOnSite: detail.has_stats ?? null,
    homeTeam: detail.home_team
      ? {
          id: detail.home_team.id,
          name: detail.home_team.name,
          logoUrl: detail.home_team.logo_url ?? null,
          score: detail.home_team.score ?? null,
        }
      : null,
    awayTeam: detail.away_team
      ? {
          id: detail.away_team.id,
          name: detail.away_team.name,
          logoUrl: detail.away_team.logo_url ?? null,
          score: detail.away_team.score ?? null,
        }
      : null,
    stadium: detail.stadium ?? null,
    referee: detail.referee ?? null,
    // Видеообзор (highlight) и полная трансляция (full match) — то, что
    // нужно для колонок matches.highlight_url / matches.full_match_url.
    highlightUrl: detail.video_review_url || null,
    fullMatchUrl: detail.youtube_live_url || null,
    protocolPdfUrl: detail.protocol_url || null,
    // Владение/удары/угловые и т.д. — null, если сайт не отдал их в HTML
    // для этого матча (см. пояснение в шапке файла).
    stats,
    // Голы/карточки/замены с минутами — реально есть в HTML почти всегда.
    events,
    lineups: lineups
      ? {
          home: normalizeTeamLineup(lineups.home_team),
          away: normalizeTeamLineup(lineups.away_team),
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Импорт в Supabase (--import)
// ---------------------------------------------------------------------------

function normalizeTeamLabel(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-zа-яёіғқңөұүh0-9]+/gi, "");
}

function isZhaiyqName(name) {
  const s = normalizeTeamLabel(name);
  return s.includes("жайык") || s.includes("zhaiyq") || s.includes("jaiyq");
}

function createSupabaseAdmin() {
  // eslint-disable-next-line global-require -- ленивая загрузка только для --import
  const { createClient } = require("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Для --import нужны переменные окружения NEXT_PUBLIC_SUPABASE_URL и " +
        "SUPABASE_SERVICE_ROLE_KEY (service-role ключ, не anon — запись в " +
        "players/teams/matches требует обхода RLS).",
    );
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function findOrCreateTeam(supabase, teamName, logoUrl) {
  const { data: teams, error } = await supabase.from("teams").select("*");
  if (error) throw new Error(`teams select: ${error.message}`);

  const target = normalizeTeamLabel(teamName);
  const found = (teams ?? []).find((t) => {
    const cand = normalizeTeamLabel(t.name ?? "");
    return cand && (cand.includes(target) || target.includes(cand));
  });
  if (found) return { id: found.id, created: false };

  const { data: created, error: insErr } = await supabase
    .from("teams")
    .insert({ name: teamName, logo_url: logoUrl ?? null })
    .select("id")
    .single();
  if (insErr) throw new Error(`teams insert "${teamName}": ${insErr.message}`);
  return { id: created.id, created: true };
}

/** Соответствует существующей конвенции БД для игроков: «ФАМИЛИЯ Имя». */
function dbNameForPlayer(firstName, lastName) {
  return [lastName, firstName].filter(Boolean).join(" ").trim().toUpperCase();
}

/**
 * Пишет игроков одной команды. Для новой/чужой команды — вставляет
 * недостающих. Для команды, которая уже ведётся вручную (сейчас это
 * «Жайык»), только обновляет позицию/фото у игроков, надёжно совпавших
 * по номеру формы И фамилии — никогда не создаёт дубликаты и не
 * переписывает данные чужого игрока только из-за совпадения номера.
 */
async function upsertPlayersForTeam(supabase, teamId, players, { allowInsert }) {
  const { data: existing, error } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", teamId);
  if (error) throw new Error(`players select (team ${teamId}): ${error.message}`);

  const stats = { updated: 0, inserted: 0, skipped: 0 };

  for (const p of players) {
    const positionCode = p.positionCode;
    const photoUrl = p.photoUrl;
    const surnameNorm = normalizeTeamLabel(p.lastName || "");

    const match = (existing ?? []).find((row) => {
      if (row.number == null || p.number == null) return false;
      if (Number(row.number) !== Number(p.number)) return false;
      const rowName = normalizeTeamLabel(row.name ?? "");
      return Boolean(surnameNorm) && rowName.includes(surnameNorm);
    });

    if (match) {
      const patch = {};
      if (positionCode && match.position !== positionCode) patch.position = positionCode;
      if (photoUrl && !match.photo_url) patch.photo_url = photoUrl;
      if (Object.keys(patch).length) {
        const { error: updErr } = await supabase.from("players").update(patch).eq("id", match.id);
        if (updErr) throw new Error(`players update ${match.id}: ${updErr.message}`);
        stats.updated += 1;
      }
      continue;
    }

    if (!allowInsert) {
      stats.skipped += 1;
      continue;
    }

    const { error: insErr } = await supabase.from("players").insert({
      team_id: teamId,
      name: dbNameForPlayer(p.firstName, p.lastName),
      number: p.number ?? null,
      position: positionCode,
      photo_url: photoUrl ?? null,
    });
    if (insErr) {
      throw new Error(`players insert "${dbNameForPlayer(p.firstName, p.lastName)}": ${insErr.message}`);
    }
    stats.inserted += 1;
  }

  return stats;
}

/**
 * `public.match_stats` — ОДНА строка на матч с колонками `home_*`/`away_*`
 * (проверено через реальную схему, не через миграцию/типы в приложении —
 * они этому расходятся: там ошибочно предполагалась строка на команду).
 */
function mapStatsRowForDb(matchId, home, away) {
  const pick = (side, key) => (side ? (side[key] ?? null) : null);
  return {
    match_id: matchId,
    home_possession: pick(home, "possession"),
    away_possession: pick(away, "possession"),
    home_shots: pick(home, "shots"),
    away_shots: pick(away, "shots"),
    home_shots_on_target: pick(home, "shotsOnTarget"),
    away_shots_on_target: pick(away, "shotsOnTarget"),
    home_corners: pick(home, "corners"),
    away_corners: pick(away, "corners"),
    home_offsides: pick(home, "offsides"),
    away_offsides: pick(away, "offsides"),
    home_saves: pick(home, "saves"),
    away_saves: pick(away, "saves"),
    home_yellow_cards: pick(home, "yellowCards"),
    away_yellow_cards: pick(away, "yellowCards"),
  };
}

/** Находит строку `matches` по дате + сопернику (без ручного matchId). */
async function findMatchRow(supabase, scraped) {
  const { data: matches, error } = await supabase.from("matches").select("*");
  if (error) throw new Error(`matches select: ${error.message}`);

  const homeIsZhaiyq = isZhaiyqName(scraped.homeTeam?.name);
  const opponentName = homeIsZhaiyq ? scraped.awayTeam?.name : scraped.homeTeam?.name;
  const targetDate = scraped.date;
  const scrapedOppNorm = normalizeTeamLabel(opponentName || "");

  return (
    (matches ?? []).find((m) => {
      if (!targetDate || !m.match_date) return false;
      if (String(m.match_date).slice(0, 10) !== targetDate) return false;
      if (Boolean(m.is_home) !== homeIsZhaiyq) return false;
      const oppNorm = normalizeTeamLabel(m.opponent || "");
      return Boolean(oppNorm) && (oppNorm.includes(scrapedOppNorm) || scrapedOppNorm.includes(oppNorm));
    }) ?? null
  );
}

/**
 * Импортирует результат `scrapeMatch()` в Supabase: команды, игроков,
 * ссылки на видео и (если найдена) статистику матча.
 */
/**
 * Пишет голы/карточки/замены в `public.match_events`
 * (id, match_id, team_id, minute, type, player_id, player_out_id —
 * реальная схема, без `description`/`video_url`/`half`). Игроков находит
 * по номеру формы внутри уже известной команды; событие с нерешённым
 * игроком просто пропускается (никогда не пишем угаданную привязку).
 * Не импортирует повторно, если у матча уже есть события.
 */
async function importMatchEvents(supabase, matchId, scraped, homeTeamId, awayTeamId) {
  const { count, error: countErr } = await supabase
    .from("match_events")
    .select("id", { count: "exact", head: true })
    .eq("match_id", matchId);
  if (countErr) return { inserted: 0, skipped: 0, error: countErr.message };
  if (count && count > 0) {
    return { inserted: 0, skipped: scraped.events.length, note: "У матча уже есть события — пропущено." };
  }

  const [{ data: homePlayers }, { data: awayPlayers }] = await Promise.all([
    supabase.from("players").select("id, number").eq("team_id", homeTeamId),
    supabase.from("players").select("id, number").eq("team_id", awayTeamId),
  ]);
  const numberToId = (rows) => {
    const map = new Map();
    for (const r of rows ?? []) if (r.number != null) map.set(Number(r.number), r.id);
    return map;
  };
  const homeMap = numberToId(homePlayers);
  const awayMap = numberToId(awayPlayers);

  const rows = [];
  let skipped = 0;
  for (const e of scraped.events) {
    const teamId =
      e.teamKffId === scraped.homeTeam?.id
        ? homeTeamId
        : e.teamKffId === scraped.awayTeam?.id
          ? awayTeamId
          : null;
    if (!teamId) {
      skipped += 1;
      continue;
    }
    const roster = teamId === homeTeamId ? homeMap : awayMap;
    const isSub = e.eventType.includes("sub");

    const mainNumber = isSub ? e.player2Number : e.playerNumber;
    const outNumber = isSub ? e.playerNumber : null;
    const playerId = mainNumber != null ? roster.get(mainNumber) : null;
    const playerOutId = outNumber != null ? roster.get(outNumber) : null;

    if (!playerId) {
      skipped += 1;
      continue;
    }
    rows.push({
      match_id: matchId,
      team_id: teamId,
      minute: e.minute,
      type: e.eventType,
      player_id: playerId,
      player_out_id: playerOutId ?? null,
    });
  }

  if (!rows.length) return { inserted: 0, skipped };
  const { error: insErr } = await supabase.from("match_events").insert(rows);
  if (insErr) return { inserted: 0, skipped, error: insErr.message };
  return { inserted: rows.length, skipped };
}

async function importMatchToSupabase(scraped) {
  if (!scraped.lineups) {
    throw new Error("В скрапе нет составов (lineups) — импортировать нечего.");
  }
  if (!scraped.homeTeam || !scraped.awayTeam) {
    throw new Error("В скрапе нет данных о командах (homeTeam/awayTeam).");
  }

  const supabase = createSupabaseAdmin();
  const summary = { teams: {}, players: {}, match: null, stats: null, warnings: [] };

  const matchRow = await findMatchRow(supabase, scraped);
  if (!matchRow) {
    throw new Error(
      "Не нашли соответствующую строку в public.matches (сопоставление по дате и сопернику). " +
        "Создайте её вручную перед импортом.",
    );
  }

  const homeTeamInfo = await findOrCreateTeam(
    supabase,
    scraped.homeTeam.name,
    scraped.homeTeam.logoUrl,
  );
  const awayTeamInfo = await findOrCreateTeam(
    supabase,
    scraped.awayTeam.name,
    scraped.awayTeam.logoUrl,
  );
  summary.teams = {
    home: { name: scraped.homeTeam.name, id: homeTeamInfo.id, created: homeTeamInfo.created },
    away: { name: scraped.awayTeam.name, id: awayTeamInfo.id, created: awayTeamInfo.created },
  };

  const homeRoster = [
    ...(scraped.lineups.home?.starters ?? []),
    ...(scraped.lineups.home?.substitutes ?? []),
  ];
  const awayRoster = [
    ...(scraped.lineups.away?.starters ?? []),
    ...(scraped.lineups.away?.substitutes ?? []),
  ];

  summary.players.home = await upsertPlayersForTeam(supabase, homeTeamInfo.id, homeRoster, {
    allowInsert: !isZhaiyqName(scraped.homeTeam.name),
  });
  summary.players.away = await upsertPlayersForTeam(supabase, awayTeamInfo.id, awayRoster, {
    allowInsert: !isZhaiyqName(scraped.awayTeam.name),
  });

  const baseMatchPatch = {
    highlight_url: scraped.highlightUrl ?? null,
    full_match_url: scraped.fullMatchUrl ?? null,
  };
  const patchWithTeamIds = {
    ...baseMatchPatch,
    home_team_id: homeTeamInfo.id,
    away_team_id: awayTeamInfo.id,
  };

  let { error: updateErr } = await supabase
    .from("matches")
    .update(patchWithTeamIds)
    .eq("id", matchRow.id);
  if (updateErr) {
    summary.warnings.push(
      `Не удалось записать home_team_id/away_team_id (${updateErr.message}). ` +
        "Применена ли миграция 20260427120000_players_rls_match_team_ids.sql? " +
        "Записал только highlight_url/full_match_url.",
    );
    ({ error: updateErr } = await supabase.from("matches").update(baseMatchPatch).eq("id", matchRow.id));
    if (updateErr) throw new Error(`matches update: ${updateErr.message}`);
  }
  summary.match = { id: matchRow.id, opponent: matchRow.opponent, isHome: matchRow.is_home };

  if (scraped.stats && (scraped.stats.home || scraped.stats.away)) {
    const row = mapStatsRowForDb(matchRow.id, scraped.stats.home, scraped.stats.away);
    const { error: statsErr } = await supabase.from("match_stats").insert(row);
    if (statsErr) summary.warnings.push(`match_stats insert: ${statsErr.message}`);
    else summary.stats = { inserted: 1 };
  } else {
    summary.warnings.push(
      "Статистика матча (владение/удары/угловые) не найдена на странице KFF для " +
        "этого матча — match_stats не заполнен. Реальных чисел на сайте нет, мок не пишем.",
    );
  }

  if (scraped.events?.length) {
    summary.events = await importMatchEvents(
      supabase,
      matchRow.id,
      scraped,
      homeTeamInfo.id,
      awayTeamInfo.id,
    );
  } else {
    summary.events = { inserted: 0, skipped: 0 };
  }

  return summary;
}

async function main() {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf("--out");
  const outPath = outIdx !== -1 ? args[outIdx + 1] : null;
  const doImport = args.includes("--import");
  const skipIndexes = new Set([outIdx, outIdx === -1 ? -1 : outIdx + 1]);
  const matchArg = args.filter((a, i) => !skipIndexes.has(i) && a !== "--import")[0];

  if (!matchArg) {
    console.error(
      "Использование: node scripts/kffScraper.js <matchId | matchUrl> [--out файл.json] [--import]",
    );
    process.exitCode = 1;
    return;
  }

  const data = await scrapeMatch(matchArg);
  const json = JSON.stringify(data, null, 2);

  if (outPath) {
    const resolved = path.resolve(process.cwd(), outPath);
    fs.writeFileSync(resolved, json, "utf8");
    console.error(`Сохранено: ${resolved}`);
  } else {
    console.log(json);
  }

  if (doImport) {
    console.error("\n[kffScraper] Импортирую в Supabase...");
    const summary = await importMatchToSupabase(data);
    console.error(JSON.stringify(summary, null, 2));
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[kffScraper] ошибка:", err.message);
    process.exitCode = 1;
  });
}

module.exports = {
  scrapeMatch,
  resolveMatchUrl,
  matchIdFromUrl,
  mapPosition,
  parseMatchStats,
  parseMatchEvents,
  importMatchToSupabase,
};
