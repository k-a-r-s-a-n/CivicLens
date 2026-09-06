import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Flag, HelpCircle, Inbox, MapPin, Navigation, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapSkeleton } from "@/components/civic/MapSkeleton";
import { Hero } from "@/components/civic/Hero";
import { WardDashboard } from "@/components/civic/WardDashboard";
import { ComplaintDialog } from "@/components/civic/ComplaintDialog";
import {
  CHENNAI_PLACES,
  STATUS_COLOR,
  CATEGORIES,
  getComplaints,
  submitComplaintToDb,
  upvoteComplaintInDb,
  rememberMyTicket,
  type Complaint,
  type Place,
} from "@/data/civic";
import { supabase } from "@/lib/supabaseClient";
import { preloadAppData } from "@/lib/appData";
import { isInsideGCC } from "@/lib/gccBoundary";
import { SplashScreen, useSplash } from "@/components/civic/SplashScreen";

const MapView = lazy(() => import("@/components/civic/MapView"));

// Auto-hide resolved pins from the map after 7 days.
// They still exist in the DB and still count toward Ward stats.
const RESOLVED_PIN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CivicLens — Radical Transparency for Indian Cities" },
      {
        name: "description",
        content:
          "Report and track civic complaints across Chennai on a public live map, and see how every ward actually performs.",
      },
      { property: "og:title", content: "CivicLens — Radical Transparency for Indian Cities" },
      {
        property: "og:description",
        content:
          "A public map of Chennai's potholes, garbage, drains and streetlights, plus ward-level performance scorecards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const splash = useSplash();
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"map" | "dashboard">("map");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [category, setCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<Place[]>([]);
  const [mapTarget, setMapTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pickMode, setPickMode] = useState(false);
  const [mapHovered, setMapHovered] = useState(false);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);

  // Mount Leaflet the moment the splash starts fading (pins are already in state),
  // or shortly after first paint if the splash was skipped this session.
  useEffect(() => {
    if (!mounted && (splash.exiting || !splash.mounted)) {
      const t = setTimeout(() => setMounted(true), splash.mounted ? 0 : 200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [splash.exiting, splash.mounted, mounted]);

  useEffect(() => {
    if (window.location.hash === "#dashboard") setView("dashboard");
  }, []);

  useEffect(() => {
    if (splash.mounted) return;
    if (window.location.hash === "#map") {
      window.setTimeout(
        () => document.getElementById("map")?.scrollIntoView({ behavior: "smooth" }),
        50,
      );
    }
  }, [splash.mounted]);

  useEffect(() => {
    const storedDeviceId = localStorage.getItem("civiclens_device_id") ?? crypto.randomUUID();
    localStorage.setItem("civiclens_device_id", storedDeviceId);
    setDeviceId(storedDeviceId);

    const storedUpvotes = JSON.parse(localStorage.getItem("civiclens_upvoted") ?? "{}") as Record<
      string,
      string[]
    >;
    const deviceUpvotes = storedUpvotes[storedDeviceId] ?? [];
    storedUpvotes[storedDeviceId] = deviceUpvotes;
    localStorage.setItem("civiclens_upvoted", JSON.stringify(storedUpvotes));
    setUpvotedIds(new Set(deviceUpvotes));
  }, []);

  // Load live complaints — shares the preload promise driving the splash
  useEffect(() => {
    let cancelled = false;
    preloadAppData().complaints.then((rows) => {
      if (!cancelled) setComplaints(rows); // always DB result, including []
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Realtime updates via Supabase
  useEffect(() => {
    const channel = supabase
      .channel("complaints-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "complaints" },
        async () => {
          const rows = await getComplaints();
          setComplaints(rows);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredComplaints = useMemo(
    () =>
      complaints.filter(
        (c) =>
          (category === "All" || c.category === category) &&
          (c.title + c.area + c.description).toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [category, complaints, searchQuery],
  );

  const mapComplaints = useMemo(() => {
    return filteredComplaints.filter((c) => {
      if (c.status !== "Resolved") return true;

      const raw = c.resolvedAt; // only resolve day — NOT c.date
      if (!raw) return true;

      const resolvedTime = new Date(
        typeof raw === "string" && raw.length <= 10 ? `${raw}T00:00:00` : raw,
      ).getTime();

      if (Number.isNaN(resolvedTime)) return true;
      return Date.now() - resolvedTime <= RESOLVED_PIN_LIFETIME_MS;
    });
  }, [filteredComplaints]);

  const heroStats = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const openIssues = complaints.filter((c) => c.status !== "Resolved").length;

    const resolvedThisMonth = complaints.filter((c) => {
      if (c.status !== "Resolved") return false;
      // Provide a fallback property if `resolvedAt` isn't strictly found in early schemas
      const raw = c.resolvedAt ?? (c as { resolved_at?: string }).resolved_at ?? c.date;
      const d = new Date(
        typeof raw === "string" && raw.length <= 10 ? `${raw}T00:00:00` : raw,
      );
      if (Number.isNaN(d.getTime())) return false;
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;

    const peopleParticipating =
      complaints.length + complaints.reduce((sum, c) => sum + (c.upvotes || 0), 0);

    return { openIssues, resolvedThisMonth, peopleParticipating };
  }, [complaints]);

  const counts = useMemo(
    () => ({
      Unresolved: filteredComplaints.filter((c) => c.status === "Unresolved").length,
      "In Progress": filteredComplaints.filter((c) => c.status === "In Progress").length,
      Resolved: filteredComplaints.filter((c) => c.status === "Resolved").length,
    }),
    [filteredComplaints],
  );

  function placesMatching(query: string) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return [];
    return CHENNAI_PLACES.filter(
      (place) =>
        isInsideGCC(place.lat, place.lng) &&
        [place.name, ...(place.aliases ?? [])].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        ),
    );
  }

  function selectPlace(place: Place) {
    setMapTarget({ lat: place.lat, lng: place.lng });
    setSearchQuery(place.name);
    setSearchSuggestions([]);
    toast.success(`Centered on ${place.name}`);
  }

  async function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || !searchQuery.trim()) return;
    event.preventDefault();
    const matchingPlaces = placesMatching(searchQuery);
    const exactMatch = matchingPlaces.find(
      (place) =>
        place.name.toLowerCase() === searchQuery.trim().toLowerCase() ||
        place.aliases?.some((alias) => alias.toLowerCase() === searchQuery.trim().toLowerCase()),
    );
    if (exactMatch) {
      selectPlace(exactMatch);
      return;
    }

    const firstMatch = matchingPlaces[0];
    if (firstMatch) {
      selectPlace(firstMatch);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(searchQuery.trim() + ", Chennai, Tamil Nadu, India")}`,
        { headers: { Accept: "application/json" } },
      );
      const results = (await response.json()) as Array<{ lat: string; lon: string }>;
      const result = results[0];
      if (result && !isInsideGCC(Number(result.lat), Number(result.lon))) {
        toast.error(`${searchQuery.trim()} is outside Greater Chennai Corporation limits`);
        return;
      }
      if (result) {
        setMapTarget({ lat: Number(result.lat), lng: Number(result.lon) });
        setSearchSuggestions([]);
        toast.success(`Centered on ${searchQuery.trim()}`);
      } else {
        toast.error("Place not found in Chennai");
      }
    } catch {
      toast.error("Place not found in Chennai");
    }
  }

  async function upvote(id: string) {
    if (upvotedIds.has(id)) {
      toast("You've already upvoted this issue");
      return;
    }
    if (!deviceId) {
      toast.error("Device not ready — try again");
      return;
    }

    // Optimistic UI
    setComplaints((prev) =>
      prev.map((c) => (c.id === id ? { ...c, upvotes: c.upvotes + 1 } : c)),
    );
    setUpvotedIds((prev) => {
      const next = new Set(prev).add(id);
      const storedUpvotes = JSON.parse(
        localStorage.getItem("civiclens_upvoted") ?? "{}",
      ) as Record<string, string[]>;
      storedUpvotes[deviceId] = Array.from(next);
      localStorage.setItem("civiclens_upvoted", JSON.stringify(storedUpvotes));
      return next;
    });

    const { error, duplicate } = await upvoteComplaintInDb(id, deviceId);
    if (duplicate) {
      toast("You've already upvoted this issue");
      return;
    }
    if (error) {
      toast.error("Upvote failed — saved locally only");
      return;
    }
    toast.success("Thanks for verifying!");
  }

  function handlePick(lat: number, lng: number) {
    if (!pickMode) return;
    if (!isInsideGCC(lat, lng)) {
      toast.error("Outside Chennai's 200 wards", {
        description: "CivicLens covers the Greater Chennai Corporation area only. Pick a spot inside the outlined boundary.",
      });
      return;
    }
    setPicked({ lat, lng });
    setPickMode(false);
    setDialogOpen(true);
    toast.success("Location set", { description: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
  }

  function openForm() {
    setView("map");
    setDialogOpen(true);
  }

  function goToMap() {
    setView("map");
    window.setTimeout(
      () => document.getElementById("map")?.scrollIntoView({ behavior: "smooth" }),
      0,
    );
  }

  async function submitComplaint(
    data: Omit<Complaint, "id" | "upvotes" | "date" | "status"> & { imageUrl?: string | undefined },
  ) {
    const { complaint, error } = await submitComplaintToDb(data);

    if (complaint) {
      rememberMyTicket(complaint.id);
      setComplaints((prev) => {
        if (prev.some((c) => c.id === complaint.id)) return prev;
        return [complaint, ...prev];
      });
      setDialogOpen(false);
      setPicked(null);
      toast.success("Complaint filed! Pin added to public map.");
      return;
    }

    // Fallback if offline / Supabase down
    const created: Complaint = {
      ...data,
      id: `c-${Date.now()}`,
      upvotes: 1,
      status: "Unresolved",
      date: new Date().toISOString().slice(0, 10),
    };
    rememberMyTicket(created.id);
    setComplaints((prev) => [created, ...prev]);
    setDialogOpen(false);
    setPicked(null);
    toast.success(
      error
        ? "Saved locally (DB unavailable) — pin still on map"
        : "Complaint filed! Pin added to public map.",
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SplashScreen state={splash} />
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary">
              <MapPin className="size-5 text-white" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-lg leading-none font-bold tracking-tight text-primary">
                CivicLens
              </p>
              <p className="mt-1 truncate text-[9px] font-medium tracking-wider text-muted-foreground uppercase">
                Radical Transparency for Indian Cities
              </p>
            </div>
          </div>
          <nav className="hidden items-center gap-1 rounded-full border border-border bg-card p-1 md:flex">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={
                view === "map"
                  ? "rounded-full bg-primary/10 px-4 text-primary"
                  : "rounded-full px-4"
              }
              onClick={goToMap}
            >
              Live map
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={
                view === "dashboard"
                  ? "rounded-full bg-primary/10 px-4 text-primary"
                  : "rounded-full px-4"
              }
              onClick={() => setView("dashboard")}
            >
              Ward view
            </Button>
            <Link
              to="/about"
              className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              About CivicLens
            </Link>
          </nav>
          <Button
            type="button"
            size="sm"
            className="justify-self-end rounded-full bg-accent px-4 text-accent-foreground hover:bg-accent/90"
            onClick={openForm}
          >
            <Flag className="size-4" />
            File an issue
          </Button>
        </div>
      </header>

      {view === "dashboard" ? (
        <main className="flex-1">
          <WardDashboard />
          <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
            <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <button type="button" onClick={goToMap} className="hover:text-foreground">
                Live map
              </button>
              <button
                type="button"
                onClick={() => setView("dashboard")}
                className="hover:text-foreground"
              >
                Ward view
              </button>
              <Link to="/about" className="hover:text-foreground">
                About CivicLens
              </Link>
            </nav>
            <p className="mt-3">
              CivicLens · Sample data for demonstration. No login, no tracking.
            </p>
          </footer>
        </main>
      ) : (
        <main className="flex-1">
          <Hero
            onExplore={() => document.getElementById("map")?.scrollIntoView({ behavior: "smooth" })}
            onReport={openForm}
            stats={heroStats}
          />

          <section id="map" className="border-y border-border bg-background">
            <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
              <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-primary uppercase">
                <Navigation className="size-3.5" />
                Chennai Civic Pulse
              </div>
              <h2 className="mt-2 font-display text-4xl leading-tight font-bold text-primary sm:text-5xl">
                The map remembers.
              </h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Every pin is a resident saying: this deserves attention.
              </p>

              <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-xs">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => {
                      const query = event.target.value;
                      setSearchQuery(query);
                      setSearchSuggestions(placesMatching(query).slice(0, 8));
                    }}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search a place or issue..."
                    className="pl-9"
                  />
                  {searchSuggestions.length > 0 ? (
                    <div className="absolute top-full right-0 left-0 z-[1100] mt-1 overflow-hidden rounded-lg border border-border bg-background shadow-lg">
                      {searchSuggestions.map((place) => (
                        <button
                          key={place.name}
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                          onClick={() => {
                            selectPlace(place);
                          }}
                        >
                          <MapPin className="size-3.5 text-primary" />
                          {place.name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {["All", ...CATEGORIES].map((item) => (
                    <Button
                      key={item}
                      type="button"
                      size="sm"
                      variant={category === item ? "default" : "outline"}
                      className="rounded-full px-3"
                      onClick={() => setCategory(item)}
                    >
                      {item}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <div
                    className="relative h-[70vh] min-h-[420px] w-full overflow-hidden rounded-xl border border-border sm:h-[78vh]"
                    onMouseEnter={() => setMapHovered(true)}
                    onMouseLeave={() => setMapHovered(false)}
                  >
                    {mounted ? (
                      <Suspense fallback={<MapSkeleton />}>
                        <MapView
                          complaints={mapComplaints}
                          onUpvote={upvote}
                          upvotedIds={upvotedIds}
                          mapTarget={mapTarget}
                          onPickLocation={pickMode ? handlePick : undefined}
                          draft={picked}
                        />
                      </Suspense>
                    ) : (
                      <MapSkeleton />
                    )}

                    {pickMode ? (
                      <div className="absolute inset-x-3 top-3 z-[1000] mx-auto flex w-fit items-center gap-3 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-lg">
                        <span>📍 Tap anywhere on the map to set your complaint location</span>
                        <button
                          type="button"
                          aria-label="Cancel placing complaint location"
                          className="rounded-full p-0.5 transition-colors hover:bg-primary-foreground/15"
                          onClick={() => {
                            setPickMode(false);
                            setPicked(null);
                          }}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ) : null}

                    {!pickMode &&
                      !dialogOpen &&
                      mapComplaints.length === 0 &&
                      !searchQuery.trim() ? (
                      <div className="pointer-events-none absolute inset-0 z-[900] flex items-center justify-center p-6">
                        <div className="pointer-events-auto max-w-xs rounded-xl border border-border bg-background/95 p-5 text-center shadow-lg backdrop-blur">
                          <Inbox className="mx-auto size-6 text-muted-foreground" />
                          <p className="mt-2 font-display text-sm font-semibold">
                            No complaints yet in this area
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Be the first to put an issue on the public record.
                          </p>
                          <Button size="sm" className="mt-3 w-full" onClick={openForm}>
                            File a complaint
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {!pickMode && mapHovered ? (
                      <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] rounded-full bg-background/95 px-3 py-2 text-[11px] font-medium text-foreground shadow-sm backdrop-blur">
                        Click anywhere to add an issue at that location.
                      </div>
                    ) : null}

                    {!pickMode &&
                      !dialogOpen &&
                      mapComplaints.length === 0 &&
                      searchQuery.trim() ? (
                      <div className="absolute top-4 right-4 z-[1000] max-w-[min(18rem,calc(100%-2rem))] rounded-lg border border-border bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur">
                        No matches for &apos;{searchQuery.trim()}&apos;. Try a different area or
                        category.
                      </div>
                    ) : null}

                    <Button
                      size="icon"
                      aria-label="File a complaint"
                      onClick={openForm}
                      className="absolute right-4 bottom-5 z-[1000] size-14 rounded-full shadow-xl transition-opacity"
                      style={{ opacity: pickMode ? 0.3 : 1 }}
                    >
                      <Plus className="size-6" />
                    </Button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                    <span className="font-semibold tracking-wider text-foreground uppercase">
                      Status
                    </span>
                    {(["Unresolved", "In Progress", "Resolved"] as const).map((status) => (
                      <span key={status} className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: STATUS_COLOR[status] }}
                        />
                        {status} · {counts[status]}
                      </span>
                    ))}
                  </div>
                </div>

                <aside className="flex flex-col rounded-xl border border-border bg-card p-6 lg:col-span-1">
                  <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <HelpCircle className="size-6" />
                  </span>
                  <h3 className="mt-5 font-display text-2xl font-bold text-foreground">
                    What are you noticing?
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    Select a pin to read a neighbour&apos;s report, or click the map to place your
                    own. Every useful detail helps a pattern become impossible to ignore.
                  </p>
                  <Button
                    className="mt-6 w-full bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={openForm}
                  >
                    File an issue
                  </Button>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    No account needed. Your report becomes part of the public record.
                  </p>
                </aside>
              </div>
            </div>
          </section>

          <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
            <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <button type="button" onClick={goToMap} className="hover:text-foreground">
                Live map
              </button>
              <button
                type="button"
                onClick={() => setView("dashboard")}
                className="hover:text-foreground"
              >
                Ward view
              </button>
              <Link to="/about" className="hover:text-foreground">
                About CivicLens
              </Link>
            </nav>
            <p className="mt-3">
              CivicLens · Sample data for demonstration. No login, no tracking.
            </p>
          </footer>
        </main>
      )}

      <ComplaintDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        picked={picked}
        onRequestPick={() => {
          setDialogOpen(false);
          setPickMode(true);
          document.getElementById("map")?.scrollIntoView({ behavior: "smooth" });
        }}
        onSubmit={submitComplaint}
      />
    </div>
  );
}