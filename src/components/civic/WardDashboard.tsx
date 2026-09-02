import { useEffect, useState, useMemo } from "react";
import { Search, Building2, UserX, BarChart3 } from "lucide-react";
import { getWardsFromDb, wardStatus, type Ward } from "@/data/civic";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function WardDashboard() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [search, setSearch] = useState("");
  const [selectedZone, setSelectedZone] = useState("All");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadWards() {
      setIsLoading(true);
      const data = await getWardsFromDb();
      setWards(data);
      setIsLoading(false);
    }
    loadWards();
  }, []);

  // Compute aggregate stats per zone for the chart
  const zoneStats = useMemo(() => {
    const map: Record<string, { totalOpen: number; totalRate: number; count: number }> = {};

    wards.forEach((w) => {
      const zName = (w as any).zone || "Zone";
      if (!map[zName]) {
        map[zName] = { totalOpen: 0, totalRate: 0, count: 0 };
      }
      map[zName].totalOpen += w.open;
      map[zName].totalRate += w.resolutionRate;
      map[zName].count += 1;
    });

    return Object.entries(map).map(([zone, data]) => ({
      zone,
      avgRate: Math.round(data.totalRate / data.count),
      totalOpen: data.totalOpen,
    })).sort((a, b) => a.avgRate - b.avgRate);
  }, [wards]);

  // Extract unique zones for filtering
  const zonesList = useMemo(() => {
    const list = Array.from(
      new Set(wards.map((w) => (w as any).zone || "GCC"))
    );
    return ["All", ...list.sort()];
  }, [wards]);

  // Filter wards by search query & selected zone
  const filteredWards = useMemo(() => {
    return wards.filter((w) => {
      const zoneName = (w as any).zone || "";
      const matchesZone = selectedZone === "All" || zoneName === selectedZone;
      const matchesSearch =
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.councillor.toLowerCase().includes(search.toLowerCase()) ||
        zoneName.toLowerCase().includes(search.toLowerCase());

      return matchesZone && matchesSearch;
    });
  }, [wards, search, selectedZone]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-primary uppercase">
            <Building2 className="size-4" />
            {wards.length || 200} GCC WARDS TRACKED
          </div>
          <h2 className="mt-1 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Where the backlog is heaviest
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Live municipal accountability scorecards across Chennai&apos;s 15 administrative zones.
          </p>
        </div>

        {/* Search & Zone Dropdown */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search ward, zone or councillor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {zonesList.map((z) => (
              <option key={z} value={z}>
                {z === "All" ? "All 15 Zones" : z}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Visual Zone Resolution Rate Bar Graph */}
      {!isLoading && zoneStats.length > 0 && (
        <div className="mt-8 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-primary uppercase">
            <BarChart3 className="size-4" />
            Zonal Resolution Performance Graph
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Average resolution rate by administrative zone (lowest to highest)
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {zoneStats.map((item) => (
              <div
                key={item.zone}
                className="flex flex-col justify-between rounded-lg border border-border/60 bg-muted/30 p-3"
              >
                <div>
                  <p className="truncate text-[11px] font-semibold text-foreground">
                    {item.zone.replace("Zone ", "Z")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.totalOpen} open issues
                  </p>
                </div>

                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono font-semibold">
                    <span>Rate</span>
                    <span className={item.avgRate >= 60 ? "text-emerald-600" : item.avgRate >= 30 ? "text-amber-600" : "text-destructive"}>
                      {item.avgRate}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full transition-all duration-500 ${item.avgRate >= 60
                          ? "bg-emerald-500"
                          : item.avgRate >= 30
                            ? "bg-amber-500"
                            : "bg-destructive"
                        }`}
                      style={{ width: `${Math.max(item.avgRate, 5)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ward Performance Table */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-muted/60 font-mono text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="p-3.5">Rank</th>
              <th className="p-3.5">Ward & Zone</th>
              <th className="p-3.5">Elected Councillor</th>
              <th className="p-3.5 text-center">Open Issues</th>
              <th className="p-3.5">Resolution Progress</th>
              <th className="p-3.5 text-center">SLA Breaches</th>
              <th className="p-3.5 text-right">Audit Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Fetching 200 Chennai Wards from Supabase...
                  </div>
                </td>
              </tr>
            ) : filteredWards.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-muted-foreground">
                  No wards found matching &quot;{search}&quot;
                </td>
              </tr>
            ) : (
              filteredWards.map((w, index) => {
                const status = wardStatus(w.resolutionRate);
                const zoneName = (w as any).zone || "Zone";
                const isVacant = w.councillor === "Vacant";

                return (
                  <tr key={w.id || w.name} className="transition-colors hover:bg-muted/40">
                    <td className="p-3.5 font-mono text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </td>

                    <td className="p-3.5">
                      <p className="font-semibold text-foreground">{w.name}</p>
                      <p className="text-[10px] text-muted-foreground">{zoneName}</p>
                    </td>

                    <td className="p-3.5">
                      {isVacant ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                          <UserX className="size-3" /> Vacant Seat
                        </span>
                      ) : (
                        <span className="font-medium text-foreground">{w.councillor}</span>
                      )}
                    </td>

                    <td className="p-3.5 text-center">
                      <span
                        className={`font-mono font-bold ${w.open > 0 ? "text-destructive" : "text-emerald-600"
                          }`}
                      >
                        {w.open}
                      </span>
                    </td>

                    {/* Progress Bar Graph */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 w-28 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full transition-all duration-500 ${w.resolutionRate >= 60
                                ? "bg-emerald-500"
                                : w.resolutionRate >= 30
                                  ? "bg-amber-500"
                                  : "bg-destructive"
                              }`}
                            style={{ width: `${Math.max(w.resolutionRate, 4)}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {w.resolutionRate}%
                        </span>
                      </div>
                    </td>

                    <td className="p-3.5 text-center font-mono font-medium text-muted-foreground">
                      {w.slaBreaches}
                    </td>

                    <td className="p-3.5 text-right">
                      <Badge
                        variant="outline"
                        className={
                          status.tone === "bad"
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}