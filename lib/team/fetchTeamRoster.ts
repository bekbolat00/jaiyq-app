import { supabase } from "@/lib/supabaseClient";
import { splitDbPlayerName } from "@/lib/matches/matchDetailFromDb";
import { isFieldLineRole } from "@/lib/matches/squadFromPlayerRows";
import type { DbPlayerRow } from "@/lib/types";

/** Строка `public.teams`: схема в проде отличается от `DbTeamRow` (только `name`, без `short_name`/`full_name`). */
type TeamNameRow = {
  id: string;
  name?: string | null;
  short_name?: string | null;
  full_name?: string | null;
  slug?: string | null;
};

export type RosterGroupId = "вр" | "зщ" | "пз" | "нп" | "staff";

export type RosterPlayer = {
  id: string;
  number: string;
  firstName: string;
  surname: string;
  position: string;
  photoUrl: string | null;
};

export type RosterGroup = {
  id: RosterGroupId;
  label: string;
  players: RosterPlayer[];
};

const GROUP_LABELS: Record<RosterGroupId, string> = {
  вр: "Вратари",
  зщ: "Защитники",
  пз: "Полузащитники",
  нп: "Нападающие",
  staff: "Тренерский штаб",
};

const GROUP_ORDER: RosterGroupId[] = ["вр", "зщ", "пз", "нп", "staff"];

function isCoachPosition(pos: string): boolean {
  return /тренер/i.test(pos.trim());
}

function isZhaiyqTeamRow(row: TeamNameRow): boolean {
  const label = [row.name, row.short_name, row.full_name, row.slug]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return label.includes("жай") || label.includes("zhaiyq");
}

function toRosterPlayer(p: DbPlayerRow): RosterPlayer {
  const raw = p.number ?? p.jersey_number;
  const { firstName, surname } = splitDbPlayerName(p);
  return {
    id: p.id,
    number: raw == null || Number.isNaN(Number(raw)) ? "—" : String(raw),
    firstName,
    surname,
    position: (p.position ?? "").trim(),
    photoUrl: p.photo_url?.trim() || null,
  };
}

function groupIdForPosition(pos: string): RosterGroupId {
  if (isCoachPosition(pos)) return "staff";
  const line = isFieldLineRole(pos);
  return line === "oth" ? "пз" : line;
}

function sortByNumberThenSurname(a: RosterPlayer, b: RosterPlayer): number {
  const na = Number(a.number);
  const nb = Number(b.number);
  const aNum = Number.isFinite(na);
  const bNum = Number.isFinite(nb);
  if (aNum && bNum) return na - nb;
  if (aNum) return -1;
  if (bNum) return 1;
  return a.surname.localeCompare(b.surname, "ru");
}

/**
 * Состав ФК «Жайык» из Supabase, сгруппированный по позициям
 * (вратари/защитники/полузащитники/нападающие/тренерский штаб).
 */
export async function fetchZhaiyqRosterGroups(): Promise<{
  groups: RosterGroup[];
  error: string | null;
}> {
  const { data: teams, error: teamsErr } = await supabase
    .from("teams")
    .select("*");
  if (teamsErr) return { groups: [], error: teamsErr.message };

  const zhaiyq = ((teams ?? []) as TeamNameRow[]).find(isZhaiyqTeamRow);
  if (!zhaiyq) {
    return { groups: [], error: "Команда «Жайык» не найдена в Supabase" };
  }

  const { data: players, error: playersErr } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", zhaiyq.id);
  if (playersErr) return { groups: [], error: playersErr.message };

  const buckets: Record<RosterGroupId, RosterPlayer[]> = {
    вр: [],
    зщ: [],
    пз: [],
    нп: [],
    staff: [],
  };
  for (const p of (players ?? []) as DbPlayerRow[]) {
    buckets[groupIdForPosition(p.position ?? "")].push(toRosterPlayer(p));
  }
  for (const id of GROUP_ORDER) {
    buckets[id].sort(sortByNumberThenSurname);
  }

  const groups = GROUP_ORDER.filter((id) => buckets[id].length > 0).map(
    (id) => ({ id, label: GROUP_LABELS[id], players: buckets[id] }),
  );

  return { groups, error: null };
}
