import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Compass, Heart, MapPin, ShieldCheck, Users } from "lucide-react";

const priorities = [
  {
    number: "01",
    title: "Radical Transparency",
    description: "Every complaint is public. Every ward is scored. No black holes.",
  },
  {
    number: "02",
    title: "Citizen Privacy First",
    description: "No phone numbers stored. No location tracking. No harassment risk.",
  },
  {
    number: "03",
    title: "Zero Barriers",
    description: "No login, no OTP, no app download. Works on any browser, any smartphone.",
  },
  {
    number: "04",
    title: "Community Truth",
    description: "Neighbors verify each complaint. Fake closures collapse under public scrutiny.",
  },
  {
    number: "05",
    title: "Free & Open Forever",
    description:
      "Zero infrastructure cost. Scales to every Indian municipality without licensing fees.",
  },
];

const team = [
  { name: "Karwin S.C", id: "25BCE1682", role: "Frontend & Maps" },
  { name: "Adhavan", id: "25BCE1144", role: "Backend & Database" },
  { name: "Aryan Nama", id: "25MID1157", role: "Research & Strategy" },
  { name: "Arjith", id: "25BEC1209", role: "Design & UX" },
];

const nextSteps = [
  "AI duplicate detection (auto-cluster similar complaints)",
  "WhatsApp filing (for basic phones)",
  "Photo verification (geotagged before/after)",
  "Tamil language support",
  "All 125+ Tamil Nadu municipalities",
  "Open API for journalists and researchers",
];

export const Route = createFileRoute("/about")({
  component: About,
});

function About() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-primary">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <MapPin className="size-4" />
            </span>
            CivicLens
          </Link>
          <nav className="flex items-center gap-1 rounded-full border border-border bg-card p-1 text-sm">
            <Link
              to="/"
              className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Live map
            </Link>
            <Link
              to="/"
              hash="dashboard"
              className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Ward view
            </Link>
            <Link to="/about" className="rounded-full bg-primary/10 px-3 py-1.5 text-primary">
              About CivicLens
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="border-b border-border px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-accent uppercase">
              <Compass className="size-4" />
              Our mission
            </p>
            <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[0.98] font-bold tracking-tight text-primary sm:text-7xl">
              Every citizen deserves a mirror.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              CivicLens exists because complaints without visibility become complaints without
              consequences. We are four second-year students from VIT Chennai building the
              transparency layer India&apos;s cities never had.
            </p>
          </div>
        </section>

        <section className="border-b border-border px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              The problem
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-primary sm:text-4xl">
              The scale we&apos;re up against
            </h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["1 Crore+", "Chennai citizens with no public complaint visibility"],
                ["1.9 ★", "Namma Chennai app rating (iOS)"],
                ["96%", "Of Chennai does NOT use the official app"],
                ["₹2 lakh crore", "Spent on Smart Cities Mission with zero transparency"],
              ].map(([value, label]) => (
                <div key={value} className="rounded-xl border border-border bg-card p-5">
                  <p className="font-display text-3xl font-bold text-accent">{value}</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Our priorities
            </p>
            <div className="mt-8 divide-y divide-border border-y border-border">
              {priorities.map((priority) => (
                <article
                  key={priority.number}
                  className="grid gap-3 py-6 sm:grid-cols-[5rem_1fr] sm:gap-6 sm:py-8"
                >
                  <p className="font-display text-4xl font-bold text-accent">{priority.number}</p>
                  <div>
                    <h2 className="font-display text-2xl font-bold text-primary">
                      {priority.title}
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {priority.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-secondary/40 px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              <Users className="size-4" />
              The team
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {team.map((member) => (
                <div key={member.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Heart className="size-5" />
                  </div>
                  <h2 className="mt-5 font-display text-xl font-bold text-foreground">
                    {member.name}
                  </h2>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{member.id}</p>
                  <p className="mt-4 text-sm text-accent">{member.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                What&apos;s next
              </p>
              <h2 className="mt-3 max-w-md font-display text-3xl font-bold text-primary sm:text-4xl">
                This is v1. Here&apos;s what&apos;s coming.
              </h2>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {nextSteps.map((step) => (
                <li key={step} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                  {step}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-start gap-3 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            Built in the spirit of FixMyStreet UK (citizen-built in 2008, government-adopted in
            2013) and NYC 311 (saves $300M annually). India&apos;s turn.
          </p>
        </div>
        <div className="mx-auto mt-4 max-w-5xl">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-accent"
          >
            <ArrowLeft className="size-4" />
            Back to CivicLens
          </Link>
        </div>
      </footer>
    </div>
  );
}
