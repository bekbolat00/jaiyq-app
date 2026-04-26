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
