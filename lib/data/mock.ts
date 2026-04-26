import type {
  AppNotification,
  CalendarTabMatch,
  Match,
  NewsFeedItem,
  Player,
  Product,
  SocialFriend,
  Team,
  Ticket,
  UserProfile,
} from "@/lib/types";
import { TEAM_ZHAIYQ } from "@/lib/constants/zhaiyq";

/** События на таймлайне лайв-матча (главная). */
export type LiveTimelineEvent = {
  id: string;
  minute: number;
  type: "goal" | "yellow" | "sub";
  label: string;
  side: "home" | "away";
};

export { TEAM_ZHAIYQ };

export const TEAM_KAIRAT_JASTAR: Team = {
  id: "kairat-jastar",
  shortName: "КАЙРАТ-ЖАСТАР",
  fullName: "Кайрат-Жастар",
  logoUrl: "/teams/kairat.png",
};

export const TEAM_TARAZ: Team = {
  id: "taraz",
  shortName: "ТАРАЗ",
  fullName: "ФК Тараз",
  logoUrl: "/teams/taraz.png",
};

export const TEAM_BATYR: Team = {
  id: "batyr",
  shortName: "BATYR",
  fullName: "Batyr",
  logoUrl: "/teams/batyr.png",
};

export const TEAM_CASPIY_M: Team = {
  id: "caspiy-m",
  shortName: "КАСПИЙ М",
  fullName: "Каспий М",
  logoUrl: "/teams/caspiy.png",
};

export const TEAM_AKTOBE_M: Team = {
  id: "aktobe-m",
  shortName: "АКТОБЕ М",
  fullName: "Актобе М",
  logoUrl: "/teams/aktobe.png",
};

export const TEAM_HAN_TENGRI: Team = {
  id: "han-tengri",
  shortName: "ХАН ТЕНГРИ",
  fullName: "ФК Хан Тенгри",
  logoUrl: "/teams/han-tengri.png",
};

export const TEAM_SHAKHTER_KARAGANDA: Team = {
  id: "shakhter-karaganda",
  shortName: "ШАХТЕР К.",
  fullName: "ФК Шахтёр Караганда",
  logoUrl: "/teams/shakhter.png",
};

export const TEAM_ACADEMY_ONTYUSTIK: Team = {
  id: "academy-ontustik",
  shortName: "АКАД. ОНТЮСТИК",
  fullName: "Академия Онтюстик",
  logoUrl: "/teams/ontystik.png",
};

export const TEAM_TURAN: Team = {
  id: "turan",
  shortName: "ТУРАН",
  fullName: "ФК Туран",
  logoUrl: "/teams/turan.png",
};

export const TEAM_KAIRAT_ACADEMY: Team = {
  id: "kairat-academy",
  shortName: "КАЙРАТ-АКАД.",
  fullName: "Кайрат-Академия",
  logoUrl: "/teams/kairat.png",
};

export const TEAM_ALTAI: Team = {
  id: "altai",
  shortName: "АЛТАЙ",
  fullName: "ФК Алтай",
  logoUrl: "/teams/turan.png",
};

export const TEAM_ZHENIS: Team = {
  id: "zhenis",
  shortName: "ЖЕНИС",
  fullName: "ФК Женис",
  logoUrl: "/teams/taraz.png",
};

export const TEAM_EKIBASTUZ: Team = {
  id: "ekibastuz",
  shortName: "ЭКИБАСТУЗ",
  fullName: "ФК Экибастуз",
  logoUrl: "/teams/batyr.png",
};

export const TEAM_ARYS: Team = {
  id: "arys",
  shortName: "АРЫС",
  fullName: "ФК Арыс",
  logoUrl: "/teams/ontystik.png",
};

export const TEAM_OKZHETPES: Team = {
  id: "okzhetpes",
  shortName: "ОКЖЕТПЕС",
  fullName: "ФК Окжетпес",
  logoUrl: "/teams/han-tengri.png",
};

