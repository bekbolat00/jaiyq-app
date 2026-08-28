#!/usr/bin/env node
/**
 * Парсер страницы матча kffleague.kz.
 *
 * Использование:
 *   node scripts/kffScraper.js <matchId | matchUrl> [--out путь.json]
 *
 * Пример:
 *   node scripts/kffScraper.js 1274
 *   node scripts/kffScraper.js https://kffleague.kz/ru/matches/1274 --out match-1274.json
 *
 * Как это работает:
 * kffleague.kz — Next.js App Router сайт: страница матча рендерится на
 * сервере, и все данные (детали матча, ссылки на видео, составы, фото
 * игроков) уже присутствуют в HTML первого ответа — внутри RSC-пейлоада,
 * который стример Next.js пишет как `self.__next_f.push([1, "<json>"])`.
 * Поэтому headless-браузер (puppeteer) не нужен: простого GET-запроса
 * (axios) достаточно, чтобы получить готовые данные. cheerio используется
 * для выборки самих `<script>`-тегов и вспомогательных `<meta>`-тегов —
 * дальше строка внутри тега уже содержит валидный (экранированный) JSON,
 * который просто нужно вычленить и распарсить.
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

function normalizePhotoUrl(raw) {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "$undefined") return null;
  return trimmed;
}

function normalizePlayer(p) {
  return {
    playerId: p.player_id,
    firstName: p.first_name ?? null,
    lastName: p.last_name ?? null,
    number: p.number ?? null,
    position: p.position ?? null,
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

  return {
    matchId: Number(matchId),
    sourceUrl: url,
    scrapedAt: new Date().toISOString(),
    pageTitle: $("title").first().text().trim() || null,
    date: detail.date ?? null,
    time: detail.time ?? null,
    status: detail.status ?? null,
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
    lineups: lineups
      ? {
          home: normalizeTeamLineup(lineups.home_team),
          away: normalizeTeamLineup(lineups.away_team),
        }
      : null,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf("--out");
  const outPath = outIdx !== -1 ? args[outIdx + 1] : null;
  const skipIdx = outIdx === -1 ? -1 : outIdx + 1;
  const matchArg = args.filter((a, i) => i !== outIdx && i !== skipIdx)[0];

  if (!matchArg) {
    console.error(
      "Использование: node scripts/kffScraper.js <matchId | matchUrl> [--out файл.json]",
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
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[kffScraper] ошибка:", err.message);
    process.exitCode = 1;
  });
}

module.exports = { scrapeMatch, resolveMatchUrl, matchIdFromUrl };
