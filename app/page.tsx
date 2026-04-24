import TalentBanner from "./components/TalentBanner";
import NextMatchCard from "./components/NextMatchCard";
import ScreenHeader from "./components/ScreenHeader";
import { NEXT_MATCH } from "@/lib/data/mock";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader
        eyebrow="Матчи"
        title="Главная"
        subtitle="Все, что нужно знать перед следующей игрой"
      />

      <TalentBanner />

      <NextMatchCard match={NEXT_MATCH} />

      <section className="glass mt-1 rounded-3xl p-4">
        <h3 className="text-[13px] font-semibold uppercase tracking-widest text-muted">
          Новости клуба
        </h3>
        <ul className="mt-3 space-y-3">
          {[
            { t: "Открыта продажа абонементов на сезон 25/26", d: "2 дня назад" },
            { t: "Интервью с главным тренером", d: "5 дней назад" },
            { t: "Итоги прошедшего тура", d: "1 неделя назад" },
          ].map((n) => (
            <li
              key={n.t}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5"
            >
              <span className="text-[13px] text-foreground">{n.t}</span>
              <span className="text-[11px] text-muted">{n.d}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
