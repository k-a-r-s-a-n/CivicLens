import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WardDashboard } from "@/components/civic/WardDashboard";

export const Route = createFileRoute("/ward/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Ward ${params.id} Performance — CivicLens` },
      {
        name: "description",
        content: `Detailed civic performance scorecard for Ward ${params.id} in Chennai.`,
      },
    ],
  }),
  component: WardDetailView,
});

function WardDetailView() {
  const { id } = Route.useParams();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
                <MapPin className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-lg leading-none font-bold tracking-tight text-primary">
                  CivicLens
                </p>
                <p className="mt-1 truncate text-[9px] font-medium tracking-wider text-muted-foreground uppercase">
                  Radical Transparency
                </p>
              </div>
            </Link>
          </div>
          <nav className="hidden items-center gap-1 rounded-full border border-border bg-card p-1 md:flex text-sm">
            <Link
              to="/"
              className="rounded-full px-4 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Live map
            </Link>
            <Link
              to="/ward"
              className="rounded-full bg-primary/10 px-4 py-1.5 text-primary font-medium"
            >
              Ward view
            </Link>
            <Link
              to="/about"
              className="rounded-full px-4 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              About
            </Link>
          </nav>
          <div className="justify-self-end">
             <Link to="/">
                <Button size="sm" className="rounded-full bg-accent px-4 text-accent-foreground hover:bg-accent/90">
                  <Flag className="size-4" />
                  File an issue
                </Button>
             </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <WardDashboard initialWardId={id} />
      </main>

      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link to="/" className="hover:text-foreground">
            Live map
          </Link>
          <Link to="/ward" className="hover:text-foreground">
            Ward view
          </Link>
          <Link to="/about" className="hover:text-foreground">
            About CivicLens
          </Link>
          <Link to="/privacy" className="hover:text-foreground">
            Privacy policy
          </Link>
        </nav>
        <p className="mt-3">
          CivicLens · Student-built prototype, not affiliated with GCC.
        </p>
      </footer>
    </div>
  );
}
