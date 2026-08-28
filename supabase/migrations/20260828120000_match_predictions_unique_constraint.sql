-- Закрепляет инвариант "один прогноз на пользователя и матч" на уровне БД.
-- Раньше это проверялось только на клиенте (см. ExpertPredictorSheet) — ненадёжно.

-- Сначала убираем дубликаты, если они уже накопились: на (user_id, match_id)
-- оставляем одну строку, остальные удаляем. Используем ctid (не id/created_at) —
-- эти колонки не гарантированы, ctid есть у любой таблицы Postgres.
delete from public.match_predictions p
using public.match_predictions newer
where p.user_id = newer.user_id
  and p.match_id = newer.match_id
  and p.ctid <> newer.ctid
  and p.ctid > newer.ctid;

create unique index if not exists match_predictions_user_id_match_id_key
  on public.match_predictions (user_id, match_id);
