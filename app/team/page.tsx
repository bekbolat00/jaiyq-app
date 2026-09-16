"use client";

import { Fragment, useMemo, useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import SquadTabs from "../components/SquadTabs";
import TabEnterMotion from "../components/TabEnterMotion";
import PlayerCard from "../components/PlayerCard";
import PlayerDetailSheet from "../components/PlayerDetailSheet";
import PlayerProfileSheet from "../components/PlayerProfileSheet";
import TeamRosterGroups from "../components/TeamRosterGroups";
import { PLAYERS } from "@/lib/data/mock";
import type { Player, Squad } from "@/lib/types";
import type { RosterPlayer } from "@/lib/team/fetchTeamRoster";

export default function TeamPage() {
  const [squad, setSquad] = useState<Squad>("main");
  const [active, setActive] = useState<Player | null>(null);
  const [activeRoster, setActiveRoster] = useState<RosterPlayer | null>(null);

  const academyPlayers = useMemo(
    () => PLAYERS.filter((p) => p.squad === "academy"),
    [],
  );

  return (
    <Fragment>
      <TabEnterMotion className="flex flex-col gap-6">
        <ScreenHeader title="Команда" />

        <SquadTabs value={squad} onChange={setSquad} />

        {squad === "main" ? (
          <TeamRosterGroups onSelect={setActiveRoster} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {academyPlayers.map((p) => (
              <PlayerCard key={p.id} player={p} onClick={setActive} />
            ))}
          </div>
        )}
      </TabEnterMotion>

      <PlayerDetailSheet player={active} onClose={() => setActive(null)} />
      <PlayerProfileSheet player={activeRoster} onClose={() => setActiveRoster(null)} />
    </Fragment>
  );
}
