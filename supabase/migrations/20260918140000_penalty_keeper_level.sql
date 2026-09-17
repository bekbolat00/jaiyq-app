-- «Забей гол»: уровень вратаря (юниор, любитель, проф).
-- Старые записи и старые клиенты — «любитель»: так вратарь играл до появления уровней.

alter table public.penalty_shots
  add column if not exists level text not null default 'amateur';

alter table public.penalty_shots drop constraint if exists penalty_shots_level_check;
alter table public.penalty_shots
  add constraint penalty_shots_level_check check (level in ('junior', 'amateur', 'pro'));
