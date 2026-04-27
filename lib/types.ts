export type Squad = "main" | "academy";

export type Player = {
  id: string;
  firstName: string;
  lastName: string;
  number: number;
  position: string;
  squad: Squad;
  photoUrl: string;
  /** ДД.ММ.ГГГГ */
  birthDate: string;
  stats: {
    heightCm: number;
    weightKg: number;
    games: number;
    goals: number;
  };
  jerseyProductId?: string;
};

export type Team = {
  id: string;
  shortName: string;
  fullName: string;
  logoUrl: string;
};

/**
 * Событие матча в `public.match_events` (см. Supabase).
 * `type` / `event_type` — в зависимости от схемы; маппер поддерживает оба.
 */
export type MatchEventType =
  | "goal"
  | "yellow_card"
  | "red_card"
  | "substitution"
  | string;

export type DbTeamRow = {
  id: string;
  short_name: string;
  full_name: string;
  logo_url: string | null;
  slug?: string | null;
};

export type DbPlayerRow = {
  id: string;
  team_id: string;
  first_name: string;
  last_name: string;
  /** Если в БД одна строка `name` (альтернатива first/last) */
  name?: string | null;
  number?: number | null;
  jersey_number?: number | null;
  position: string;
  is_starter?: boolean | null;
};

export type DbMatchEventRow = {
  id: string;
  match_id: string;
  team_id: string;
  minute: number;
  event_type?: MatchEventType;
  type?: string | null;
  player_id?: string | null;
  /** Готовая подпись, если в БД есть */
  description?: string | null;
  details?: string | null;
  player_in_id?: string | null;
  player_out_id?: string | null;
  assist_player_id?: string | null;
  /** Вложенный `players` при `match_events(*, player:players(*))` */
  player?: DbPlayerRow | null;
};

/** Одна строка статистики на команду: `public.match_stats`. */
export type DbMatchStatRow = {
  id: string;
  match_id: string;
  team_id: string;
  /** 0–100, доля владения */
  possession?: number | null;
  possession_pct?: number | null;
  /** Удары всего (если поле в БД называется иначе — смотрите mapMatchDetail). */
  shots?: number | null;
  total_shots?: number | null;
  corners?: number | null;
  shots_on_target?: number | null;
  offsides?: number | null;
  saves?: number | null;
  yellow_cards?: number | null;
  /** Опционально, если в миграции задано — сразу сторона */
  is_home?: boolean | null;
};

export type MatchLineupRole = "starter" | "bench" | "coach" | string;

export type DbMatchLineupRow = {
  id: string;
  match_id: string;
  team_id: string;
  player_id: string;
  role?: MatchLineupRole;
  is_substitute?: boolean | null;
  is_coach?: boolean | null;
  shirt_number?: number | null;
  sort_order?: number | null;
  position_override?: string | null;
  player?: DbPlayerRow | null;
};

/**
 * Ответ с вложенными сущностями:
 * .select('*, match_events(*), match_stats(*), match_lineups(player:players(*))')
 * (при необходимости: match_events с join на игрока — в fetch допускается).
 */
export type DbMatchWithRelations = DbMatchRow & {
  match_events: DbMatchEventRow[] | null;
  match_stats: DbMatchStatRow[] | null;
  match_lineups: DbMatchLineupRow[] | null;
};

export type Match = {
  id: string;
  home: Team;
  away: Team;
  kickoffAt: string;
  venue: string;
  competition: string;
  ticketUrl?: string;
  /** Итог для прошедших матчей (кнопка «О матче» / матч-центр). */
  finalScore?: { home: number; away: number };
  /**
   * Полные данные с Supabase (когда подгружены через матч-центр / API).
   * `statsByTeam` — после маппинга по сторонам хозяев/гостей.
   */
  matchEvents?: DbMatchEventRow[];
  matchStats?: { home: DbMatchStatRow; away: DbMatchStatRow } | null;
  matchLineups?: (DbMatchLineupRow & { player: DbPlayerRow | null })[];
};

/** Гол для матч-центра / календаря (`teamId` — как у `Team.id`). */
export type CalendarTabMatchScorer = {
  name: string;
  minute: number;
  teamId: string;
};

/** Составы по сторонам (имена игроков). */
export type CalendarTabMatchLineup = {
  home: string[];
  away: string[];
};