export const TEAM_ULYTAU: Team = {
  id: "ulytau",
  shortName: "УЛЫТАУ",
  fullName: "ФК Улытау",
  logoUrl: "/teams/aktobe.png",
};

export const TEAM_KYZYLZHAR: Team = {
  id: "kyzylzhar",
  shortName: "КЫЗЫЛЖАР",
  fullName: "ФК Кызылжар",
  logoUrl: "/teams/caspiy.png",
};

export const LIVE_MATCH_SCORE = {
  homeTeam: TEAM_HAN_TENGRI,
  awayTeam: TEAM_ZHAIYQ,
  home: 1,
  away: 0,
  statusLabel: "ВЧЕРА",
  competition: "Первая лига Казахстана",
} as const;

export const LIVE_TIMELINE: LiveTimelineEvent[] = [
  { id: "e1", minute: 34, type: "yellow", label: "Жёлтая — А. Нурпеисов (Жайык)", side: "away" },
  { id: "e2", minute: 58, type: "yellow", label: "Жёлтая — М. Рахимов (Хан Тенгри)", side: "home" },
  {
    id: "e3",
    minute: 72,
    type: "goal",
    label: "Гол — И. Калиев (Хан Тенгри)",
    side: "home",
  },
];

/** Доли хозяев / гостей: владение в %; удары и угловые — как доли от суммы. */
export const LIVE_MATCH_STATS = {
  possession: { home: 54, away: 46 },
  shotsOnTarget: { home: 5, away: 3 },
  corners: { home: 6, away: 4 },
} as const;

export type LiveMatchStatsShape = typeof LIVE_MATCH_STATS;

/** Таймлайн для матча Жайык (дома) — Хан Тенгри: счёт 0:1. */
export const PAST_ZHAIYQ_VS_HAN_TENGRI_TIMELINE: LiveTimelineEvent[] = [
  { id: "zh-ht-1", minute: 34, type: "yellow", label: "Жёлтая — А. Нурпеисов (Жайык)", side: "home" },
  { id: "zh-ht-2", minute: 58, type: "yellow", label: "Жёлтая — М. Рахимов (Хан Тенгри)", side: "away" },
  {
    id: "zh-ht-3",
    minute: 72,
    type: "goal",
    label: "Гол — И. Калиев (Хан Тенгри)",
    side: "away",
  },
];

const MATCH_CENTER_SQUAD_ZHAIYQ = [
  "1  Ахметов",
  "3  Калимов",
  "5  Мұратов",
  "7  Сагинтаев",
  "8  Беккали",
  "9  Теміров",
  "11 Сагынов",
  "14 Кенжебаев",
  "17 Нурпеисов",
  "19 Рахимов",
  "22 Омаров",
];

const MATCH_CENTER_SQUAD_HAN_TENGRI = [
  "1  Садвакас",
  "4  Нуржан",
  "6  Рахимов",
  "10 Калиев",
  "12 Беккожа",
  "15 Омар",
  "18 Сарым",
  "21 Мұхтар",
  "23 Ашим",
  "27 Темір",
  "30 Ермек",
];

export type MatchCenterViewModel = {
  competition: string;
  statusLabel: string;
  home: Team;
  away: Team;
  homeScore: number;
  awayScore: number;
  timeline: LiveTimelineEvent[];
  stats: LiveMatchStatsShape;
  homeSquad: string[];
  awaySquad: string[];
};

type MatchCenterExtras = Pick<
  MatchCenterViewModel,
  "timeline" | "stats" | "homeSquad" | "awaySquad"
>;

const EMPTY_MATCH_CENTER_EXTRAS: MatchCenterExtras = {
  timeline: [],
  stats: LIVE_MATCH_STATS,
  homeSquad: MATCH_CENTER_SQUAD_ZHAIYQ,
  awaySquad: MATCH_CENTER_SQUAD_HAN_TENGRI,
};

