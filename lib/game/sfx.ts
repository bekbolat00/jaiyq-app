"use client";

/**
 * Звуки «Забей гол» на Web Audio. Файлы в public/sounds (см. LICENSE.txt там же).
 * Браузер разрешает звук только после жеста пользователя — `unlockAudio()`
 * вызывается на первом касании. Все функции безопасны без звука и вне браузера.
 */

type Name = "crowd-ambient" | "kick" | "net" | "crowd-goal" | "crowd-gasp" | "crowd-groan";
const FILES: Name[] = ["crowd-ambient", "kick", "net", "crowd-goal", "crowd-gasp", "crowd-groan"];
const MUTE_KEY = "jaiyq.game.muted";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<Name, AudioBuffer>();
const loading = new Map<Name, Promise<AudioBuffer | null>>();
let ambient: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
let muted = false;
try {
  muted = typeof localStorage !== "undefined" && localStorage.getItem(MUTE_KEY) === "1";
} catch {
  muted = false;
}

function context() {
  if (ctx) return ctx;
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 1;
  master.connect(ctx.destination);
  return ctx;
}

function load(name: Name): Promise<AudioBuffer | null> {
  const cached = buffers.get(name);
  if (cached) return Promise.resolve(cached);
  const pending = loading.get(name);
  if (pending) return pending;
  const c = context();
  if (!c) return Promise.resolve(null);
  const p = fetch(`/sounds/${name}.mp3`)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.statusText))))
    .then((data) => c.decodeAudioData(data))
    .then((buf) => {
      buffers.set(name, buf);
      return buf;
    })
    .catch(() => null);
  loading.set(name, p);
  return p;
}

/** Скачать все звуки заранее — во время экрана старта, чтобы удар не ждал сети. */
export function preloadGameSounds() {
  if (!context()) return;
  for (const name of FILES) void load(name);
}

/** Разблокировать звук первым касанием (iOS/Telegram запускают AudioContext только так). */
export function unlockAudio() {
  const c = context();
  if (c && c.state === "suspended") void c.resume();
}

async function play(name: Name, volume: number, rate = 1) {
  const c = context();
  if (!c || !master || muted) return;
  const buf = await load(name);
  if (!buf) return;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const gain = c.createGain();
  gain.gain.value = volume;
  src.connect(gain).connect(master);
  src.start();
}

/** Касание ноги и мяча. `pace` 0..1 — сила удара: громче и ниже по тону. */
export function playKickSound(pace: number) {
  void play("kick", 0.55 + pace * 0.45, 1.08 - pace * 0.16);
}

/** Мяч в сетке. */
export function playNetSound() {
  void play("net", 0.8);
}

/** Реакция трибун на исход удара. */
export function playCrowdReaction(result: "goal" | "saved" | "post" | "miss" | "wall") {
  if (result === "goal") void play("crowd-goal", 1);
  else if (result === "miss") void play("crowd-groan", 0.9);
  else void play("crowd-gasp", 0.9);
}

/** Фоновый шум трибун, зациклен; включается на входе в игру, выключается на выходе. */
export function startCrowdAmbient() {
  const c = context();
  if (!c || !master || ambient) return;
  void load("crowd-ambient").then((buf) => {
    if (!buf || ambient || !c || !master) return;
    const source = c.createBufferSource();
    source.buffer = buf;
    source.loop = true;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(1, c.currentTime + 1.5);
    source.connect(gain).connect(master);
    source.start();
    ambient = { source, gain };
  });
}

export function stopCrowdAmbient() {
  if (!ambient || !ctx) return;
  const { source, gain } = ambient;
  ambient = null;
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
  source.stop(ctx.currentTime + 0.65);
}

export function isMuted() {
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    // приватный режим — просто не запоминаем
  }
  if (master && ctx) master.gain.linearRampToValueAtTime(value ? 0 : 1, ctx.currentTime + 0.15);
}
