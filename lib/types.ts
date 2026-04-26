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
