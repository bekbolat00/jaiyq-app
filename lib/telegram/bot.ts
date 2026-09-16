/**
 * Отправка сообщений от имени бота (Bot API). Только сервер: нужен
 * TELEGRAM_BOT_TOKEN — тот же токен, которым проверяется initData.
 */

export type InlineButton =
  | { text: string; url: string }
  | { text: string; web_app: { url: string } };

export type SendResult =
  | { ok: true }
  | { ok: false; blocked: boolean; description: string };

type TelegramResponse = {
  ok: boolean;
  description?: string;
  error_code?: number;
  parameters?: { retry_after?: number };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function botConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

/** Сообщение в личку. HTML-разметка, кнопки под сообщением. */
export async function sendBotMessage(
  chatId: number | string,
  html: string,
  buttons: InlineButton[][] = [],
): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, blocked: false, description: "TELEGRAM_BOT_TOKEN is not configured" };

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
        reply_markup: buttons.length ? { inline_keyboard: buttons } : undefined,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => ({ ok: false }))) as TelegramResponse;
    if (data.ok) return { ok: true };

    // Лимит Telegram — ждём столько, сколько просит API, и пробуем ещё раз.
    if (data.error_code === 429) {
      await sleep(((data.parameters?.retry_after ?? 1) + 0.2) * 1000);
      continue;
    }
    // 403 — пользователь заблокировал бота или не давал разрешения писать.
    return { ok: false, blocked: data.error_code === 403, description: data.description ?? `HTTP ${res.status}` };
  }
  return { ok: false, blocked: false, description: "rate limited" };
}

/** Экранирование для parse_mode=HTML. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
