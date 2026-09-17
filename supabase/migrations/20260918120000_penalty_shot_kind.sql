-- «Забей гол»: тип удара (прямой, крученый, парашют, наклбол).
-- Старые записи и старые клиенты — крученый: раньше закрутка бралась из свайпа всегда.

alter table public.penalty_shots
  add column if not exists kind text not null default 'curl';

alter table public.penalty_shots drop constraint if exists penalty_shots_kind_check;
alter table public.penalty_shots
  add constraint penalty_shots_kind_check check (kind in ('straight', 'curl', 'lob', 'knuckle'));
