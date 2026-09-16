import { kffJson } from "@/lib/kff/http";
import { fetchLiveGame, type LiveGoal } from "@/lib/kff/liveGame";
import { syncMatchesFromKff } from "@/lib/kff/syncMatches";
import { formatKickoff, matchTitle } from "@/lib/matches/formatKickoff";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { displayCase } from "@/lib/text/displayCase";
import { escapeHtml, sendBotMessage, type InlineButton } from "@/lib/telegram/bot";

/**
 * Уведомления болельщикам о матчах Жайыка:
 *  - prematch — примерно за час до начала, с кнопкой «Смотреть онлайн»;
 *  - result — после финального свистка, со счётом и авторами голов.
 * Запускается по расписанию каждые 5 минут (`/api/cron/notify-matches`).
 */

/** `matches.match_date` хранится без пояса в местном времени Казахстана (UTC+5). */
const KZ_OFFSET = "+05:00";
const MIN = 60_000;
/** Отправляем напоминание, когда до начала осталось не больше этого. */
const PREMATCH_LEAD_MS = 65 * MIN;
/** Результат отправляем только для свежих матчей — старые не «догоняем». */
const RESULT_MAX_AGE_MS = 24 * 60 * MIN;
/** Пауза между сообщениями: лимит Telegram — 30 сообщений в секунду. */
const SEND_GAP_MS = 40;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type MatchRow = {
  id: string;
  match_date: string;
  opponent: string;
  is_home: boolean;
  status: string;
  competition: string | null;
  zhaiyq_score: number | null;
  opponent_score: number | null;
  kff_game_id: number | null;
  full_match_url: string | null;
  highlight_url: string | null;
};

export type NotificationKind = "prematch" | "result";

export type PlannedNotification = {
  matchId: string;
  kind: NotificationKind;
  title: string;
  html: string;
  buttons: InlineButton[][];
};

export type NotifyRunResult = {
  now: string;
  dryRun: boolean;
  syncedResults: boolean;
  warnings: string[];
  planned: PlannedNotification[];
  sent: { matchId: string; kind: NotificationKind; recipients: number; failed: number; skipped?: string }[];
};

function kickoffMs(matchDate: string): number {
  const local = matchDate.slice(0, 19);
  return new Date(`${local}${KZ_OFFSET}`).getTime();
}

function appUrl(): string {
  return (process.env.TELEGRAM_MINI_APP_URL || "https://jaiyq-app.vercel.app").replace(/\/$/, "");
}

function kffMatchPage(kffGameId: number | null): string | null {
  return kffGameId ? `https://kffleague.kz/ru/matches/${kffGameId}` : null;
}

/** YouTube-ссылки KFF приходят то URL, то HTML-эмбедом `<iframe src=…>`. */
function normalizeVideoUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  const src = s.match(/src\s*=\s*["']([^"']+)["']/i)?.[1];
  if (!src) return null;
  const embed = src.match(/youtube\.com\/embed\/([\w-]+)/i);
  return embed ? `https://www.youtube.com/watch?v=${embed[1]}` : src;
}

async function kffVideoLinks(kffGameId: number | null) {
  if (!kffGameId) return { live: null, review: null };
  try {
    const g = await kffJson<{ youtube_live_url?: unknown; video_review_url?: unknown }>(`/games/${kffGameId}`);
    return { live: normalizeVideoUrl(g.youtube_live_url), review: normalizeVideoUrl(g.video_review_url) };
  } catch {
    return { live: null, review: null };
  }
}

function surname(fullName: string) {
  return fullName.trim().split(/\s+/).pop() ?? fullName;
}

function goalsLine(goals: LiveGoal[], side: "home" | "away"): string | null {
  const list = goals
    .filter((g) => g.side === side)
    .map((g) => `${g.minute}′ ${escapeHtml(surname(g.playerName))}${g.ownGoal ? " (авт.)" : ""}`);
  return list.length ? list.join(", ") : null;
}

