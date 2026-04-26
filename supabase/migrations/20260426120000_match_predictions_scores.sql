-- Счёт прогноза (шаг 1 «Zhaiyq Эксперт»). Выполните в SQL Editor Supabase, если таблица уже создана без этих полей.
alter table public.match_predictions
  add column if not exists home_score integer;

alter table public.match_predictions
  add column if not exists away_score integer;

-- Один прогноз на пользователя и матч (опционально; удалите строку, если в таблице уже есть дубликаты).
-- create unique index if not exists match_predictions_user_id_match_id_key
--   on public.match_predictions (user_id, match_id);
