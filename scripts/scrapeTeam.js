#!/usr/bin/env node
/**
 * Парсер физических данных и статистики игроков команды kffleague.kz.
 *
 * Использование:
 *   node scripts/scrapeTeam.js [--team 633] [--season 204] [--import]
 *
 * Примеры:
 *   node scripts/scrapeTeam.js                  # предпросмотр (JSON в stdout)
 *   node scripts/scrapeTeam.js --import         # + запись в Supabase
 *
 * Как это работает:
 * Страница https://kffleague.kz/ru/team/633?tab=squad не встраивает состав
 * в серверный HTML — вкладка «Состав» догружает данные клиентским JS через
 * реальный REST API сайта. Он был обнаружен через Network-инспекцию
 * реальной страницы в браузере (сработавшие запросы), а не угадан:
 *
 *   GET /api/v1/teams/{teamId}/seasons/default        -> { season_id }
 *   GET /api/v1/teams/{teamId}/players?season_id=...  -> [{ id, first_name,
 *       last_name, birthday, number, position, photo_url... }]
 *   GET /api/v1/players/{id}?lang=ru                  -> { height, weight, ... }
 *   GET /api/v1/players/{id}/stats?season_id=...      -> { games_played,
 *       time_on_field_total, goal, ... }
 *
 * Рост/вес заполнены на сайте не у всех игроков (реальные `null`, не баг
 * скрипта) — такие поля просто не обновляются в БД, мок не подставляем.
 *
 * --import пишет в Supabase (нужны NEXT_PUBLIC_SUPABASE_URL и
 * SUPABASE_SERVICE_ROLE_KEY в окружении — как и в kffScraper.js). Скрипт
 * только ОБНОВЛЯЕТ уже существующих игроков команды в `players`, найденных
 * по номеру формы + фамилии (никогда не создаёт новых и не трогает игроков,
 * не совпавших с уверенностью).
 *
 * Уважайте сайт: между запросами по игрокам скрипт делает небольшую паузу
 * (см. REQUEST_DELAY_MS) — не убирайте её при массовом использовании.
 */

const axios = require("axios");

const { mapPosition } = require("./kffScraper.js");

const API_BASE = "https://kffleague.kz/api/v1";
const USER_AGENT =
  "Mozilla/5.0 (compatible; ZhaiyqAppMatchScraper/1.0; +https://kffleague.kz/ru/matches)";
const REQUEST_DELAY_MS = 150;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiGet(path) {
  const res = await axios.get(`${API_BASE}${path}`, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      "Accept-Language": "ru-RU,ru;q=0.9",
    },
    timeout: 20000,
  });
  return res.data;
}

async function resolveDefaultSeasonId(teamId) {
  const data = await apiGet(`/teams/${teamId}/seasons/default`);
  return data.season_id;
}

async function fetchTeamPlayers(teamId, seasonId) {
  const data = await apiGet(`/teams/${teamId}/players?season_id=${seasonId}&lang=ru`);
  return data.items ?? [];
}

async function fetchPlayerDetail(playerId) {
  return apiGet(`/players/${playerId}?lang=ru`);
}

async function fetchPlayerSeasonStats(playerId, seasonId) {
  return apiGet(`/players/${playerId}/stats?season_id=${seasonId}&lang=ru`);
}

/**
 * Полная карточка одного игрока: список команды + детали + статистика сезона.
 */
async function scrapePlayer(listItem, seasonId) {
  const [detailRaw, statsRaw] = await Promise.all([
    fetchPlayerDetail(listItem.id),
    fetchPlayerSeasonStats(listItem.id, seasonId),
  ]);
  // Игрок без статистики за сезон (0 матчей) иногда отдаётся как `null`,
  // а не объект с нулевыми полями.
  const detail = detailRaw ?? {};
  const stats = statsRaw ?? {};
  return {
    kffId: listItem.id,
    firstName: listItem.first_name ?? null,
    lastName: listItem.last_name ?? null,
    number: listItem.number ?? null,
    positionCode: mapPosition(listItem.position, detail.position_code),
    birthDate: listItem.birthday ?? detail.birthday ?? null,
    heightCm: detail.height ?? null,
    weightKg: detail.weight ?? null,
    goals: stats.goal ?? null,
    matchesPlayed: stats.games_played ?? null,
    minutesPlayed: stats.time_on_field_total ?? null,
  };
}

/**
 * Парсит всю команду: список игроков + детали/статистика каждого
 * (с паузой между запросами — см. REQUEST_DELAY_MS).
 */