const MATCH_CENTER_BY_MATCH_ID: Record<string, MatchCenterExtras> = {
  "m-2026-04-23-zhaiyq-han-tengri": {
    timeline: PAST_ZHAIYQ_VS_HAN_TENGRI_TIMELINE,
    stats: LIVE_MATCH_STATS,
    homeSquad: MATCH_CENTER_SQUAD_ZHAIYQ,
    awaySquad: MATCH_CENTER_SQUAD_HAN_TENGRI,
  },
};

function mockSquadLines(teamLabel: string): string[] {
  return Array.from({ length: 11 }, (_, i) => {
    const n = i + 1;
    const num = n < 10 ? ` ${n}` : `${n}`;
    return `${num}  Игрок ${n} (${teamLabel})`;
  });
}

export function getMatchCenterForMatch(m: Match): MatchCenterViewModel {
  const score = m.finalScore ?? { home: 0, away: 0 };
  const extras =
    MATCH_CENTER_BY_MATCH_ID[m.id] ?? {
      ...EMPTY_MATCH_CENTER_EXTRAS,
      homeSquad: mockSquadLines(m.home.shortName),
      awaySquad: mockSquadLines(m.away.shortName),
    };
  return {
    competition: m.competition,
    statusLabel: "ЗАВЕРШЁН",
    home: m.home,
    away: m.away,
    homeScore: score.home,
    awayScore: score.away,
    ...extras,
  };
}

export const NEWS_FEED: NewsFeedItem[] = [
  {
    id: "news-1",
    title: "Стадион готов к дерби: обновлённая трибуна «Север»",
    description:
      "Завершён монтаж козырьков и усилена подсветка — болельщики встретят май в комфорте и безопасности.",
    date: "22 апреля 2026",
    imageUrl:
      "https://images.unsplash.com/photo-1522778119023-f845f500b2d9?w=1200&q=80&auto=format&fit=crop",
    likesCount: 128,
    isLiked: false,
  },
  {
    id: "news-2",
    title: "Тренировка под открытым небом перед выездом в Тараз",
    description:
      "Команда отработала стандарты и прессинг; главный тренер отметил готовность к плотному календарю.",
    date: "20 апреля 2026",
    imageUrl:
      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=80&auto=format&fit=crop",
    likesCount: 94,
    isLiked: true,
  },
  {
    id: "news-3",
    title: "Академия: три выпускника получили приглашение в основу",
    description:
      "Юноши U-19 прошли сборы с первой командой и впервые выйдут на заявку в ближайшем туре.",
    date: "18 апреля 2026",
    imageUrl:
      "https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=1200&q=80&auto=format&fit=crop",
    likesCount: 210,
    isLiked: false,
  },
  {
    id: "news-4",
    title: "Фан-зона: конкурс автографов и розыгрыш футболок",
    description:
      "В субботу перед матчем — встреча с капитаном, музыка и розыгрыш двух домашних комплектов.",
    date: "15 апреля 2026",
    imageUrl:
      "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1200&q=80&auto=format&fit=crop",
    likesCount: 67,
    isLiked: false,
  },
];

