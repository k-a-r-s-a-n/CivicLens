import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";

// @ts-ignore
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

      <main className="px-4 py-16 sm:px-6 sm:py-24">
        <section className="mx-auto max-w-3xl">
          <h1 className="mb-6 text-3xl font-bold text-primary">Privacy Policy</h1>
          <p className="mb-4 text-muted-foreground">
            CivicLens is a citizen‑run transparency platform. Your privacy is important to us. Below we outline what data we collect, how it is stored, and your rights.
          </p>
          <h2 className="mt-6 text-2xl font-semibold text-primary">What we collect</h2>
          <ul className="list-disc pl-6 text-muted-foreground">
            <li>Complaint details: title, description, category, location (lat/lng), photos (optional).</li>
            <li>Metadata: timestamps, ward/zone, status, up‑vote count.</li>
            <li>Optional identifiers you provide (e.g., name, fingerprint for up‑vote tracking).</li>
          </ul>
          <h2 className="mt-6 text-2xl font-semibold text-primary">How we store data</h2>
          <p className="text-muted-foreground">
            All data is stored in Supabase (PostgreSQL) and public object storage. Images are stored in a publicly readable bucket, which allows anyone to view them via their URL. No phone numbers, email addresses, or other personally identifiable information are required.
          </p>
          <h2 className="mt-6 text-2xl font-semibold text-primary">Your rights</h2>
          <ul className="list-disc pl-6 text-muted-foreground">
            <li>You may delete your own complaint via the app – this removes the row from the database and the photos from storage.</li>
            <li>You can request the removal of any content you own by contacting the project maintainers.</li>
            <li>All data is openly accessible; if you wish to keep a complaint private, simply do not submit it.</li>
          </ul>
          <h2 className="mt-6 text-2xl font-semibold text-primary">Security</h2>
          <p className="text-muted-foreground">
            Uploaded images are served over HTTPS. The Supabase bucket enforces CORS headers so images can be embedded safely. We do not store any authentication tokens client‑side beyond a temporary fingerprint for up‑votes.
          </p>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-start gap-3 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            Built in the spirit of FixMyStreet UK (citizen‑built in 2008, government‑adopted in 2013) and NYC 311 (saves $300M annually). India&apos;s turn. This is an independent student project, not an official government service.
          </p>
        </div>
        <div className="mx-auto mt-4 max-w-5xl flex gap-4">
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
