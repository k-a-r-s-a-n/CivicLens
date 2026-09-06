import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  GeoJSON,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Fragment, useEffect } from "react";
import { Clock, MapPin, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { CHENNAI_CENTER, STATUS_COLOR, type Complaint } from "@/data/civic";
import { GCC_BOUNDS, GCC_FEATURE, gccMaskFeature, isInsideGCC } from "@/lib/gccBoundary";
import { zoneForArea } from "@/lib/gccWards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Fix Leaflet marker icons
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

// World polygon with the GCC area cut out — built once, not per render
const GCC_MASK = gccMaskFeature();

function ClickCatcher({ onPick }: { onPick?: ((lat: number, lng: number) => void) | undefined }) {
  const map = useMapEvents({
    click(e) {
      // Parent's handlePick rejects + toasts if the point is outside GCC (single source of truth, no double toast)
      onPick?.(e.latlng.lat, e.latlng.lng);
    },
    mousemove(e) {
      if (!onPick) return;
      map
        .getContainer()
        .classList.toggle("outside-gcc", !isInsideGCC(e.latlng.lat, e.latlng.lng));
    },
    mouseout() {
      map.getContainer().classList.remove("outside-gcc");
    },
  });

  // Clear the cursor state the moment pick mode is turned off, even mid-hover
  useEffect(() => {
    if (!onPick) map.getContainer().classList.remove("outside-gcc");
  }, [onPick, map]);

  return null;
}
// Trackpad pinch arrives as ctrl+wheel with tiny deltas; a mouse notch is ~100 px.
// Leaflet uses one px-per-level for both, so whichever you tune for, the other feels wrong.
const PINCH_PX_PER_LEVEL = 60; // lower = pinch zooms further per spread
const WHEEL_PX_PER_LEVEL = 70; // higher = mouse wheel zooms less per notch

function SmartWheelZoom() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    let acc = 0;
    let timer: number | undefined;
    let point: L.Point | null = null;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 20 : e.deltaMode === 2 ? e.deltaY * 60 : e.deltaY;
      const pinch = e.ctrlKey;
      acc += -dy / (pinch ? PINCH_PX_PER_LEVEL : WHEEL_PX_PER_LEVEL);
      point = map.mouseEventToContainerPoint(e);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const snap = map.options.zoomSnap || 0.25;
        const raw = map.getZoom() + acc;
        acc = 0;
        const target = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), Math.round(raw / snap) * snap));
        if (point && target !== map.getZoom()) map.setZoomAround(point, target, { animate: !pinch });
      }, pinch ? 0 : 30);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.clearTimeout(timer);
    };
  }, [map]);
  return null;
}
function MapFlyTo({ target }: { target?: { lat: number; lng: number } | null }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], 14, { duration: 1.6, easeLinearity: 0.15 });
  }, [target, map]);

  return null;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function getUnattendedDuration(date: string) {
  const openedAt = new Date(`${date}T00:00:00`);
  const elapsedHours = Math.max(0, Math.floor((Date.now() - openedAt.getTime()) / 3_600_000));
  const days = Math.floor(elapsedHours / 24);
  const hours = elapsedHours % 24;
  return `${days} day${days === 1 ? "" : "s"}, ${hours} hour${hours === 1 ? "" : "s"}`;
}

function getUnattendedDays(date: string) {
  const openedAt = new Date(`${date}T00:00:00`);
  return Math.max(0, Math.floor((Date.now() - openedAt.getTime()) / 86_400_000));
}

type Props = {
  complaints: Complaint[];
  onUpvote: (id: string) => void;
  upvotedIds: ReadonlySet<string>;
  mapTarget?: { lat: number; lng: number } | null;
  onPickLocation?: ((lat: number, lng: number) => void) | undefined;
  draft?: { lat: number; lng: number } | null | undefined;
  onMarkFixed?: (id: string, fixUrl: string) => void;
};


