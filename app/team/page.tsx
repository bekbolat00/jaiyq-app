"use client";

import { Fragment, useMemo, useState } from "react";
import ScreenHeader from "../components/ScreenHeader";
import SquadTabs from "../components/SquadTabs";
import TabEnterMotion from "../components/TabEnterMotion";
import PlayerCard from "../components/PlayerCard";
import PlayerDetailSheet from "../components/PlayerDetailSheet";
import { PLAYERS } from "@/lib/data/mock";
import type { Player, Squad } from "@/lib/types";

export default function TeamPage() {
  const [squad, setSquad] = useState<Squad>("main");
  const [active, setActive] = useState<Player | null>(null);

  const players = useMemo(
    () => PLAYERS.filter((p) => p.squad === squad),
    [squad],
  );

  return (
    <Fragment>
      <TabEnterMotion className="flex flex-col gap-5">
        <ScreenHeader
          eyebrow="Состав"
          title="Команда"
          subtitle="Игроки, статистика, футболки"
        />

        <SquadTabs value={squad} onChange={setSquad} />

        <div className="grid grid-cols-2 gap-x-3 gap-y-12">
          {players.map((p) => (
            <PlayerCard key={p.id} player={p} onClick={setActive} />
          ))}
        </div>
      </TabEnterMotion>

      <PlayerDetailSheet player={active} onClose={() => setActive(null)} />
    </Fragment>
  );
}