export async function buildPrematch(m: MatchRow, nowMs: number): Promise<PlannedNotification> {
  const minutes = Math.max(1, Math.round((kickoffMs(m.match_date) - nowMs) / MIN));
  const when = minutes >= 55 ? "Через час" : `Через ${minutes} мин`;
  const links = await kffVideoLinks(m.kff_game_id);
  const watch = m.full_match_url || links.live || kffMatchPage(m.kff_game_id);

  const html = [
    `⚽️ <b>${when} матч!</b>`,
    "",
    `<b>${escapeHtml(matchTitle(m))}</b>`,
    `${escapeHtml(formatKickoff(m.match_date))}${m.is_home ? " · дома" : " · в гостях"}`,
    m.competition ? escapeHtml(displayCase(m.competition)) : null,
    "",
    "Успей сделать прогноз — угаданный счёт приносит очки в рейтинге болельщиков.",
  ]
    .filter((l) => l !== null)
    .join("\n");

  const buttons: InlineButton[][] = [];
  if (watch) buttons.push([{ text: "▶️ Смотреть онлайн", url: watch }]);
  buttons.push([{ text: "🎯 Угадай счёт", web_app: { url: appUrl() } }]);

  return { matchId: m.id, kind: "prematch", title: matchTitle(m), html, buttons };
}

