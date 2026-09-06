import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ThumbsUp,
  ImageOff,
  Link2,
  Check,
  Building2,
  SearchX,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import {
  getComplaintById,
  complaintPermalink,
  STATUS_COLOR,
  SLA_DAYS,
  daysOpen,
  daysToResolve,
  isSlaBreached,
  formatDay,
  type Complaint,
} from "@/data/civic";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { downloadComplaintPdf } from "@/lib/complaintPdf";

export const Route = createFileRoute("/complaint/$id")({
  head: () => ({
    meta: [
      { title: "Complaint record — CivicLens" },
      { name: "description", content: "Public record of a civic complaint in Chennai, with status, timeline and photo evidence." },
      { property: "og:title", content: "Complaint record — CivicLens" },
    ],
  }),
  component: ComplaintPage,
});

function Header() {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-primary">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MapPin className="size-4" />
          </span>
          CivicLens
        </Link>
        <nav className="flex items-center gap-1 rounded-full border border-border bg-card p-1 text-sm">
          <Link to="/" className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            Live map
          </Link>
          <Link to="/" hash="dashboard" className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            Ward view
          </Link>
          <Link to="/about" className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            About CivicLens
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Photo({ src, label }: { src?: string; label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">{label}</span>
      {src ? (
        <a href={src} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-border">
          <img src={src} alt={label} className="aspect-[4/3] w-full object-cover" />
        </a>
      ) : (
        <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
          <ImageOff className="size-5" />
          No photo on file
        </div>
      )}
    </div>
  );
}

function CopyLink({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const url = complaintPermalink(id);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied", { description: url });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.message("Copy this link", { description: url });
    }
  }
  return (
    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={copy}>
      {copied ? <Check className="mr-1.5 size-3.5 text-emerald-600" /> : <Link2 className="mr-1.5 size-3.5" />}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}

function ComplaintPage() {
  const { id } = Route.useParams();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [now, setNow] = useState(() => new Date());
  const [pdfBusy, setPdfBusy] = useState(false);

  async function handleDownloadPdf() {
    if (!complaint || pdfBusy) return;
    setPdfBusy(true);
    try {
      const name = await downloadComplaintPdf(complaint);
      toast.success("PDF downloaded", { description: name });
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Could not generate the PDF", { description: "Please try again." });
    } finally {
      setPdfBusy(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      const c = await getComplaintById(id);
      if (!alive) return;
      setComplaint(c);
      setState(c ? "ready" : "missing");
      setNow(new Date());
    })();
    return () => { alive = false; };
  }, [id]);

  // Live: keep a shared link honest if status/upvotes change while it's open
  useEffect(() => {
    const channel = supabase
      .channel(`complaint-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "complaints", filter: `id=eq.${id}` },
        async () => {
          const c = await getComplaintById(id);
          setComplaint(c);
          setState(c ? "ready" : "missing");
          setNow(new Date());
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        {state === "loading" && (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
            <span className="inline-block size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Loading complaint record…
          </div>
        )}

        {state === "missing" && (
          <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <SearchX className="mx-auto size-8 text-muted-foreground" />
            <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Complaint not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This record doesn&apos;t exist or the link is incomplete.
            </p>
            <Link to="/" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-accent">
              <ArrowLeft className="size-4" /> Back to the live map
            </Link>
          </div>
        )}

        {state === "ready" && complaint && (() => {
          const c = complaint;
          const resolved = c.status === "Resolved";
          const open = daysOpen(c, now);
          const fixedIn = daysToResolve(c);
          const breached = isSlaBreached(c, now);

          return (
            <article>
              <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-accent uppercase">
                <Building2 className="size-4" />
                Public complaint record
              </p>

              <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    {c.category}{c.subType ? <span className="normal-case tracking-normal"> · {c.subType}</span> : null}
                  </p>
                  <h1 className="mt-1 font-display text-3xl leading-tight font-bold text-primary sm:text-4xl">{c.title}</h1>
                </div>
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold text-white"
                  style={{ backgroundColor: STATUS_COLOR[c.status] }}
                >
                  {c.status}
                </span>
              </div>

              {c.description && (
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">{c.description}</p>
              )}

              {/* Facts grid */}
              <dl className="mt-8 grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
                <div>
                  <dt className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Location</dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {c.landmark ? <>{c.landmark}<br /></> : null}
                    <span className="text-muted-foreground">{c.area}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Raised</dt>
                  <dd className="mt-1 text-sm text-foreground">{formatDay(c.date)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {resolved ? "Resolved" : "Time open"}
                  </dt>
                  <dd className="mt-1 text-sm">
                    {resolved ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600">
                        <CheckCircle2 className="size-4" />
                        {c.resolvedAt ? formatDay(c.resolvedAt) : "Resolved"}
                        {fixedIn !== null ? ` · fixed in ${fixedIn} day${fixedIn === 1 ? "" : "s"}` : ""}
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 font-semibold ${breached ? "text-destructive" : "text-amber-600"}`}>
                        {breached ? <AlertTriangle className="size-4" /> : <Clock className="size-4" />}
                        {open} day{open === 1 ? "" : "s"}
                        {breached ? ` · exceeded ${SLA_DAYS}-day SLA` : ` · SLA window ${SLA_DAYS} days`}
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Community</dt>
                  <dd className="mt-1 inline-flex items-center gap-1.5 text-sm text-foreground">
                    <ThumbsUp className="size-4 text-primary" />
                    {c.upvotes} {c.upvotes === 1 ? "person" : "people"} flagged this
                    <span className="text-muted-foreground">· Citizen report</span>
                  </dd>
                </div>
              </dl>

              {/* Evidence */}
              <section className="mt-8">
                <h2 className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">Photo evidence</h2>
                <div className={`mt-3 grid gap-4 ${resolved ? "sm:grid-cols-2" : "max-w-md"}`}>
                  <Photo src={c.imageUrl} label={resolved ? "Before" : "Photo"} />
                  {resolved && <Photo src={c.fixImageUrl} label="After" />}
                </div>
              </section>

              {/* Actions */}
              <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-border pt-6">
                <Button size="sm" className="h-8 text-xs" onClick={handleDownloadPdf} disabled={pdfBusy}>
                  <Download className={`mr-1.5 size-3.5 ${pdfBusy ? "animate-bounce" : ""}`} />
                  {pdfBusy ? "Preparing PDF…" : "Download PDF"}
                </Button>
                <CopyLink id={c.id} />
                <Link to="/" hash="dashboard">
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <Building2 className="mr-1.5 size-3.5" /> Ward view
                  </Button>
                </Link>
                <Link to="/">
                  <Button variant="ghost" size="sm" className="h-8 text-xs">
                    <ArrowLeft className="mr-1.5 size-3.5" /> Live map
                  </Button>
                </Link>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">ref {c.id.slice(0, 8)}</span>
              </div>
            </article>
          );
        })()}
      </main>
    </div>
  );
}