async function scrapeTeam(teamId, seasonIdArg) {
  const seasonId = seasonIdArg ?? (await resolveDefaultSeasonId(teamId));
  const list = await fetchTeamPlayers(teamId, seasonId);

  const players = [];
  for (const item of list) {
    players.push(await scrapePlayer(item, seasonId));
    // eslint-disable-next-line no-await-in-loop -- намеренно последовательно, из уважения к сайту
    await sleep(REQUEST_DELAY_MS);
  }

  return { teamId, seasonId, players };
}

// ---------------------------------------------------------------------------
// Импорт в Supabase (--import)
// ---------------------------------------------------------------------------

function normalizeLabel(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-zа-яёіғқңөұүh0-9]+/gi, "");
}

function isZhaiyqName(name) {
  const s = normalizeLabel(name);
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
        "SUPABASE_SERVICE_ROLE_KEY (service-role ключ, не anon).",
    );
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function findTeamIdByName(supabase, teamName) {
  const { data: teams, error } = await supabase.from("teams").select("*");
  if (error) throw new Error(`teams select: ${error.message}`);
  const target = normalizeLabel(teamName);
  const found = (teams ?? []).find((t) => {
    const cand = normalizeLabel(t.name ?? "");
    return cand && (cand.includes(target) || target.includes(cand));
  });
  return found?.id ?? null;
}

/**
 * Обновляет физ. данные/статистику уже существующих игроков команды.
 * Матчинг — по номеру формы + фамилии (как в kffScraper.js): при
 * расхождении просто пропускаем игрока, никогда не создаём дубликаты.
 */
async function importTeamToSupabase(scraped, dbTeamName) {
  const supabase = createSupabaseAdmin();
  const teamId = await findTeamIdByName(supabase, dbTeamName);
  if (!teamId) {
    throw new Error(`Команда "${dbTeamName}" не найдена в public.teams`);
  }

  const { data: existing, error } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", teamId);
  if (error) throw new Error(`players select: ${error.message}`);

  const summary = { updated: 0, skippedNoMatch: 0, skippedNoNewData: 0 };

  for (const p of scraped.players) {
    const surnameNorm = normalizeLabel(p.lastName || "");
    const match = (existing ?? []).find((row) => {
      if (row.number == null || p.number == null) return false;
      if (Number(row.number) !== Number(p.number)) return false;
      const rowName = normalizeLabel(row.name ?? "");
      return Boolean(surnameNorm) && rowName.includes(surnameNorm);
    });

    if (!match) {
      summary.skippedNoMatch += 1;
      continue;
    }

    const patch = {};
    if (p.heightCm != null && match.height == null) patch.height = p.heightCm;
    if (p.weightKg != null && match.weight == null) patch.weight = p.weightKg;
    if (p.birthDate && !match.birth_date) patch.birth_date = p.birthDate;
    if (p.goals != null) patch.goals = p.goals;
    if (p.matchesPlayed != null) patch.matches_played = p.matchesPlayed;
    if (p.minutesPlayed != null) patch.minutes_played = p.minutesPlayed;
    if (p.positionCode && match.position !== p.positionCode) patch.position = p.positionCode;

    if (Object.keys(patch).length === 0) {
      summary.skippedNoNewData += 1;
      continue;
    }

    const { error: updErr } = await supabase.from("players").update(patch).eq("id", match.id);
    if (updErr) throw new Error(`players update ${match.id}: ${updErr.message}`);
    summary.updated += 1;
  }

  return summary;
}

async function main() {
  const args = process.argv.slice(2);
  const getFlag = (name, fallback) => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
  };
  const teamId = Number(getFlag("team", "633"));
  const seasonArg = getFlag("season", null);
  const seasonId = seasonArg ? Number(seasonArg) : null;
  const doImport = args.includes("--import");

  const scraped = await scrapeTeam(teamId, seasonId);
  console.log(JSON.stringify(scraped, null, 2));

  if (doImport) {
    console.error("\n[scrapeTeam] Импортирую в Supabase...");
    const summary = await importTeamToSupabase(scraped, "Жайык");
    console.error(JSON.stringify(summary, null, 2));
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[scrapeTeam] ошибка:", err.message);
    process.exitCode = 1;
  });
}

module.exports = {
  scrapeTeam,
  scrapePlayer,
  resolveDefaultSeasonId,
  fetchTeamPlayers,
  importTeamToSupabase,
  isZhaiyqName,
};
