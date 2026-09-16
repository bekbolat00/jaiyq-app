-- Мини-игра «Забей гол»: удары с пенальти, 3 попытки в день.
--
-- Исход каждого удара считает сервер (lib/game/penalty.ts), а сюда
-- записывается результат. Уникальность (telegram_id, play_date, attempt) —
-- это и есть лимит «3 попытки в день»: четвёртую строку база не примет,
-- даже если клиент пришлёт удары одновременно.

create table if not exists public.penalty_shots (
  id bigserial primary key,
  telegram_id bigint not null,
  -- День по времени Уральска (UTC+5) — попытки обновляются в полночь по местному времени.
  play_date date not null,
  attempt smallint not null check (attempt between 1 and 3),
  aim_x real not null,
  aim_y real not null,
  power real not null,
  curve real not null,
  result text not null check (result in ('goal', 'saved', 'post', 'miss')),
  top_corner boolean not null default false,
  points smallint not null default 0,
  coins smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (telegram_id, play_date, attempt)
);

create index if not exists penalty_shots_telegram_id_idx on public.penalty_shots (telegram_id);

alter table public.penalty_shots enable row level security;
-- Политик нет: чтение и запись только через серверные маршруты (service-role).
