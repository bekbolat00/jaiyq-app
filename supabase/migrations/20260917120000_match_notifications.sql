-- Уведомления о матчах через бота: за час до начала и после финального свистка.
--
-- Писать пользователю бот может только после его разрешения
-- (Telegram.WebApp.requestWriteAccess), поэтому подписка по умолчанию
-- выключена и включается из приложения.

alter table public.users
  add column if not exists notify_matches boolean not null default false;

-- Журнал отправок. Первичный ключ (match_id, kind) — это и есть защита от
-- дублей: запуск по расписанию сначала «занимает» строку и только потом
-- рассылает, поэтому два параллельных запуска не отправят одно и то же дважды.
create table if not exists public.match_notifications (
  match_id uuid not null references public.matches (id) on delete cascade,
  kind text not null check (kind in ('prematch', 'result')),
  created_at timestamptz not null default now(),
  recipients integer,
  failed integer,
  primary key (match_id, kind)
);

alter table public.match_notifications enable row level security;
-- Политик нет: таблица доступна только service-role (серверные маршруты).
