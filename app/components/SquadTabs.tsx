"use client";

import Tabs from "@/app/components/ui/Tabs";
import type { Squad } from "@/lib/types";

type Props = {
  value: Squad;
  onChange: (value: Squad) => void;
};

const OPTIONS: { id: Squad; label: string }[] = [
  { id: "main", label: "Основа" },
  { id: "academy", label: "Академия" },
];

export default function SquadTabs({ value, onChange }: Props) {
  return <Tabs tabs={OPTIONS} value={value} onChange={onChange} layoutId="squad-tabs" />;
}
