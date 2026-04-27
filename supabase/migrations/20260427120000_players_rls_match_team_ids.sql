-- Чтение игроков для анонимного клиента (вкладка «Состав» в матч-центре).
alter table public.players enable row level security;

drop policy if exists "allow read" on public.players;

create policy "allow read" on public.players for select using (true);

-- Привязка матча к UUID команд (для .in('team_id', [home_team_id, away_team_id])).
alter table public.matches
  add column if not exists home_team_id uuid references public.teams (id);

alter table public.matches
  add column if not exists away_team_id uuid references public.teams (id);