/** Мок матчей вкладки «Календарь» на главной (карточки расписания / результата). */
export const HOME_CALENDAR_MATCHES: CalendarTabMatch[] = [
  {
    id: "cal-2026-05-10-zhaiyq-shakhter",
    date: "2026-05-10T17:00:00+05:00",
    kickoffAt: "2026-05-10T17:00:00+05:00",
    competition: "Первая лига",
    venue: "Орталық стадион, Атырау",
    homeTeam: TEAM_ZHAIYQ.shortName,
    awayTeam: TEAM_SHAKHTER_KARAGANDA.shortName,
    homeLogo: TEAM_ZHAIYQ.logoUrl,
    awayLogo: TEAM_SHAKHTER_KARAGANDA.logoUrl,
    home: { ...TEAM_ZHAIYQ, score: null },
    away: { ...TEAM_SHAKHTER_KARAGANDA, score: null },
    homeScore: null,
    awayScore: null,
    ticketUrl: "#",
    status: "upcoming",
  },
  {
    id: "cal-2026-05-03-turan-zhaiyq",
    date: "2026-05-03T16:00:00+05:00",
    kickoffAt: "2026-05-03T16:00:00+05:00",
    competition: "Первая лига",
    venue: "Стадион имени Куаныша Сатпаева, Туркестан",
    homeTeam: TEAM_TURAN.shortName,
    awayTeam: TEAM_ZHAIYQ.shortName,
    homeLogo: TEAM_TURAN.logoUrl,
    awayLogo: TEAM_ZHAIYQ.logoUrl,
    home: { ...TEAM_TURAN, score: null },
    away: { ...TEAM_ZHAIYQ, score: null },
    homeScore: null,
    awayScore: null,
    ticketUrl: "#",
    status: "upcoming",
  },
  {
    id: "m-2026-04-23-zhaiyq-han-tengri",
    date: "2026-04-23T18:00:00+05:00",
    kickoffAt: "2026-04-23T18:00:00+05:00",
    competition: "Первая лига",
    venue: "Орталық стадион, Атырау",
    homeTeam: TEAM_ZHAIYQ.shortName,
    awayTeam: TEAM_HAN_TENGRI.shortName,
    homeLogo: TEAM_ZHAIYQ.logoUrl,
    awayLogo: TEAM_HAN_TENGRI.logoUrl,
    home: { ...TEAM_ZHAIYQ, score: 0 },
    away: { ...TEAM_HAN_TENGRI, score: 1 },
    homeScore: 0,
    awayScore: 1,
    status: "finished",
    finalScore: { home: 0, away: 1 },
  },
  {
    id: "cal-2026-04-12-taraz-zhaiyq",
    date: "2026-04-12T15:30:00+05:00",
    kickoffAt: "2026-04-12T15:30:00+05:00",
    competition: "Первая лига",
    venue: "Стадион «Тараз», Тараз",
    homeTeam: TEAM_TARAZ.shortName,
    awayTeam: TEAM_ZHAIYQ.shortName,
    homeLogo: TEAM_TARAZ.logoUrl,
    awayLogo: TEAM_ZHAIYQ.logoUrl,
    home: { ...TEAM_TARAZ, score: 1 },
    away: { ...TEAM_ZHAIYQ, score: 2 },
    homeScore: 1,
    awayScore: 2,
    status: "finished",
    finalScore: { home: 1, away: 2 },
  },
];

export type StandingRow = {
  place: number;
  team: Team;
  played: number;
  points: number;
};

export const HOME_STANDINGS: StandingRow[] = [
  { place: 1, team: TEAM_SHAKHTER_KARAGANDA, played: 5, points: 12 },
  { place: 2, team: TEAM_TARAZ, played: 5, points: 11 },
  { place: 3, team: TEAM_ACADEMY_ONTYUSTIK, played: 5, points: 10 },
  { place: 4, team: TEAM_TURAN, played: 5, points: 10 },
  { place: 5, team: TEAM_ZHAIYQ, played: 5, points: 9 },
  { place: 6, team: TEAM_KAIRAT_ACADEMY, played: 5, points: 9 },
  { place: 7, team: TEAM_HAN_TENGRI, played: 5, points: 8 },
  { place: 8, team: TEAM_ALTAI, played: 5, points: 8 },
  { place: 9, team: TEAM_ZHENIS, played: 5, points: 7 },
  { place: 10, team: TEAM_EKIBASTUZ, played: 5, points: 7 },
  { place: 11, team: TEAM_ARYS, played: 5, points: 6 },
  { place: 12, team: TEAM_OKZHETPES, played: 5, points: 5 },
  { place: 13, team: TEAM_ULYTAU, played: 5, points: 4 },
  { place: 14, team: TEAM_KYZYLZHAR, played: 5, points: 3 },
];

