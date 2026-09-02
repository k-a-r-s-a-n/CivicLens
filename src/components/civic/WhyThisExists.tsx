import { MapPinned, Megaphone, ShieldCheck, Sparkles } from "lucide-react";

const reasons = [
  {
    icon: MapPinned,
    title: "See the pattern",
    description: "One pin is a problem. A map is a signal.",
  },
  {
    icon: Megaphone,
    title: "Add your voice",
    description: "File an issue in under a minute, right where you saw it.",
  },
  {
    icon: ShieldCheck,
    title: "Keep it public",
    description: "A shared record creates a little more accountability.",
  },
];

export function WhyThisExists() {
  return (
    <section id="about" className="w-full px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto grid max-w-5xl gap-10 rounded-3xl bg-primary p-8 sm:p-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-yellow-600/80 uppercase">
            <Sparkles className="size-4" />
            Why this exists
          </div>
          <h2 className="mt-4 font-display text-3xl leading-tight font-bold text-primary-foreground sm:text-4xl">
            A better city starts with a shared picture.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-primary-foreground/75 sm:text-base">
            CivicLens makes neighbourhood problems visible without making residents navigate a maze.
            Public data, plain language, and a small nudge from one another.
          </p>
        </div>

        <div className="space-y-6">
          {reasons.map((reason) => (
            <div key={reason.title} className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-yellow-600/15 text-yellow-600/80">
                <reason.icon className="size-5" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-primary-foreground">
                  {reason.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-primary-foreground/70">
                  {reason.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
