-- Цвета домашней и гостевой формы для вкладки «Состав» (матч home_team_id / away_team_id).
alter table public.teams
  add column if not exists home_color varchar(16);

alter table public.teams
  add column if not exists away_color varchar(16);
