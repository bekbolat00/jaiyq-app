import { createHmac, timingSafeEqual } from "node:crypto";

export type VerifiedTelegramUser = {
  id: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
};

/** Telegram сам не задаёт TTL для initData — 24ч рекомендует официальная документация Mini Apps. */
const MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60;

/**
 * Проверяет подпись `initData`, присланного Telegram WebApp, по алгоритму из
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app.
 * Бросает Error на любой некорректной/просроченной/неподписанной строке.
 */
export function verifyTelegramInitData(
  initData: string,
  botToken: string,
): VerifiedTelegramUser {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) {
    throw new Error("initData: missing hash");
  }
  params.delete("hash");

  const dataCheckString = Array.from(params.keys())
    .sort()
    .map((key) => `${key}=${params.get(key)}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const expected = Buffer.from(computedHash, "hex");
  const actual = Buffer.from(hash, "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error("initData: signature mismatch");
  }

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate)) {
    throw new Error("initData: missing auth_date");
  }
  const ageSeconds = Date.now() / 1000 - authDate;
  if (ageSeconds > MAX_INIT_DATA_AGE_SECONDS || ageSeconds < -60) {
    throw new Error("initData: expired");
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    throw new Error("initData: missing user");
  }

  let parsedUser: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    photo_url?: string;
  };
  try {
    parsedUser = JSON.parse(userRaw);
  } catch {
    throw new Error("initData: user field is not valid JSON");
  }
  if (typeof parsedUser.id !== "number") {
    throw new Error("initData: user.id missing");
  }

  return {
    id: parsedUser.id,
    username: parsedUser.username ?? null,
    firstName: parsedUser.first_name ?? null,
    lastName: parsedUser.last_name ?? null,
    photoUrl: parsedUser.photo_url ?? null,
  };
}
