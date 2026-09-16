-- «Забей гол»: режим штрафного. Попытки общие — 3 удара в день в любом режиме.

alter table public.penalty_shots
  add column if not exists mode text not null default 'penalty';

alter table public.penalty_shots drop constraint if exists penalty_shots_mode_check;
alter table public.penalty_shots
  add constraint penalty_shots_mode_check check (mode in ('penalty', 'freekick'));

-- Новый исход — мяч попал в стенку.
alter table public.penalty_shots drop constraint if exists penalty_shots_result_check;
alter table public.penalty_shots
  add constraint penalty_shots_result_check check (result in ('goal', 'saved', 'post', 'miss', 'wall'));
