-- Заполняет home_team_id / away_team_id, если колонки есть (см. 20260427120000),
-- но миграции на прод ещё не накатили. До применения ALTER этот бэкфилл падает;
-- в таком случае сначала выполните миграцию с add column.

-- Жайык: дома при is_home, иначе в гостях; вторая сторона — любая другая команда
-- с полным ростером (для демо — «Арыс», пока соперник вне public.teams).

update public.matches m
set
  home_team_id = z.id,
  away_team_id = a.id
from
  (select id from public.teams where name = 'Жайык' limit 1) as z
  cross join
  (select id from public.teams where name = 'Арыс' limit 1) as a
where
  m.is_home = true
  and m.home_team_id is null
  and z.id is not null
  and a.id is not null
  and z.id <> a.id;

update public.matches m
set
  home_team_id = a.id,
  away_team_id = z.id
from
  (select id from public.teams where name = 'Жайык' limit 1) as z
  cross join
  (select id from public.teams where name = 'Арыс' limit 1) as a
where
  m.is_home = false
  and m.home_team_id is null
  and z.id is not null
  and a.id is not null
  and z.id <> a.id;
