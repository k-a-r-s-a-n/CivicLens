import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, Lock, MapPin, Camera, Server } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: Privacy,
});

function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-primary">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="size-4" />
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
              to="/about"
              className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              About CivicLens
            </Link>
            <Link
              to="/privacy"
              className="rounded-full bg-primary/10 px-3 py-1.5 text-primary font-medium"
            >
              Privacy
            </Link>
          </nav>
        </div>
      </header>

      <main className="px-4 py-12 sm:px-6 sm:py-16">
        <section className="mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="size-3.5" />
            Zero-PII Notice
          </div>
          <h1 className="mt-3 mb-4 text-3xl font-bold text-primary font-display sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground sm:text-base">
            CivicLens is a citizen‑run transparency platform. Your privacy is protected by design. Below we outline what data we collect, how it is stored, and your rights.
          </p>

          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-primary">
                <Lock className="size-4 text-primary" /> What we collect
              </h2>
              <ul className="mt-3 list-disc pl-5 text-sm leading-relaxed text-muted-foreground space-y-1">
                <li><strong>Complaint details:</strong> title, description, category, and public location coordinates (lat/long).</li>
                <li><strong>Metadata:</strong> timestamps, ward/zone, status, and community verification count.</li>
                <li><strong>Photos:</strong> uploaded complaint proof photos are stored publicly to verify civic issues.</li>
                <li><strong>Zero Personal Data:</strong> No phone numbers, no email addresses, and no user accounts are required.</li>
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-primary">
                <Server className="size-4 text-primary" /> How we store data
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                All data is stored in Supabase (PostgreSQL) and public object storage. Images are stored in a publicly readable bucket (<code>complaint-photos</code>), allowing anyone to verify reports.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-primary">
                <MapPin className="size-4 text-primary" /> Upvote Anti-Tamper Token
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                A random device fingerprint is stored locally in your browser strictly to prevent duplicate upvotes on the same complaint. It is never linked to your identity or personal browsing history.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-xl font-semibold text-primary">Your rights & Content Removal</h2>
              <ul className="mt-3 list-disc pl-5 text-sm leading-relaxed text-muted-foreground space-y-1">
                <li>You can request the removal of any content you filed by reaching out to the student maintainers.</li>
                <li>All complaint data is public record; if you wish to keep an issue private, please do not submit it.</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-start gap-3 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            Built in the spirit of FixMyStreet UK (citizen‑built in 2008, government‑adopted in 2013) and NYC 311 (saves $300M annually). India&apos;s turn. This is an independent student project, not an official government service.
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