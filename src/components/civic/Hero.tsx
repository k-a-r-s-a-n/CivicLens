import { MapPinned, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";

type HeroStats = {
  openIssues: number;
  resolvedThisMonth: number;
  peopleParticipating: number;
};

export function Hero({
  onExplore,
  onReport,
  stats,
}: {
  onExplore: () => void;
  onReport: () => void;
  stats: HeroStats;
}) {
  const cards = [
    {
      label: "OPEN ISSUES",
      value: stats.openIssues.toLocaleString("en-IN"),
      detail: "across Chennai",
      valueClass: "text-red-600",
    },
    {
      label: "RESOLVED THIS MONTH",
      value: stats.resolvedThisMonth.toLocaleString("en-IN"),
      detail: "community verified",
      valueClass: "text-teal-700",
    },
    {
      label: "PEOPLE PARTICIPATING",
      value: stats.peopleParticipating.toLocaleString("en-IN"),
      detail: "upvotes + reports",
      valueClass: "text-accent",
    },
  ];

  return (
    <section className="border-b border-border bg-gradient-to-b from-accent/60 to-background">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <span className="inline-flex items-center gap-2 text-[11px] font-medium tracking-wider text-foreground uppercase">
          <span className="size-2 rounded-full bg-red-600" aria-hidden="true" />
          PUBLIC RECORD · UPDATED DAILY
        </span>
        <h1 className="mt-4 font-display text-4xl leading-[0.95] font-bold tracking-tight text-foreground sm:text-6xl">
          Chennai, unresolved.
          <br />
          <span className="text-accent">Now visible.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          CivicLens is a living record of the small things that shape a city. See what needs
          attention, add what you notice, and help your neighbourhood move forward.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button size="lg" onClick={onExplore} className="gap-2">
            <MapPinned className="size-4" />
            Explore the map
          </Button>
          <Button size="lg" variant="outline" onClick={onReport} className="gap-2">
            <Megaphone className="size-4" />
            Report an issue
          </Button>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {cards.map((f) => (
            <div key={f.label} className="border border-border bg-card p-4">
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground">
                {f.label}
              </p>
              <p className={`mt-2 font-display text-3xl font-bold ${f.valueClass}`}>{f.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{f.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}