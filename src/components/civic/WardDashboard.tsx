import { useEffect, useState, useMemo, useRef, useCallback, Fragment } from "react";
import {
  Search,
  Building2,
  UserX,
  BarChart3,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Activity,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getWardsFromDb, wardStatus, type Ward } from "@/data/civic";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WardComplaintLog } from "@/components/civic/WardComplaintLog";
import { supabase } from "@/lib/supabaseClient";
import { peekPreloadedWards } from "@/lib/appData";

type HistoryPoint = { date: string; resolutionRate: number; open: number };

type EnhancedWard = Ward & {
  history: HistoryPoint[];
  hasTrend: boolean;
  idStr: string;
};

export function WardDashboard() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [search, setSearch] = useState("");
  const [selectedZone, setSelectedZone] = useState("All");
  const [isLoading, setIsLoading] = useState(true);

  // State
  const [trendWindow, setTrendWindow] = useState<"Daily" | "Weekly" | "Monthly">("Weekly");
  const [myWardId, setMyWardId] = useState<string | null>(() =>
    localStorage.getItem("civiclens:myWard"),
  );
  const [wardSearch, setWardSearch] = useState("");
  const [isWardSearchFocused, setIsWardSearchFocused] = useState(false);
  const [showDetailedChart, setShowDetailedChart] = useState(false);
  const [filterStalledOnly, setFilterStalledOnly] = useState(false);
  const [expandedWardId, setExpandedWardId] = useState<string | null>(null);
  const [showPinnedLog, setShowPinnedLog] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setExpandedWardId(null);
  }, [currentPage]);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadWards = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await getWardsFromDb();
      if (isMountedRef.current) {
        setWards(data || []);
        setLastSync(new Date());
      }
    } catch (err) {
      console.error("Failed to load wards from DB:", err);
      if (isMountedRef.current && !silent) setWards([]);
    } finally {
      if (isMountedRef.current && !silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = peekPreloadedWards();
    if (cached) {
      setWards(cached);
      setLastSync(new Date());
      setIsLoading(false);
      loadWards(true);
    } else {
      loadWards(false);
    }
  }, [loadWards]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel("ward-dashboard-complaints")
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints" }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          loadWards(true);
          setRefreshToken((t) => t + 1);
        }, 400);
      })
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [loadWards]);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  const enhancedWards: EnhancedWard[] = useMemo(() => {
    return wards.map((w) => {
      const history = w.history ?? [];
      return {
        ...w,
        history,
        hasTrend: history.length >= 2,
        idStr: String(w.id ?? w.name),
      };
    });
  }, [wards]);

  const windowDays = trendWindow === "Daily" ? 1 : trendWindow === "Weekly" ? 7 : 30;

  function pastRateOf(w: EnhancedWard): number {
    const current = w.resolutionRate ?? 0;
    if (!w.hasTrend) return current;
    return w.history[Math.max(0, w.history.length - 1 - windowDays)]?.resolutionRate ?? current;
  }

  function computeDelta(w: EnhancedWard): number {
    if (!w.hasTrend || w.resolutionRate === null) return 0;
    return w.resolutionRate - pastRateOf(w);
  }

  function isStalled(w: EnhancedWard): boolean {
    if (w.open <= 0) return false;
    const rate = w.resolutionRate ?? 0;
    if (w.hasTrend) return rate <= pastRateOf(w);
    return rate < 50;
  }

  const cityStats = useMemo(() => {
    if (!enhancedWards.length) {
      return { open: 0, resolved7d: 0, stalled: 0, breachRate: 0 };
    }

    let totalOpen = 0;
    let totalBreaches = 0;
    let stalled = 0;
    let deltaSum = 0;
    let deltaCount = 0;

    enhancedWards.forEach((w) => {
      totalOpen += w.open;
      totalBreaches += w.slaBreaches;

      if (w.hasTrend && w.resolutionRate !== null) {
        deltaSum += computeDelta(w);
        deltaCount += 1;
      }
      if (isStalled(w)) stalled += 1;
    });

    return {
      open: totalOpen,
      resolved7d: deltaCount > 0 ? Math.round(deltaSum / deltaCount) : 0,
      stalled,
      breachRate: totalOpen > 0 ? Math.round((totalBreaches / totalOpen) * 100) : 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enhancedWards, windowDays]);

  // Zone Aggregations for Tiles and Chart
  const zoneStats = useMemo(() => {
    if (!enhancedWards.length) return [];

    type ZoneBucket = {
      unresolved: number;
      totalRate: number;
      count: number;
      historyMap: Record<string, { sum: number; count: number }>;
      pastRateSum: number;
      hasRealHistory: boolean;
    };

    const map: Record<string, ZoneBucket> = {};

    enhancedWards.forEach((w) => {
      const zName = w.zone || "Zone";

      let bucket = map[zName];
      if (!bucket) {
        bucket = {
          unresolved: 0,
          totalRate: 0,
          count: 0,
          historyMap: {},
          pastRateSum: 0,
          hasRealHistory: false,
        };
        map[zName] = bucket;
      }

      if (w.hasTrend) {
        bucket.hasRealHistory = true;
      }

      bucket.unresolved += w.open;
      if (w.resolutionRate !== null) {
        bucket.totalRate += w.resolutionRate;
        bucket.pastRateSum += pastRateOf(w);
        bucket.count += 1;
      }

      w.history.forEach((h) => {
        let dayBucket = bucket.historyMap[h.date];
        if (!dayBucket) {
          dayBucket = { sum: 0, count: 0 };
          bucket.historyMap[h.date] = dayBucket;
        }
        dayBucket.sum += h.resolutionRate;
        dayBucket.count += 1;
      });
    });

    return Object.entries(map)
      .map(([zone, data]) => {
        const avgRate: number | null =
          data.count > 0 ? Math.round(data.totalRate / data.count) : null;
        const pastAvgRate = data.count > 0 ? Math.round(data.pastRateSum / data.count) : 0;

        const aggregatedHistory = data.hasRealHistory
          ? Object.keys(data.historyMap)
              .sort()
              .map((date) => {
                const dayEntry = data.historyMap[date];
                const avg = dayEntry ? Math.round(dayEntry.sum / (dayEntry.count || 1)) : 0;
                return { date, resolutionRate: avg };
              })
              .slice(-windowDays - 1)
          : [];

        return {
          zone,
          shortZone: zone.replace(/^Zone\s*/i, "Z").slice(0, 15),
          unresolved: data.unresolved,
          avgRate,
          delta: data.hasRealHistory && avgRate !== null ? avgRate - pastAvgRate : 0,
          hasRealHistory: data.hasRealHistory,
          history: aggregatedHistory,
        };
      })
      .sort((a, b) => {
        const numA = parseInt(a.zone.match(/\d+/)?.[0] || "0", 10);
        const numB = parseInt(b.zone.match(/\d+/)?.[0] || "0", 10);
        return numA - numB;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enhancedWards, windowDays]);

  const zonesList = useMemo(() => {
    const list = Array.from(new Set(enhancedWards.map((w) => w.zone || "GCC"))).filter(
      Boolean,
    ) as string[];
    list.sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || "0", 10);
      const numB = parseInt(b.match(/\d+/)?.[0] || "0", 10);
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
    return ["All", ...list];
  }, [enhancedWards]);

  const stalledWardsList = useMemo(() => {
    return enhancedWards
      .filter(isStalled)
      .sort((a, b) => b.open - a.open)
      .slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enhancedWards, windowDays]);

  const filteredWards = useMemo(() => {
    const q = search.toLowerCase();
    return enhancedWards.filter((w) => {
      const wardName = w.name ?? "";
      const councillor = w.councillor ?? "";
      const zoneName = w.zone ?? "";

      if (filterStalledOnly && !isStalled(w)) return false;

      const matchesZone = selectedZone === "All" || zoneName === selectedZone;
      const matchesSearch =
        wardName.toLowerCase().includes(q) ||
        councillor.toLowerCase().includes(q) ||
        zoneName.toLowerCase().includes(q);

      return matchesZone && matchesSearch;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enhancedWards, search, selectedZone, filterStalledOnly, windowDays]);

  const totalPages = Math.ceil(filteredWards.length / ITEMS_PER_PAGE);
  const paginatedWards = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredWards.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredWards, currentPage]);

  const heroSearchResults = useMemo(() => {
    if (!wardSearch.trim()) return [];
    const q = wardSearch.toLowerCase();
    return enhancedWards
      .filter((w) => w.name.toLowerCase().includes(q) || w.councillor.toLowerCase().includes(q))
      .slice(0, 5);
  }, [enhancedWards, wardSearch]);

  const pinnedWard = enhancedWards.find((w) => w.idStr === myWardId);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {/* Search-First Hero & Pinned Ward */}
      <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="w-full lg:w-1/2">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-primary uppercase">
            <Building2 className="size-4" /> City Dashboard
          </div>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Track your ward&apos;s progress
          </h2>
          <div className="relative mt-5 max-w-md">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search your ward, area, or councillor..."
              value={wardSearch}
              onChange={(e) => setWardSearch(e.target.value)}
              onFocus={() => setIsWardSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsWardSearchFocused(false), 200)}
              className="h-12 border-primary/20 pl-10 text-base shadow-sm focus:border-primary focus:ring-primary/20"
            />
            {isWardSearchFocused && heroSearchResults.length > 0 && (
              <div className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md">
                {heroSearchResults.map((w) => (
                  <button
                    key={w.idStr}
                    className="flex w-full flex-col px-4 py-2 text-left hover:bg-muted"
                    onClick={() => {
                      setMyWardId(w.idStr);
                      localStorage.setItem("civiclens:myWard", w.idStr);
                      setWardSearch("");
                    }}
                  >
                    <span className="font-semibold">{w.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {w.zone} • {w.councillor}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pinned Ward Card */}
        {pinnedWard && (
          <div className="w-full rounded-xl border border-primary/20 bg-primary/5 p-5 shadow-sm lg:w-2/5">
            <div className="flex items-start justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-primary uppercase">
                  <MapPin className="size-3" /> Your Pinned Ward
                </p>
                <h3 className="mt-1 font-display text-xl font-bold text-foreground">
                  {pinnedWard.name}
                </h3>
                <p className="text-xs text-muted-foreground">{pinnedWard.zone}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant={showPinnedLog ? "default" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => setShowPinnedLog((v) => !v)}
                >
                  {showPinnedLog ? "Hide complaints" : "View complaints"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => {
                    setMyWardId(null);
                    setShowPinnedLog(false);
                    localStorage.removeItem("civiclens:myWard");
                  }}
                >
                  Unpin
                </Button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 divide-x divide-primary/10 border-t border-primary/10 pt-4">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Open Issues</p>
                <p className="font-mono text-lg font-bold text-destructive">{pinnedWard.open}</p>
              </div>
              <div className="pl-4">
                <p className="text-[10px] uppercase text-muted-foreground">Resolution Rate</p>
                <div className="flex items-baseline gap-2">
                  <p
                    className={`font-mono text-lg font-bold ${pinnedWard.resolutionRate === null ? "text-muted-foreground" : "text-emerald-600"}`}
                  >
                    {pinnedWard.resolutionRate === null
                      ? "No activity"
                      : `${pinnedWard.resolutionRate}%`}
                  </p>
                  {pinnedWard.hasTrend && pinnedWard.resolutionRate !== null ? (
                    (() => {
                      const diff = computeDelta(pinnedWard);
                      return (
                        <span
                          className={`text-[10px] font-bold ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-destructive" : "text-muted-foreground"}`}
                        >
                          {diff > 0 ? "▲" : diff < 0 ? "▼" : "—"} {Math.abs(diff)}%
                        </span>
                      );
                    })()
                  ) : (
                    <span className="text-[10px] font-medium text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pinned ward — full complaint record */}
      {pinnedWard && showPinnedLog && Number.isFinite(Number(pinnedWard.id)) && (
        <div className="mb-10">
          <WardComplaintLog
            wardId={Number(pinnedWard.id)}
            wardName={pinnedWard.name}
            refreshToken={refreshToken}
          />
        </div>
      )}

      {/* City Pulse Strip */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            City Open Complaints
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-foreground">{cityStats.open}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Avg Improvement ({trendWindow})
          </p>
          <p className="mt-1 flex items-center gap-1 font-mono text-2xl font-bold text-emerald-600">
            {cityStats.resolved7d > 0 ? "+" : ""}
            {cityStats.resolved7d}%
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Stalled Wards
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-amber-600">{cityStats.stalled}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            SLA Breach Rate
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-destructive">
            {cityStats.breachRate}%
          </p>
        </div>
      </div>

      {/* Zone Trend Tiles */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-primary uppercase">
          <Activity className="size-4" /> Zone Performance Trends
        </div>
        <div className="flex items-center rounded-md border border-border bg-muted/30 p-1">
          {["Daily", "Weekly", "Monthly"].map((t) => (
            <button
              key={t}
              onClick={() => setTrendWindow(t as "Daily" | "Weekly" | "Monthly")}
              className={`rounded-sm px-3 py-1 text-[11px] font-medium transition-colors ${trendWindow === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {zoneStats.map((z) => (
          <button
            key={z.zone}
            onClick={() => {
              setSelectedZone((prev) => (prev === z.zone ? "All" : z.zone));
              setFilterStalledOnly(false);
              setCurrentPage(1);
              tableContainerRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
            className={`group flex flex-col justify-between rounded-lg border p-3 text-left transition-all hover:border-primary/50 hover:shadow-md ${selectedZone === z.zone ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border bg-card"}`}
          >
            <div className="flex w-full items-start justify-between">
              <p className="truncate text-[11px] font-bold text-foreground">{z.shortZone}</p>
              {z.hasRealHistory ? (
                <span
                  className={`text-[10px] font-bold ${z.delta > 0 ? "text-emerald-500" : z.delta < 0 ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {z.delta > 0 ? "▲" : z.delta < 0 ? "▼" : ""} {Math.abs(z.delta)}pts
                </span>
              ) : (
                <span className="text-[9px] font-medium text-muted-foreground">—</span>
              )}
            </div>
            <p className="font-mono text-xl font-bold text-foreground">
              {z.avgRate === null ? "—" : `${z.avgRate}%`}
            </p>
            <div className="mt-2 h-8 w-full opacity-80">
              {z.hasRealHistory && z.history.length >= 2 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={z.history}>
                    <YAxis domain={["dataMin - 5", "dataMax + 5"]} hide />
                    <Line
                      type="monotone"
                      dataKey="resolutionRate"
                      stroke={z.delta >= 0 ? "#10b981" : "#ef4444"}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded bg-muted/30 text-[9px] text-muted-foreground">
                  {z.avgRate === null ? "No activity yet" : "No trend yet"}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Collapsible Detailed Chart - HONEST DATA ONLY */}
      {!isLoading && zoneStats.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-card shadow-sm">
          <button
            onClick={() => setShowDetailedChart(!showDetailedChart)}
            className="flex w-full items-center justify-between p-4 text-xs font-semibold text-muted-foreground hover:bg-muted/30"
          >
            <span className="flex items-center gap-2">
              <BarChart3 className="size-4" /> VIEW DETAILED ZONE BREAKDOWN
            </span>
            {showDetailedChart ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>
          {showDetailedChart && (
            <div className="border-t border-border p-5 h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={zoneStats}
                  margin={{ top: 8, right: 8, left: -20, bottom: 8 }}
                  barCategoryGap="20%"
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                  <XAxis
                    dataKey="shortZone"
                    tick={{ fontSize: 10, fill: "#737373" }}
                    tickLine={false}
                    axisLine={{ stroke: "#e5e5e5" }}
                    interval={0}
                    angle={zoneStats.length > 8 ? -35 : 0}
                    textAnchor={zoneStats.length > 8 ? "end" : "middle"}
                    height={zoneStats.length > 8 ? 60 : 30}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#737373" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#f5f5f5" }}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(val: number, name: string) => {
                      if (name === "unresolved") return [val, "Open Issues"];
                      if (name === "avgRate") return [`${val}%`, "Avg Resolution Rate"];
                      return [val, name];
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                    formatter={(v) =>
                      v === "unresolved" ? "Open Issues" : v === "avgRate" ? "Avg Resolution %" : v
                    }
                  />
                  <Bar
                    dataKey="unresolved"
                    name="unresolved"
                    fill="#e11d48"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="avgRate"
                    name="avgRate"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Stalled Wards Callout */}
      {stalledWardsList.length > 0 && (
        <div className="mt-6 rounded-xl border border-destructive/20 bg-destructive/5 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-destructive uppercase">
              <AlertTriangle className="size-4" /> Attention Needed ({stalledWardsList.length}{" "}
              Wards)
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => {
                setFilterStalledOnly(!filterStalledOnly);
                setCurrentPage(1);
                tableContainerRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {filterStalledOnly ? "Show all wards" : "View all stalled"}
            </Button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {stalledWardsList.map((w) => (
              <button
                key={w.idStr}
                onClick={() => {
                  setSearch(w.name);
                  setFilterStalledOnly(false);
                  setCurrentPage(1);
                  setExpandedWardId(w.idStr);
                  tableContainerRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                className="rounded border border-destructive/10 bg-background/50 p-2 text-left transition-all hover:bg-destructive/10 hover:border-destructive/30"
              >
                <p className="truncate text-[11px] font-bold text-foreground">{w.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {w.open} open • rate {w.resolutionRate ?? 0}%
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ward Performance Table Header Actions */}
      <div
        ref={tableContainerRef}
        className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between scroll-mt-6"
      >
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Ward Rankings
            </h2>
            {filterStalledOnly && (
              <Badge variant="destructive" className="flex items-center gap-1 text-[10px]">
                Showing Stalled Wards Only
                <X className="size-3 cursor-pointer" onClick={() => setFilterStalledOnly(false)} />
              </Badge>
            )}
          </div>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            Full accountability log across 200 wards.
            {lastSync && (
              <span
                className="inline-flex items-center gap-1 text-[10px]"
                title="Updates automatically when any complaint changes"
              >
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                Live · synced{" "}
                {(() => {
                  void tick;
                  const s = Math.floor((Date.now() - lastSync.getTime()) / 1000);
                  return s < 10 ? "just now" : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`;
                })()}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter table..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 pl-9 text-xs"
            />
          </div>
          <select
            value={selectedZone}
            onChange={(e) => {
              setSelectedZone(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
          >
            {zonesList.map((z) => (
              <option key={z} value={z}>
                {z === "All" ? "All Zones" : z}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Paginated Table */}
      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs relative border-collapse min-w-[800px]">
            <thead className="border-b border-border bg-muted/60 font-mono text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="w-10 p-3.5" aria-label="Expand" />
                <th className="p-3.5">Rank</th>
                <th className="p-3.5">Ward & Zone</th>
                <th className="p-3.5">Councillor</th>
                <th className="p-3.5 text-center">Open</th>
                <th className="p-3.5">Progress</th>
                <th className="p-3.5 text-center whitespace-nowrap">Δ {trendWindow}</th>
                <th className="p-3.5 text-center w-24">Trend</th>
                <th className="p-3.5 text-center">SLA</th>
                <th className="p-3.5 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-muted-foreground">
                    <span className="inline-block size-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                    Fetching...
                  </td>
                </tr>
              ) : paginatedWards.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-muted-foreground">
                    No matches found.{" "}
                    {filterStalledOnly && (
                      <Button variant="link" size="sm" onClick={() => setFilterStalledOnly(false)}>
                        Clear filter
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedWards.map((w, index) => {
                  const hasTrend = w.hasTrend;
                  const rate = w.resolutionRate;
                  const delta = computeDelta(w);
                  const status = wardStatus(rate);
                  const isVacant = w.councillor === "Vacant" || !w.councillor;
                  const overallRank = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;

                  const numericId = Number(w.id);
                  const canExpand = Number.isFinite(numericId);
                  const isExpanded = expandedWardId === w.idStr;

                  return (
                    <Fragment key={w.idStr}>
                      <tr
                        className={`transition-colors hover:bg-muted/40 h-[64px] ${isExpanded ? "bg-primary/5" : ""}`}
                      >
                        <td className="p-2 text-center">
                          {canExpand && (
                            <button
                              type="button"
                              onClick={() => setExpandedWardId(isExpanded ? null : w.idStr)}
                              aria-expanded={isExpanded}
                              aria-label={
                                isExpanded
                                  ? `Hide complaints for ${w.name}`
                                  : `View complaints for ${w.name}`
                              }
                              title={isExpanded ? "Hide complaints" : "View complaints"}
                              className={`inline-flex size-7 items-center justify-center rounded-md border transition-colors ${
                                isExpanded
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                              }`}
                            >
                              {isExpanded ? (
                                <ChevronUp className="size-3.5" />
                              ) : (
                                <ChevronDown className="size-3.5" />
                              )}
                            </button>
                          )}
                        </td>
                        <td className="p-3.5 font-mono text-muted-foreground">
                          {String(overallRank).padStart(2, "0")}
                        </td>
                        <td className="p-3.5">
                          <p className="font-semibold text-foreground truncate max-w-[120px]">
                            {w.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{w.zone || "Zone"}</p>
                        </td>
                        <td className="p-3.5">
                          {isVacant ? (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-700">
                              <UserX className="size-3" /> Vacant
                            </span>
                          ) : (
                            <span className="font-medium truncate max-w-[100px] block">
                              {w.councillor}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-destructive">
                          {w.open}
                        </td>
                        <td className="p-3.5">
                          {rate === null ? (
                            <span className="text-[11px] text-muted-foreground">
                              No activity yet
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={`h-full ${rate >= 60 ? "bg-emerald-500" : rate >= 30 ? "bg-amber-500" : "bg-destructive"}`}
                                  style={{ width: `${Math.max(rate, 5)}%` }}
                                />
                              </div>
                              <span className="font-mono text-[11px] font-semibold">{rate}%</span>
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-mono">
                          {hasTrend && rate !== null ? (
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${delta > 0 ? "bg-emerald-500/10 text-emerald-600" : delta < 0 ? "bg-destructive/10 text-destructive" : "text-muted-foreground"}`}
                            >
                              {delta > 0 ? "▲" : delta < 0 ? "▼" : "—"} {Math.abs(delta)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center w-24">
                          {hasTrend ? (
                            <div className="h-6 w-full opacity-80">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={w.history.slice(-windowDays - 1)}>
                                  <YAxis domain={["dataMin", "dataMax"]} hide />
                                  <Line
                                    type="monotone"
                                    dataKey="resolutionRate"
                                    stroke={delta >= 0 ? "#10b981" : "#ef4444"}
                                    strokeWidth={1.5}
                                    dot={false}
                                    isAnimationActive={false}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-mono text-muted-foreground">
                          {w.slaBreaches}
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={
                              status.tone === "none"
                                ? "border-border bg-muted/40 text-muted-foreground"
                                : status.tone === "bad"
                                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                                  : status.tone === "mid"
                                    ? "border-amber-500/40 bg-amber-500/10 text-amber-600"
                                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                            }
                          >
                            {status.label}
                          </Badge>
                        </td>
                      </tr>
                      {isExpanded && canExpand && (
                        <tr className="bg-muted/10">
                          <td colSpan={10} className="p-3 sm:p-4">
                            <WardComplaintLog
                              wardId={numericId}
                              wardName={w.name}
                              refreshToken={refreshToken}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredWards.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 sm:px-6">
            <div className="hidden sm:block text-[11px] text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredWards.length)}
              </span>{" "}
              of <span className="font-medium text-foreground">{filteredWards.length}</span> wards
            </div>
            <div className="flex flex-1 justify-between sm:justify-end sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px]"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="mr-1 size-3" /> Previous
              </Button>
              <div className="flex items-center px-2 text-[11px] font-medium sm:hidden">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px]"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || totalPages === 0}
              >
                Next <ChevronRight className="ml-1 size-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