export async function buildResult(m: MatchRow): Promise<PlannedNotification> {
  const zs = m.zhaiyq_score ?? 0;
  const os = m.opponent_score ?? 0;
  const home = m.is_home ? { name: "Жайык", score: zs } : { name: m.opponent, score: os };
  const away = m.is_home ? { name: m.opponent, score: os } : { name: "Жайык", score: zs };

  let goals: LiveGoal[] = [];
  if (m.kff_game_id) {
    try {
      goals = (await fetchLiveGame(m.kff_game_id)).goals;
    } catch {
      /* без авторов голов сообщение всё равно полезно */
    }
  }
  const verdict = zs > os ? "Победа! Спасибо за поддержку 💙" : zs < os ? "Поражение. Ждём реванша 💪" : "Ничья.";
  const links = await kffVideoLinks(m.kff_game_id);
  const review = m.highlight_url || links.review;

  const html = [
    "🏁 <b>Матч завершён</b>",
    "",
    `${escapeHtml(home.name)} <b>${home.score}:${away.score}</b> ${escapeHtml(away.name)}`,
    goalsLine(goals, "home") ? `⚽️ ${escapeHtml(home.name)}: ${goalsLine(goals, "home")}` : null,
    goalsLine(goals, "away") ? `⚽️ ${escapeHtml(away.name)}: ${goalsLine(goals, "away")}` : null,
    "",
    verdict,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const buttons: InlineButton[][] = [];
  if (review) buttons.push([{ text: "🎬 Обзор матча", url: review }]);
  else if (kffMatchPage(m.kff_game_id)) buttons.push([{ text: "📊 Протокол матча", url: kffMatchPage(m.kff_game_id)! }]);
  buttons.push([{ text: "Открыть в приложении", web_app: { url: appUrl() } }]);

  return { matchId: m.id, kind: "result", title: matchTitle(m), html, buttons };
}

const MATCH_COLUMNS =
  "id, match_date, opponent, is_home, status, competition, zhaiyq_score, opponent_score, kff_game_id, full_match_url, highlight_url";

async function loadMatches(): Promise<MatchRow[]> {
  const { data, error } = await getSupabaseAdminClient()
    .from("matches")
    .select(MATCH_COLUMNS)
    .not("kff_game_id", "is", null)
    .order("match_date", { ascending: true });
  if (error) throw new Error(`matches select: ${error.message}`);
  return (data ?? []) as MatchRow[];
}

async function alreadySent(dryRun: boolean, warnings: string[]): Promise<Set<string>> {
  const { data, error } = await getSupabaseAdminClient().from("match_notifications").select("match_id, kind");
  if (error) {
    // До применения миграции таблицы нет: в пробном прогоне просто предупреждаем,
    // а настоящая рассылка без журнала отправок невозможна.
    if (dryRun) {
      warnings.push("Нет таблицы match_notifications — примените миграцию 20260917120000.");
      return new Set();
    }
    throw new Error(`match_notifications select: ${error.message}`);
  }
  return new Set((data ?? []).map((r) => `${r.match_id}:${r.kind}`));
}

/**
 * Матч, который по времени уже должен был закончиться, а в базе всё ещё
 * «upcoming»: если KFF объявил финальный свисток — подтягиваем итог сразу,
 * не дожидаясь, пока кто-то откроет приложение.
 */
async function refreshFinishedResults(matches: MatchRow[], nowMs: number): Promise<boolean> {
  const stale = matches.filter((m) => {
    const age = nowMs - kickoffMs(m.match_date);
    return m.status === "upcoming" && age > 100 * MIN && age < 6 * 60 * MIN;
  });
  for (const m of stale) {
    try {
      if ((await fetchLiveGame(m.kff_game_id!)).phase === "finished") {
        await syncMatchesFromKff();
        return true;
      }
    } catch {
      /* KFF не ответил — попробуем на следующем запуске */
    }
  }
  return false;
}

export async function planNotifications(nowMs: number, opts: { refresh: boolean; dryRun: boolean }) {
  const warnings: string[] = [];
  let matches = await loadMatches();
  const syncedResults = opts.refresh ? await refreshFinishedResults(matches, nowMs) : false;
  if (syncedResults) matches = await loadMatches();
  const sent = await alreadySent(opts.dryRun, warnings);

  const planned: PlannedNotification[] = [];
  for (const m of matches) {
    const untilKickoff = kickoffMs(m.match_date) - nowMs;
    if (m.status === "upcoming" && untilKickoff > 0 && untilKickoff <= PREMATCH_LEAD_MS && !sent.has(`${m.id}:prematch`)) {
      planned.push(await buildPrematch(m, nowMs));
    }
    if (
      m.status === "finished" &&
      m.zhaiyq_score != null &&
      m.opponent_score != null &&
      -untilKickoff <= RESULT_MAX_AGE_MS &&
      !sent.has(`${m.id}:result`)
    ) {
      planned.push(await buildResult(m));
    }
  }
  return { planned, syncedResults, warnings };
}

/** Кому рассылать: болельщики, включившие уведомления о матчах. */
async function subscribers(): Promise<number[]> {
  const { data, error } = await getSupabaseAdminClient()
    .from("users")
    .select("telegram_id")
    .eq("notify_matches", true);
  if (error) throw new Error(`users select: ${error.message}`);
  return (data ?? []).map((r) => Number(r.telegram_id)).filter(Number.isFinite);
}

export async function runMatchNotifications(nowMs: number, dryRun: boolean): Promise<NotifyRunResult> {
  const { planned, syncedResults, warnings } = await planNotifications(nowMs, { refresh: !dryRun, dryRun });
  const result: NotifyRunResult = { now: new Date(nowMs).toISOString(), dryRun, syncedResults, warnings, planned, sent: [] };
  if (dryRun || planned.length === 0) return result;

  const admin = getSupabaseAdminClient();
  const users = await subscribers();

  for (const n of planned) {
    // «Занимаем» отправку до рассылки: при параллельном запуске второй получит
    // конфликт первичного ключа и ничего не отправит.
    const { error: claimErr } = await admin.from("match_notifications").insert({ match_id: n.matchId, kind: n.kind });
    if (claimErr) {
      result.sent.push({ matchId: n.matchId, kind: n.kind, recipients: 0, failed: 0, skipped: claimErr.code === "23505" ? "already sent" : claimErr.message });
      continue;
    }

    let ok = 0;
    let failed = 0;
    const blocked: number[] = [];
    for (const chatId of users) {
      const r = await sendBotMessage(chatId, n.html, n.buttons);
      if (r.ok) ok += 1;
      else {
        failed += 1;
        if (r.blocked) blocked.push(chatId);
      }
      await sleep(SEND_GAP_MS);
    }
    // Заблокировавшим бота больше не пишем.
    if (blocked.length) await admin.from("users").update({ notify_matches: false }).in("telegram_id", blocked);
    await admin.from("match_notifications").update({ recipients: ok, failed }).eq("match_id", n.matchId).eq("kind", n.kind);
    result.sent.push({ matchId: n.matchId, kind: n.kind, recipients: ok, failed });
  }
  return result;
}