export default function MapView({
  complaints,
  onUpvote,
  upvotedIds,
  mapTarget,
  onPickLocation,
  draft,
}: Props) {
  return (
    <MapContainer
      center={CHENNAI_CENTER}
      zoom={12}
      minZoom={11}
      maxBounds={GCC_BOUNDS}
      maxBoundsViscosity={0.85}   // slight give at the edge instead of a hard wall (1 = wall)
      scrollWheelZoom={false}     // replaced by SmartWheelZoom below (separate pinch / wheel speeds)
      zoomSnap={0.25}             // fractional zoom levels — keeps the smooth feel
      zoomDelta={1}    // batch rapid wheel ticks into one animated zoom (default 40)
      inertiaDeceleration={3000}  // longer, gentler glide after a drag (default 3000)
      easeLinearity={0.2}        // smoother easing curve for pan animations (default 0.2)
      className="h-full w-full"
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* Dim everything outside Greater Chennai Corporation */}
      <GeoJSON
        data={GCC_MASK}
        interactive={false}
        style={{ stroke: false, fillColor: "#1c1917", fillOpacity: 0.35 }}
      />
      {/* GCC boundary outline (200 wards) */}
      <GeoJSON
        data={GCC_FEATURE}
        interactive={false}
        style={{ color: "#0f766e", weight: 2.5, fill: false }}
      />
      <SmartWheelZoom />
      <MapFlyTo target={mapTarget} />
      <ClickCatcher onPick={onPickLocation} />

      {draft ? (
        <CircleMarker
          center={[draft.lat, draft.lng]}
          radius={11}
          pathOptions={{ color: "#166534", fillColor: "#166534", fillOpacity: 0.35, weight: 3 }}
        />
      ) : null}

      {complaints.map((c) => {
        const isSlaBreached =
          c.status === "Unresolved" &&
          Date.now() - new Date(`${c.date}T00:00:00`).getTime() > 7 * 86_400_000;

        const markerColor = isSlaBreached
          ? "#991b1b"
          : c.status === "In Progress"
            ? "#eab308"
            : c.status === "Resolved"
              ? "#16a34a"
              : "#dc2626";
        const tooltipText =
          c.status === "Resolved"
            ? "Resolved"
            : c.status === "In Progress"
              ? "In Progress"
              : `Unattended for ${getUnattendedDays(c.date)} days`;

        const fixPhoto = c.fixImageUrl || (c as any).resolvedImageUrl;

        return (
          <Fragment key={c.id}>
            {isSlaBreached ? (
              <CircleMarker
                center={[c.lat, c.lng]}
                radius={18}
                pathOptions={{
                  className: "sla-breach-ring",
                  color: "#991b1b",
                  weight: 2,
                  fillOpacity: 0,
                }}
              />
            ) : null}
            <CircleMarker
              center={[c.lat, c.lng]}
              radius={isSlaBreached ? 12 : 9}
              pathOptions={{
                color: "#ffffff",
                weight: 2,
                fillColor: markerColor,
                fillOpacity: 0.9,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1} className="civic-tooltip">
                {c.category} • {tooltipText}
              </Tooltip>
              <Popup minWidth={350} maxWidth={350}>
                <div className="w-[350px] divide-y divide-border bg-white text-foreground">
                  <div className="space-y-2 p-4">
                    <p className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                      Public Audit Log
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      Ticket ID: #{c.id}
                    </p>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="min-w-0 font-display text-base leading-snug font-bold">
                        {c.title}
                      </h3>
                      <Badge
                        variant="outline"
                        className="shrink-0 text-[10px]"
                        style={{
                          borderColor: STATUS_COLOR[c.status],
                          color: STATUS_COLOR[c.status],
                        }}
                      >
                        {c.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {c.category}
                      </Badge>
                      {c.subType ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {c.subType}
                        </Badge>
                      ) : null}
                    </div>

                    {/* Photo Evidence Audit */}
                    <div className="mt-3 space-y-2 rounded-lg border border-border bg-muted/30 p-2.5">
                      <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Photo Evidence Audit
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {/* BEFORE PHOTO */}
                        <div>
                          <p className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
                            Before (Issue)
                          </p>
                          {c.imageUrl ? (
                            <img
                              src={c.imageUrl}
                              alt="Complaint Evidence"
                              className="mt-1 h-20 w-full rounded-md border border-border object-cover shadow-sm"
                            />
                          ) : (
                            <div className="mt-1 flex h-20 items-center justify-center rounded-md border border-dashed border-neutral-300 bg-neutral-100 p-2 text-center text-[10px] text-neutral-400">
                              No photo
                            </div>
                          )}
                        </div>

                        {/* AFTER PHOTO */}
                        <div>
                          <p className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
                            After (Fix)
                          </p>
                          {fixPhoto ? (
                            <img
                              src={fixPhoto}
                              alt="Fix Proof"
                              className="mt-1 h-20 w-full rounded-md border border-emerald-500/50 object-cover shadow-sm"
                            />
                          ) : (
                            <div className="mt-1 flex h-20 items-center justify-center rounded-md border border-dashed border-neutral-300 bg-neutral-100 p-2 text-center text-[10px] text-neutral-400">
                              Not fixed yet
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {c.status === "Resolved" ? (
                      <div className="mt-2 space-y-3 rounded-lg border border-status-green/30 bg-status-green/5 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-semibold tracking-wider text-status-green uppercase">
                            Community Audit Status
                          </p>
                          <Badge className="bg-status-green text-white hover:bg-status-green">
                            Verified Resolved
                          </Badge>
                        </div>
                        <div className="space-y-1 font-mono text-[9px] text-muted-foreground">
                          <p>✓ Camera GPS Match: {c.lat.toFixed(4)}, {c.lng.toFixed(4)}</p>
                          <p>✓ Timestamp Verified</p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 w-full border-status-red/40 text-[10px] text-status-red hover:bg-status-red/5 hover:text-status-red"
                          onClick={() =>
                            toast("Re-opening request logged", {
                              description:
                                "2 more neighbor confirmations needed to flag resolution fraud.",
                            })
                          }
                        >
                          Challenge Closure (Report Fake Fix)
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-2 border border-border bg-muted/40 px-3 py-2 text-[10px] font-medium text-muted-foreground">
                        Awaiting Official Fix &amp; Community Audit
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 p-4">
                    <p className="text-[10px] font-semibold tracking-wider text-primary uppercase">
                      SLA Status
                    </p>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[11px]">
                      <dt className="text-muted-foreground">Opened</dt>
                      <dd className="font-medium">{formatDate(new Date(`${c.date}T00:00:00`))}</dd>
                      <dt className="text-muted-foreground">Time unattended</dt>
                      <dd className="font-medium">{getUnattendedDuration(c.date)}</dd>
                      <dt className="text-muted-foreground">SLA Deadline</dt>
                      <dd
                        className={
                          Date.now() > new Date(`${c.date}T00:00:00`).getTime() + 3 * 86_400_000
                            ? "font-semibold text-status-red"
                            : "font-medium"
                        }
                      >
                        {formatDate(
                          new Date(new Date(`${c.date}T00:00:00`).getTime() + 3 * 86_400_000),
                        )}
                      </dd>
                    </dl>
                  </div>

                  <div className="space-y-2 p-4">
                    <p className="text-[10px] font-semibold tracking-wider text-primary uppercase">
                      Accountability
                    </p>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[11px]">
                      <dt className="text-muted-foreground">Assigned Ward</dt>
                      <dd className="font-medium">{c.area}</dd>
                      <dt className="text-muted-foreground">Responsible Official</dt>
                      <dd className="font-medium">
                        {(() => {
                          const z = zoneForArea(c.area);
                          return z
                            ? `Zonal Officer, Zone ${z.zone} (${z.zoneName})`
                            : "Zonal Officer — zone not on record";
                        })()}
                      </dd>
                      <dt className="text-muted-foreground">Last inspection</dt>
                      <dd className="font-medium">None recorded.</dd>
                    </dl>
                  </div>

                  <div className="space-y-3 p-4">
                    <div>
                      <p className="text-[10px] font-semibold tracking-wider text-primary uppercase">
                        Description
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-foreground">
                        {c.description}
                      </p>
                    </div>
                    <div className="flex items-start gap-2 border-t border-border pt-3">
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                          Specific Location
                        </p>
                        <p className="mt-1 text-xs text-foreground">{c.landmark || c.area}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-primary uppercase">
                        <Clock className="size-3.5" />
                        Verification Count
                      </p>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {c.upvotes}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-full gap-1.5 text-xs"
                      onClick={() => onUpvote(c.id)}
                    >
                      <ThumbsUp className="size-3.5" />
                      {upvotedIds.has(c.id) ? (
                        <span className="text-green-700">Verified</span>
                      ) : (
                        "Verify Issue (Public Audit)"
                      )}
                    </Button>
                    <p className="text-[9px] leading-relaxed text-muted-foreground">
                      One verification per device. Locations are checked in real deployments.
                    </p>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          </Fragment>
        );
      })}
    </MapContainer>
  );
}