export const PLAYERS: Player[] = [
  {
    id: "p-1",
    firstName: "Ерлан",
    lastName: "Ахметов",
    number: 1,
    position: "Вратарь",
    squad: "main",
    photoUrl: "/players/p1.png",
    birthDate: "14.08.1991",
    stats: { heightCm: 192, weightKg: 85, games: 28, goals: 0 },
    jerseyProductId: "jersey-home",
  },
  {
    id: "p-2",
    firstName: "Данияр",
    lastName: "Сагинтаев",
    number: 7,
    position: "Нападающий",
    squad: "main",
    photoUrl: "/players/p2.png",
    birthDate: "03.02.1996",
    stats: { heightCm: 181, weightKg: 76, games: 26, goals: 14 },
    jerseyProductId: "jersey-home",
  },
  {
    id: "p-3",
    firstName: "Марат",
    lastName: "Ибраев",
    number: 10,
    position: "Полузащитник",
    squad: "main",
    photoUrl: "/players/p3.png",
    birthDate: "19.11.1994",
    stats: { heightCm: 178, weightKg: 72, games: 27, goals: 9 },
    jerseyProductId: "jersey-away",
  },
  {
    id: "p-4",
    firstName: "Асылан",
    lastName: "Нурпеисов",
    number: 5,
    position: "Защитник",
    squad: "main",
    photoUrl: "/players/p4.png",
    birthDate: "22.04.1993",
    stats: { heightCm: 186, weightKg: 80, games: 25, goals: 2 },
    jerseyProductId: "jersey-home",
  },
  {
    id: "p-5",
    firstName: "Тимур",
    lastName: "Жанузаков",
    number: 22,
    position: "Полузащитник",
    squad: "main",
    photoUrl: "/players/p5.png",
    birthDate: "08.01.1998",
    stats: { heightCm: 175, weightKg: 70, games: 23, goals: 6 },
  },
  {
    id: "p-6",
    firstName: "Алишер",
    lastName: "Кенжебеков",
    number: 9,
    position: "Нападающий",
    squad: "main",
    photoUrl: "/players/p6.png",
    birthDate: "11.09.1995",
    stats: { heightCm: 183, weightKg: 78, games: 24, goals: 11 },
    jerseyProductId: "jersey-away",
  },
  {
    id: "p-a1",
    firstName: "Нурсултан",
    lastName: "Оспанов",
    number: 17,
    position: "Нападающий (U-19)",
    squad: "academy",
    photoUrl: "/players/a1.png",
    birthDate: "30.05.2006",
    stats: { heightCm: 176, weightKg: 68, games: 14, goals: 7 },
  },
  {
    id: "p-a2",
    firstName: "Арман",
    lastName: "Серик",
    number: 14,
    position: "Полузащитник (U-19)",
    squad: "academy",
    photoUrl: "/players/a2.png",
    birthDate: "12.12.2005",
    stats: { heightCm: 174, weightKg: 66, games: 15, goals: 3 },
  },
  {
    id: "p-a3",
    firstName: "Бекзат",
    lastName: "Турсунов",
    number: 3,
    position: "Защитник (U-17)",
    squad: "academy",
    photoUrl: "/players/a3.png",
    birthDate: "25.07.2008",
    stats: { heightCm: 179, weightKg: 70, games: 12, goals: 1 },
  },
  {
    id: "p-a4",
    firstName: "Ильяс",
    lastName: "Жумагалиев",
    number: 11,
    position: "Вингер (U-17)",
    squad: "academy",
    photoUrl: "/players/a4.png",
    birthDate: "01.03.2009",
    stats: { heightCm: 172, weightKg: 64, games: 13, goals: 5 },
  },
];

export const PRODUCTS: Product[] = [
  {
    id: "jersey-home",
    title: "Домашняя джерси 25/26",
    subtitle: "Basic fit",
    priceKzt: 24990,
    imageUrl: "/shop/jersey-home.png",
    category: "jersey",
  },
  {
    id: "jersey-away",
    title: "Гостевая джерси 25/26",
    subtitle: "Basic fit",
    priceKzt: 24990,
    imageUrl: "/shop/jersey-away.png",
    category: "jersey",
  },
  {
    id: "scarf-classic",
    title: "Шарф «Жайык»",
    subtitle: "Классика",
    priceKzt: 6990,
    imageUrl: "/shop/scarf.png",
    category: "merch",
  },
  {
    id: "cap-cyan",
    title: "Кепка Cyan",
    subtitle: "Adjustable",
    priceKzt: 8990,
    imageUrl: "/shop/cap.png",
    category: "accessory",
  },
  {
    id: "hoodie-navy",
    title: "Худи Navy",
    subtitle: "Oversize",
    priceKzt: 19990,
    imageUrl: "/shop/hoodie.png",
    category: "merch",
  },
  {
    id: "mug-logo",
    title: "Кружка с логотипом",
    priceKzt: 3490,
    imageUrl: "/shop/mug.png",
    category: "merch",
  },
];

