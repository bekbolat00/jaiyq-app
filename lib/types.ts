export type Squad = "main" | "academy";

export type Player = {
  id: string;
  firstName: string;
  lastName: string;
  number: number;
  position: string;
  squad: Squad;
  photoUrl: string;
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
  goals?: GoalEvent[];
};

export type UserProfile = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  pushAwayMatches: boolean;
};
