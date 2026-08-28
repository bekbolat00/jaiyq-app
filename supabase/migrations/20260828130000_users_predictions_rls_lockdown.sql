-- Закрывает прямую запись в public.users / public.match_predictions с
-- анонимного (публичного anon-key) клиента. Идентичность теперь подтверждается
-- подписанным Telegram initData на сервере (см. app/api/telegram/sync,
-- app/api/rewards/claim, app/api/predictions/submit), запись туда идёт через
-- service-role клиент (lib/supabase/admin.ts), который RLS не касается.
--
-- ВАЖНО: применяйте после деплоя серверных route handlers — иначе клиент,
-- который ещё пишет напрямую (старая версия фронтенда), сломается.

alter table public.users enable row level security;

-- Никаких anon-политик для users: SELECT/INSERT/UPDATE/DELETE с публичным
-- ключом полностью запрещены. Профиль и баланс монет читаются только через
-- /api/* route handlers (service-role).

alter table public.match_predictions enable row level security;

drop policy if exists "allow read" on public.match_predictions;

-- Чтение остаётся публичным: используется для статистики "средний прогноз
-- по матчу" (lib/matches/fetchMatchFull.ts) и для клиентской проверки
-- "уже прогнозировал" в ExpertPredictorSheet — обе не содержат чувствительных данных.
create policy "allow read" on public.match_predictions for select using (true);

-- INSERT/UPDATE/DELETE политик для anon нет — запись только через
-- /api/predictions/submit (service-role).