/** Статистика: кортежи [хозяева, гости] (владение — доли в процентах). */
export type CalendarTabMatchStats = {
  possession: [number, number];
  shots: [number, number];
  corners: [number, number];
};

/** Эксперт с прогнозом на матч. */
export type CalendarTabMatchExpert = {
  name: string;
  prediction: string;
  avatar: string;
  status: string;
};

export type CalendarTabMatch = {
  id: string;
  date: string; // ISO строка — используется для фильтрации по месяцу/году
  kickoffAt: string; // ISO строка — используется для таймера обратного отсчёта
  /** Лига / турнир (как `Match.competition` в NextMatchCard / MatchCalendarPanel). */
  competition: string;
  /** Стадион (как `Match.venue`). */
  venue: string;
  homeTeam: string; // плоское поле — используется там где раньше было m.homeTeam
  awayTeam: string;
  homeLogo: string; // плоское поле — используется там где раньше было m.homeLogo
  awayLogo: string;
  /** Сторона хозяев: полная форма `Team` + счёт (как `Match.home` для TeamBadge / shortName). */
  home: Team & { score: number | null };
  away: Team & { score: number | null };
  homeScore: number | null;
  awayScore: number | null;
  ticketUrl?: string; // опциональное — ссылка на билеты для предстоящих матчей
  status: "upcoming" | "finished";
  /** Итог для прошедших матчей (как у типа `Match`). */
  finalScore?: { home: number; away: number };
  /** Матч-центр: авторы голов (если данных нет — поле отсутствует). */
  scorers?: CalendarTabMatchScorer[];
  /** Составы для детальной карточки. */
  lineup?: CalendarTabMatchLineup;
  /** Владение, удары, угловые [дом, в гостях]. */
  stats?: CalendarTabMatchStats;
  /** Прогнозы экспертов. */
  experts?: CalendarTabMatchExpert[];
};

/** Строка `public.matches` из Supabase (основные поля UI). */
export type DbMatchRow = {
  id: string;
  match_date: string;
  opponent: string;
  logo_url: string | null;
  is_home: boolean;
  zhaiyq_score: number | null;
  opponent_score: number | null;
  competition: string;
  status: "upcoming" | "finished";
  match_details: string | null;
  ticket_url?: string | null;
};

/** Контекст матча для шторки «ZHAIYQ ЭКСПЕРТ». */
export type ExpertMatchContext = {
  matchId: string;
  isHome: boolean;
  opponentName: string;
  opponentLogoUrl: string | null;
  kickoffAt: string;
};

export type Product = {
  id: string;
  title: string;
  subtitle?: string;
  priceKzt: number;
  imageUrl: string;
  category: "jersey" | "merch" | "accessory";
};

export type GoalEvent = {
  minute: number;
  scorer: string;
  team: "home" | "away";
};

export type Ticket = {
  id: string;
  matchId: string;
  opponent: string;
  date: string;
  sector: string;
  row: string;
  seat: string;
  qrPayload: string;
  status: "active" | "archived";
  backgroundUrl?: string;
  finalScore?: { home: number; away: number };
  /** false — в матче Жайык играл в гостях (счёт в билете: «Жайык — соперник»). */
  zhaiyqPlayedHome?: boolean;
  goals?: GoalEvent[];
};

export type UserProfile = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  pushAwayMatches: boolean;
  /** Соц. стата (Instagram-стиль в шапке профиля) */
  followersCount?: number;
  followingCount?: number;
};

/** Карточка новости в ленте на главной */
export type NewsFeedItem = {
  id: string;
  title: string;
  description: string;
  date: string;
  imageUrl: string;
  likesCount: number;
  isLiked: boolean;
};

/** Уведомления Social Hub (мок) */
export type AppNotification = {
  id: string;
  text: string;
  /** Подсветка как у «новых» */
  isNew: boolean;
  /** Буква в круге слева (как в VIBE) */
  initial: string;
  /** Цвет маркера */
  tone: "orange" | "cyan";
  /** Дата в формате ДД.ММ.ГГГГ */
  date: string;
};

/**
 * Друг для приглашений на матч: PRO или ранг, публичная витрина.
 */
export type SocialFriend = {
  id: string;
  name: string;
  avatarUrl?: string;
  /** true — бейдж PRO, иначе отображаем `rankLabel` */
  isPro: boolean;
  rankLabel: string;
  followersCount: number;
  /** «Посетил N матчей клуба» */
  clubMatchesAttended: number;
};
