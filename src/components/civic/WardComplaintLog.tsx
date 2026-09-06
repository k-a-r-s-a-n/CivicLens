import { useEffect, useMemo, useState } from "react";
import {
    CheckCircle2,
    Clock,
    ImageOff,
    RefreshCw,
    ThumbsUp,
    MapPin,
    AlertTriangle,
} from "lucide-react";
import {
    getComplaintsForWard,
    CATEGORY_TREE,
    STATUS_COLOR,
    SLA_DAYS,
    daysOpen,
    daysToResolve,
    isSlaBreached,
    formatDay,
    complaintPermalink,
    type Complaint,
    type ComplaintStatus,
} from "@/data/civic";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link2, Check } from "lucide-react";

type Props = {
    wardId: number;
    wardName: string;
    /** Bump this number from the parent to force a refetch (used by realtime in Step 5). */
    refreshToken?: number;
};

const PAGE_SIZE = 20;
const STATUS_OPTIONS: ("All" | ComplaintStatus)[] = ["All", "Unresolved", "In Progress", "Resolved"];
const CATEGORY_OPTIONS = ["All", ...Object.keys(CATEGORY_TREE)];

function relativeTime(from: Date, now: Date): string {
    const s = Math.max(0, Math.floor((now.getTime() - from.getTime()) / 1000));
    if (s < 10) return "just now";
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return `${h}h ago`;
}

function PhotoBox({ src, label }: { src?: string | undefined; label: string }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase">{label}</span>
            {src ? (
                <a href={src} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border border-border">
                    <img src={src} alt={label} loading="lazy" className="h-28 w-full object-cover transition-transform hover:scale-[1.02]" />
                </a>
            ) : (
                <div className="flex h-28 w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-muted/30 text-[10px] text-muted-foreground">
                    <ImageOff className="size-4" />
                    No photo on file
                </div>
            )}
        </div>
    );
}
function CopyLinkButton({ id }: { id: string }) {
    const [copied, setCopied] = useState(false);

    async function copy() {
        const url = complaintPermalink(id);
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success("Link copied", { description: url });
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard blocked (http / permissions) — show it so the user can copy manually
            toast.message("Copy this link", { description: url });
        }
    }

    return (
        <button
            type="button"
            onClick={copy}
            title="Copy shareable link"
            aria-label="Copy shareable link"
            className="inline-flex size-6 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
            {copied ? <Check className="size-3 text-emerald-600" /> : <Link2 className="size-3" />}
        </button>
    );
}
function ComplaintEntry({ c, now }: { c: Complaint; now: Date }) {
    const resolved = c.status === "Resolved";
    const open = daysOpen(c, now);
    const fixedIn = daysToResolve(c);
    const breached = isSlaBreached(c, now);

    return (
        <li className="rounded-lg border border-border bg-background p-3.5">
            {/* Header row */}
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                        {c.category}
                        {c.subType ? <span className="normal-case tracking-normal"> · {c.subType}</span> : null}
                    </p>
                    <h4 className="mt-0.5 text-sm font-semibold leading-snug text-foreground">{c.title}</h4>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    <CopyLinkButton id={c.id} />
                    <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                        style={{ backgroundColor: STATUS_COLOR[c.status] }}
                    >
                        {c.status}
                    </span>
                </div>
            </div>

            {c.description && (
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{c.description}</p>
            )}

            {/* Meta row */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                {c.landmark && (
                    <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" /> {c.landmark}
                    </span>
                )}
                <span>Raised {formatDay(c.date)}</span>

                {resolved ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                        <CheckCircle2 className="size-3" />
                        {c.resolvedAt ? `Resolved ${formatDay(c.resolvedAt)}` : "Resolved"}
                        {fixedIn !== null ? ` · fixed in ${fixedIn} day${fixedIn === 1 ? "" : "s"}` : ""}
                    </span>
                ) : (
                    <span
                        className={`inline-flex items-center gap-1 font-semibold ${breached ? "text-destructive" : "text-amber-600"}`}
                        title={breached ? `Exceeded the ${SLA_DAYS}-day SLA` : `SLA window: ${SLA_DAYS} days`}
                    >
                        {breached ? <AlertTriangle className="size-3" /> : <Clock className="size-3" />}
                        Open for {open} day{open === 1 ? "" : "s"}
                        {breached ? " · SLA breached" : ""}
                    </span>
                )}

                <span className="inline-flex items-center gap-1">
                    <ThumbsUp className="size-3" /> {c.upvotes} {c.upvotes === 1 ? "person" : "people"} flagged this
                </span>
                <span className="italic">Citizen report</span>
            </div>

            {/* Photo evidence */}
            {resolved ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <PhotoBox src={c.imageUrl} label="Before" />
                    <PhotoBox src={c.fixImageUrl} label="After" />
                </div>
            ) : c.imageUrl ? (
                <div className="mt-3 max-w-[50%]">
                    <PhotoBox src={c.imageUrl} label="Photo" />
                </div>
            ) : null}
        </li>
    );
}

