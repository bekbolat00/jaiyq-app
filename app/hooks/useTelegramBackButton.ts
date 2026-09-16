"use client";

import { useEffect, useRef } from "react";
import { getTelegramBackButton } from "@/lib/telegram/webApp";

type Entry = { close: () => void };

/**
 * Открытые шторки в порядке открытия. Системная «Назад» Telegram (и жест
 * «назад» на Android) закрывает только верхнюю: карточка матча поверх экрана
 * «Матчи» закрывается первой, а не всё сразу.
 */
const stack: Entry[] = [];
let clickBound = false;

function onBackClick() {
  stack[stack.length - 1]?.close();
}

function syncVisibility() {
  const button = getTelegramBackButton();
  if (!button) return;
  if (stack.length) button.show();
  else button.hide();
}

/** Показывает системную «Назад» Telegram, пока `active`, и вызывает `onBack` по нажатию. */
export function useTelegramBackButton(active: boolean, onBack: () => void) {
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!active) return;
    const button = getTelegramBackButton();
    if (!button) return;

    if (!clickBound) {
      button.onClick(onBackClick);
      clickBound = true;
    }
    const entry: Entry = { close: () => onBackRef.current() };
    stack.push(entry);
    syncVisibility();

    return () => {
      const i = stack.indexOf(entry);
      if (i !== -1) stack.splice(i, 1);
      syncVisibility();
    };
  }, [active]);
}
