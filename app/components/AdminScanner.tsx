"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Scanner, type IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { getTelegramInitData } from "@/lib/telegram/getInitData";

type ScanOutcome =
  | { kind: "ok"; title: string; detail: string }
  | { kind: "error"; title: string; detail: string };

/** Пауза после результата, чтобы одна поднесённая карточка не считалась подряд. */
const RESULT_HOLD_MS = 2600;

function formatDateTime(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminScanner() {
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  /** Гасит повторные срабатывания камеры на тот же код, пока висит результат. */
  const lockedRef = useRef(false);

  const handleScan = useCallback(async (codes: IDetectedBarcode[]) => {
    const raw = codes[0]?.rawValue?.trim();
    if (!raw || lockedRef.current) return;

    lockedRef.current = true;
    setBusy(true);

    const initData = getTelegramInitData();
    if (!initData) {
      setOutcome({
        kind: "error",
        title: "Нет доступа",
        detail: "Откройте сканер через Telegram.",
      });
      setBusy(false);
      window.setTimeout(() => {
        lockedRef.current = false;
        setOutcome(null);
      }, RESULT_HOLD_MS);
      return;
    }

    try {
      const res = await fetch("/api/tickets/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, qrHash: raw }),
      });
      const json = (await res.json()) as {
        result?: string;
        opponent?: string;
        scannedAt?: string | null;
        error?: string;
      };

      if (res.status === 403) {
        setOutcome({ kind: "error", title: "Нет прав", detail: "Вы не в списке стюардов." });
      } else if (!res.ok) {
        setOutcome({ kind: "error", title: "Ошибка", detail: json.error ?? "Попробуйте ещё раз." });
      } else if (json.result === "ok") {
        setOutcome({
          kind: "ok",
          title: "УСПЕШНО! Проход разрешён",
          detail: json.opponent ? `Матч: Жайык — ${json.opponent}` : "Билет погашен",
        });
      } else if (json.result === "already_used") {
        setOutcome({
          kind: "error",
          title: "ОШИБКА! Билет уже использован",
          detail: json.scannedAt ? `Вход был: ${formatDateTime(json.scannedAt)}` : "Повторный проход",
        });
      } else if (json.result === "not_paid") {
        setOutcome({
          kind: "error",
          title: "Билет не оплачен",
          detail: "Оплата ещё не подтверждена.",
        });
      } else {
        setOutcome({
          kind: "error",
          title: "Билет не существует!",
          detail: "QR-код не найден в системе.",
        });
      }
    } catch (e: unknown) {
      console.error("[AdminScanner] scan threw:", e);
      setOutcome({ kind: "error", title: "Ошибка сети", detail: "Проверьте соединение." });
    } finally {
      setBusy(false);
      window.setTimeout(() => {
        lockedRef.current = false;
        setOutcome(null);
      }, RESULT_HOLD_MS);
    }
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-black">
        {/* Квадратное окно камеры — одинаково ведёт себя на любом телефоне. */}
        <div className="relative aspect-square w-full">
          <Scanner
            onScan={handleScan}
            onError={(e) => console.error("[AdminScanner] camera error:", e)}
            constraints={{ facingMode: "environment" }}
            formats={["qr_code"]}
            scanDelay={400}
            components={{ finder: false }}
            styles={{
              container: { width: "100%", height: "100%" },
              video: { width: "100%", height: "100%", objectFit: "cover" },
            }}
          />

          {/* Рамка прицела */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
            <div className="relative h-[62%] w-[62%] rounded-2xl">
              <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-accent" />
              <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-accent" />
              <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-accent" />
              <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-accent" />
            </div>
          </div>

          {/* Полноэкранный вердикт поверх камеры */}
          <AnimatePresence>
            {outcome && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-center ${
                  outcome.kind === "ok" ? "bg-emerald-600/95" : "bg-red-700/95"
                }`}
              >
                <motion.div
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 20 }}
                  className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/80"
                >
                  {outcome.kind === "ok" ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-11 w-11" aria-hidden>
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" className="h-11 w-11" aria-hidden>
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  )}
                </motion.div>
                <p className="text-balance text-xl font-black uppercase leading-tight text-white">
                  {outcome.title}
                </p>
                <p className="text-sm font-medium text-white/90">{outcome.detail}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {busy && !outcome && (
            <div className="absolute inset-x-0 bottom-0 z-10 bg-black/70 py-2 text-center text-xs font-bold uppercase tracking-widest text-accent">
              Проверяем билет…
            </div>
          )}
        </div>
      </div>

      <p className="px-1 text-center text-[12px] leading-relaxed text-muted">
        Наведите камеру на QR-код болельщика. Билет гасится автоматически —
        повторный проход по нему будет отклонён.
      </p>
    </div>
  );
}