export function WardComplaintLog({ wardId, wardName, refreshToken = 0 }: Props) {
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<"All" | ComplaintStatus>("All");
    const [categoryFilter, setCategoryFilter] = useState<string>("All");
    const [visible, setVisible] = useState(PAGE_SIZE);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [now, setNow] = useState(() => new Date());

    // Re-render every 30s so "Updated Xm ago" and "Open for N days" stay honest.
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30_000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        let alive = true;
        (async () => {
            setIsLoading(true);
            const rows = await getComplaintsForWard(wardId);
            if (!alive) return;
            setComplaints(rows);
            setLastUpdated(new Date());
            setNow(new Date());
            setIsLoading(false);
        })();
        return () => { alive = false; };
    }, [wardId, refreshToken]);

    // Reset paging when filters change
    useEffect(() => { setVisible(PAGE_SIZE); }, [statusFilter, categoryFilter, wardId]);

    const counts = useMemo(() => {
        const c = { All: complaints.length, Unresolved: 0, "In Progress": 0, Resolved: 0 } as Record<"All" | ComplaintStatus, number>;
        complaints.forEach((x) => { c[x.status] += 1; });
        return c;
    }, [complaints]);

    const filtered = useMemo(
        () =>
            complaints.filter(
                (c) =>
                    (statusFilter === "All" || c.status === statusFilter) &&
                    (categoryFilter === "All" || c.category === categoryFilter),
            ),
        [complaints, statusFilter, categoryFilter],
    );

    const shown = filtered.slice(0, visible);

    async function manualRefresh() {
        setIsLoading(true);
        const rows = await getComplaintsForWard(wardId);
        setComplaints(rows);
        setLastUpdated(new Date());
        setNow(new Date());
        setIsLoading(false);
    }

    return (
        <section className="rounded-xl border border-border bg-muted/20 p-4">
            {/* Title + freshness */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h3 className="text-sm font-bold text-foreground">Complaint record — {wardName}</h3>
                    <p className="text-[11px] text-muted-foreground">
                        {complaints.length} on record · {counts.Unresolved} unresolved · {counts["In Progress"]} in progress · {counts.Resolved} resolved
                    </p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    {lastUpdated && <span>Updated {relativeTime(lastUpdated, now)}</span>}
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={manualRefresh} disabled={isLoading} title="Refresh">
                        <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-1.5">
                    {STATUS_OPTIONS.map((s) => {
                        const active = statusFilter === s;
                        const color = s === "All" ? undefined : STATUS_COLOR[s];
                        return (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${active ? "border-foreground bg-foreground text-background" : "border-border bg-background text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                {color && <span className="size-2 rounded-full" style={{ backgroundColor: color }} />}
                                {s} <span className="opacity-70">{counts[s]}</span>
                            </button>
                        );
                    })}
                </div>
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-[11px] shadow-sm sm:w-56"
                >
                    {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c === "All" ? "All categories" : c}</option>
                    ))}
                </select>
            </div>

            {/* Body */}
            <div className="mt-3">
                {isLoading && complaints.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
                        <span className="inline-block size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Loading complaints…
                    </div>
                ) : complaints.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-background py-10 text-center text-xs text-muted-foreground">
                        No complaints on record for {wardName} yet.
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-background py-8 text-center text-xs text-muted-foreground">
                        No complaints match the current filters.{" "}
                        <button className="underline" onClick={() => { setStatusFilter("All"); setCategoryFilter("All"); }}>
                            Clear filters
                        </button>
                    </div>
                ) : (
                    <>
                        <ul className="space-y-2.5">
                            {shown.map((c) => <ComplaintEntry key={c.id} c={c} now={now} />)}
                        </ul>
                        {filtered.length > shown.length && (
                            <div className="mt-3 flex justify-center">
                                <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                                    Show more ({filtered.length - shown.length} remaining)
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}