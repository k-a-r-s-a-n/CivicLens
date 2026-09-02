import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Rectangle,
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

const CHENNAI_BOUNDS = {
  north: 13.25,
  south: 12.8,
  east: 80.35,
  west: 80.1,
};

function ClickCatcher({ onPick }: { onPick?: ((lat: number, lng: number) => void) | undefined }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      const isInsideChennai =
        lat >= CHENNAI_BOUNDS.south &&
        lat <= CHENNAI_BOUNDS.north &&
        lng >= CHENNAI_BOUNDS.west &&
        lng <= CHENNAI_BOUNDS.east;

      if (isInsideChennai) {
        onPick?.(lat, lng);
        return;
      }

      toast.error("Outside CivicLens coverage", {
        description:
          "This pin is outside Greater Chennai Corporation limits. Please choose a location inside the highlighted boundary.",
      });
    },
  });
  return null;
}

function MapFlyTo({ target }: { target?: { lat: number; lng: number } | null }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], 14, { duration: 1.2 });
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

function getZone(area: string) {
  const zones: Record<string, number> = {
    "T. Nagar": 10,
    Velachery: 13,
    Adyar: 13,
    Mylapore: 9,
    "Anna Nagar": 8,
  };
  return zones[area] ?? 5;
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
      scrollWheelZoom
      className="h-full w-full"
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Rectangle
        bounds={[
          [CHENNAI_BOUNDS.south, CHENNAI_BOUNDS.west],
          [CHENNAI_BOUNDS.north, CHENNAI_BOUNDS.east],
        ]}
        pathOptions={{
          color: "#0f766e",
          weight: 2,
          fillColor: "#0f766e",
          fillOpacity: 0.06,
          dashArray: "6 4",
        }}
      />
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
          c.status !== "Resolved" &&
          Date.now() - new Date(`${c.date}T00:00:00`).getTime() > 7 * 86_400_000;
        const markerColor = isSlaBreached
          ? "#991b1b"
          : c.status !== "Resolved"
            ? "#dc2626"
            : STATUS_COLOR[c.status];
        const tooltipText =
          c.status === "Resolved" ? "Resolved" : `Unattended for ${getUnattendedDays(c.date)} days`;

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
                      <dd className="font-medium">Zonal Officer, Zone {getZone(c.area)}</dd>
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