-- Медиа-колонки для апгрейда матч-центра по референсу KFF:
-- фото игроков на тактической доске + ссылки на трансляцию/видеообзор матча.

alter table public.players add column if not exists photo_url text;

alter table public.matches add column if not exists highlight_url text;
alter table public.matches add column if not exists full_match_url text;