export const CURRENT_USER: UserProfile = {
  id: "u-1",
  displayName: "Бекболат",
  avatarUrl: undefined,
  pushAwayMatches: true,
  followersCount: 128,
  followingCount: 64,
};

/** Соц. уведомления (колокольчик в профиле). */
export const NOTIFICATIONS: AppNotification[] = [
  {
    id: "n-1",
    text: "Ильяс подписался на вас",
    isNew: true,
    initial: "И",
    tone: "cyan",
    date: "24.04.2026",
  },
  {
    id: "n-2",
    text: "Алмат пригласил вас на матч Жайык — Кайрат",
    isNew: true,
    initial: "А",
    tone: "orange",
    date: "23.04.2026",
  },
  {
    id: "n-3",
    text: "Айдар прокомментировал ваше фото с трибуны",
    isNew: false,
    initial: "А",
    tone: "cyan",
    date: "22.04.2026",
  },
  {
    id: "n-4",
    text: "Система: билет на ближайший матч активен",
    isNew: false,
    initial: "Ж",
    tone: "orange",
    date: "25.04.2026",
  },
];

/** Друзья для экрана «Позвать друга». */
export const FRIENDS: SocialFriend[] = [
  {
    id: "f-1",
    name: "Алмат",
    avatarUrl: "/players/p2.png",
    isPro: true,
    rankLabel: "Легенда",
    followersCount: 842,
    clubMatchesAttended: 12,
  },
  {
    id: "f-2",
    name: "Ильяс",
    avatarUrl: "/players/a4.png",
    isPro: false,
    rankLabel: "Фанат",
    followersCount: 156,
    clubMatchesAttended: 3,
  },
  {
    id: "f-3",
    name: "Айнур",
    isPro: false,
    rankLabel: "Новичок",
    followersCount: 12,
    clubMatchesAttended: 1,
  },
  {
    id: "f-4",
    name: "Даурен",
    avatarUrl: "/players/p3.png",
    isPro: true,
    rankLabel: "Легенда",
    followersCount: 1204,
    clubMatchesAttended: 28,
  },
  {
    id: "f-5",
    name: "Сабина",
    avatarUrl: "/players/p6.png",
    isPro: false,
    rankLabel: "Фанат",
    followersCount: 90,
    clubMatchesAttended: 5,
  },
];

export const TICKETS: Ticket[] = [
  {
    id: "t-001",
    matchId: "m-2026-05-02-kairat-jastar",
    opponent: "Кайрат-Жастар",
    date: "2026-05-02T16:00:00+05:00",
    sector: "B",
    row: "12",
    seat: "34",
    qrPayload: "ZHAIYQ-TICKET-T001",
    status: "active",
    backgroundUrl:
      "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "t-002",
    matchId: "m-2026-04-10",
    opponent: "ФК Астана",
    date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    sector: "A",
    row: "5",
    seat: "12",
    qrPayload: "ZHAIYQ-TICKET-T002",
    status: "archived",
    backgroundUrl:
      "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80",
    finalScore: { home: 2, away: 1 },
    zhaiyqPlayedHome: false,
    goals: [
      { minute: 23, scorer: "Д. Сагинтаев", team: "home" },
      { minute: 54, scorer: "А. Кенжебеков", team: "home" },
      { minute: 78, scorer: "M. Tomasov", team: "away" },
    ],
  },
];
