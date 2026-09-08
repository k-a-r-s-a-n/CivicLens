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
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import { Fragment, useEffect, useMemo, useState, useCallback } from "react";
import { Clock, MapPin, ThumbsUp } from "lucide-react";
import wardsJson from "@/data/gcc-wards.json";
import { CHENNAI_CENTER, STATUS_COLOR, type Complaint } from "@/data/civic";
import { GCC_BOUNDS, GCC_FEATURE, gccMaskFeature, isInsideGCC } from "@/lib/gccBoundary";
import { zoneForArea } from "@/lib/gccWards";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import WardSearch from "@/components/civic/WardSearch";


import { Button } from "@/components/ui/button";

// Fix Leaflet default marker icons
if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

const GCC_MASK = gccMaskFeature();

function ClickCatcher({ onPick }: { onPick?: ((lat: number, lng: number) => void) | undefined }) {
  const map = useMapEvents({
    click(e) {
      onPick?.(e.latlng.lat, e.latlng.lng);
    },
    mousemove(e) {
      if (!onPick) return;
      map.getContainer().classList.toggle("outside-gcc", !isInsideGCC(e.latlng.lat, e.latlng.lng));
    },
    mouseout() {
      map.getContainer().classList.remove("outside-gcc");
    },
  });

  useEffect(() => {
    if (!onPick) map.getContainer().classList.remove("outside-gcc");
  }, [onPick, map]);

  return null;
}

const PINCH_PX_PER_LEVEL = 60;
const WHEEL_PX_PER_LEVEL = 70;

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
      timer = window.setTimeout(
        () => {
          const snap = map.options.zoomSnap || 0.25;
          const raw = map.getZoom() + acc;
          acc = 0;
          const target = Math.max(
            map.getMinZoom(),
            Math.min(map.getMaxZoom(), Math.round(raw / snap) * snap),
          );
          if (point && target !== map.getZoom())
            map.setZoomAround(point, target, { animate: !pinch });
        },
        pinch ? 0 : 30,
      );
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.clearTimeout(timer);
    };
  }, [map]);
  return null;
}

function MapFlyTo({ target }: { target?: { lat: number; lng: number } | null | undefined }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], 14, { duration: 1.6, easeLinearity: 0.15 });
  }, [target, map]);

  return null;
}

function MobileGestureHandler() {
  const map = useMap();
  useEffect(() => {
    if (!L.Browser.mobile) return;

    map.dragging.disable();

    const el = map.getContainer();
    const overlay = document.createElement("div");
    overlay.className = "absolute inset-0 z-[10000] flex items-center justify-center bg-black/40 text-white text-sm font-medium opacity-0 transition-opacity pointer-events-none";
    overlay.innerHTML = "Use two fingers to move the map";
    el.appendChild(overlay);

    let timer: number;
    const showOverlay = () => {
      overlay.style.opacity = "1";
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { overlay.style.opacity = "0"; }, 2000);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        map.dragging.enable();
        overlay.style.opacity = "0";
      } else {
        map.dragging.disable();
        if (e.touches.length === 1) showOverlay();
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      if (el.contains(overlay)) el.removeChild(overlay);
    };
  }, [map]);

  return null;
}

function WardFlyToHandler({ selectedWardId }: { selectedWardId?: number | null | undefined }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedWardId) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const feature = (wardsJson as any).features?.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (f: any) => f.properties?.ward === selectedWardId,
    );

    if (feature && feature.properties?.bbox) {
      const { south, north, west, east } = feature.properties.bbox;
      const bounds = L.latLngBounds([south, west], [north, east]);
      map.flyToBounds(bounds, { padding: [40, 40], duration: 1.2 });
    }
  }, [selectedWardId, map]);

  return null;
}

function ZoomTracker({ onZoomChange }: { onZoomChange: (z: number) => void }) {
  const map = useMapEvents({
    zoomend() {
      onZoomChange(map.getZoom());
    },
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  return null;
}

function MapInteractionTracker({ onInteractionChange }: { onInteractionChange: (v: boolean) => void }) {
  useMapEvents({
    dragstart: () => onInteractionChange(true),
    zoomstart: () => onInteractionChange(true),
    dragend: () => onInteractionChange(false),
    zoomend: () => onInteractionChange(false),
  });
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

function calculateScaledRadius(baseRadius: number, zoom: number): number {
  const scaleFactor = Math.max(0.55, Math.min(1.75, Math.pow(1.18, zoom - 13)));
  return Math.round(baseRadius * scaleFactor);
}

type Props = {
  complaints: Complaint[];
  onUpvote: (id: string) => void;
  upvotedIds: ReadonlySet<string>;
  mapTarget?: { lat: number; lng: number } | null | undefined;
  onPickLocation?: ((lat: number, lng: number) => void) | undefined;
  draft?: { lat: number; lng: number } | null | undefined;
  selectedWardId?: number | null | undefined;
};



export default function MapView({
  complaints,
  onUpvote,
  upvotedIds,
  mapTarget,
  onPickLocation,
  draft,
  selectedWardId,
}: Props) {
  const [currentZoom, setCurrentZoom] = useState(12);
  const [showWardOutlines, setShowWardOutlines] = useState(true);
  const [searchSelectedWardId, setSearchSelectedWardId] = useState<number | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wardGeoJsonData = useMemo(() => wardsJson as any, []);

  const handleZoomChange = useCallback((z: number) => {
    setCurrentZoom(z);
  }, []);



  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wardStyle = (feature: any) => {
    const isSelected =
      (selectedWardId ?? searchSelectedWardId) &&
      feature?.properties?.ward === (selectedWardId ?? searchSelectedWardId);

    return {
      // Distinct civic slate/blue boundary that cuts through OSM roads
      color: isSelected ? "#1d4ed8" : "#334155", // Deep slate (#334155) or #1e293b
      weight: isSelected ? 3.5 : 1.8,             // Thickened from 0.6 to 1.8px (3.5px when selected)
      opacity: isSelected ? 1.0 : 0.85,          // High line opacity
      dashArray: isSelected ? "" : "3, 5",       // Subtle civic boundary dash pattern
      fillColor: isSelected ? "#2563eb" : "#0284c7",
      fillOpacity: isSelected ? 0.32 : 0.05,     // Subtle ward tint so street labels underneath remain legible
    };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onEachWard = (feature: any, layer: L.Layer) => {
    const wardNum = feature.properties?.ward;
    const wardName = feature.properties?.name || `Ward ${wardNum}`;
    const zoneName = feature.properties?.zone_name || "";
    const resolutionRate = feature.properties?.resolution_rate ?? null;
    const rateText = resolutionRate === null ? "No activity" : `${resolutionRate}%`;
    const tooltipContent = `<b>${wardName}</b><br/>Zone: ${zoneName}<br/>Resolution Rate: ${rateText}`;

    layer.bindTooltip(tooltipContent, {
      sticky: true,
      direction: "top",
      className: "rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md font-sans",
    });

    layer.on({
      mouseover: (e) => {
        const l = e.target;
        if (feature.properties?.ward !== (selectedWardId ?? searchSelectedWardId)) {
          l.setStyle({
            color: "#2563eb",       // Highlight border on hover
            weight: 2.8,
            dashArray: "",          // Solid border on hover
            fillColor: "#3b82f6",
            fillOpacity: 0.22,
          });
          l.bringToFront();
        }
      },
      mouseout: (e) => {
        const l = e.target;
        if (feature.properties?.ward !== (selectedWardId ?? searchSelectedWardId)) {
          l.setStyle(wardStyle(feature));
        }
      },
    });
  };

  return (
    <div className="relative h-full w-full">
      {/* UI Controls */}
      <div className={`absolute top-4 right-4 z-[1000] flex flex-col gap-2 bg-white/80 p-2 rounded shadow-md transition-opacity duration-200 ${isInteracting ? "opacity-40" : "opacity-100"}`}>
        <label className="flex items-center space-x-2">
          <Switch
            checked={showWardOutlines}
            onCheckedChange={setShowWardOutlines}
            aria-label="Toggle ward outlines"
          />
          <span className="text-sm font-medium">Show Ward Outlines</span>
        </label>
        <WardSearch onSelectWard={(wardId: number) => setSearchSelectedWardId(wardId)} />
      </div>
      <MapContainer
        center={CHENNAI_CENTER}
        zoom={12}
        minZoom={11}
        maxBounds={GCC_BOUNDS}
        maxBoundsViscosity={0.85}
        scrollWheelZoom={false}
        zoomSnap={0.25}
        zoomDelta={1}
        inertiaDeceleration={3000}
        easeLinearity={0.2}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
      >


        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <GeoJSON
          data={GCC_MASK}
          interactive={false}
          style={{ stroke: false, fillColor: "#1c1917", fillOpacity: 0.35 }}
        />

        <GeoJSON
          data={GCC_FEATURE}
          interactive={false}
          style={{ color: "#0f766e", weight: 2.5, fill: false }}
        />

        {showWardOutlines && (
          <GeoJSON
            key={`wards-layer-${selectedWardId ?? searchSelectedWardId ?? "none"}`}
            data={wardGeoJsonData}
            style={wardStyle}
            onEachFeature={onEachWard}
          />
        )}

        <MapInteractionTracker onInteractionChange={setIsInteracting} />
        <ZoomTracker onZoomChange={handleZoomChange} />
        <SmartWheelZoom />
        <MobileGestureHandler />
        <MapFlyTo target={mapTarget ?? null} />
        <WardFlyToHandler selectedWardId={selectedWardId ?? searchSelectedWardId ?? null} />
        <ClickCatcher onPick={onPickLocation} />

        {/* Draft pick pin — never clustered */}
        {draft ? (
          <CircleMarker
            center={[draft.lat, draft.lng]}
            radius={calculateScaledRadius(10, currentZoom)}
            pathOptions={{ color: "#166534", fillColor: "#166534", fillOpacity: 0.35, weight: 3 }}
          />
        ) : null}

        {/* Complaint pins — clustered until high zoom */}
        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          maxClusterRadius={60}
          spiderfyOnMaxZoom
          disableClusteringAtZoom={16}
          spiderfyDistanceMultiplier={1.2}
          aria-label={"Clustered complaints layer"}
        >
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

            const fixPhoto = c.fixImageUrl;

            const baseRadius = isSlaBreached ? 10 : 8;
            const pinRadius = calculateScaledRadius(baseRadius, currentZoom);
            const breachRingRadius = calculateScaledRadius(16, currentZoom);

            return (
              <Fragment key={c.id}>
                {isSlaBreached ? (
                  <CircleMarker
                    center={[c.lat, c.lng]}
                    radius={breachRingRadius}
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
                  radius={pinRadius}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 2,
                    fillColor: markerColor,
                    fillOpacity: 0.9,
                  }}
                // Ensure badge text contrast
                // Using white text for better readability on colored background
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={1} className="civic-tooltip" aria-label="Complaint tooltip">
                    {c.category} • {tooltipText}
                  </Tooltip>
                  <Popup minWidth={350} maxWidth={350} aria-label="Complaint details">
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
                              backgroundColor: STATUS_COLOR[c.status],
                              color: "#ffffff",
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
                          {c.locationTrust ? (
                            <Badge
                              variant="secondary"
                              className={
                                c.locationTrust === "verified_gps"
                                  ? "bg-emerald-100 text-[10px] text-emerald-800"
                                  : "bg-amber-100 text-[10px] text-amber-800"
                              }
                            >
                              {c.locationTrust === "verified_gps" ? "GPS Verified" : "Self Reported"}
                            </Badge>
                          ) : null}
                        </div>

                        <div className="mt-3 space-y-2 rounded-lg border border-border bg-muted/30 p-2.5">
                          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                            Photo Evidence Audit
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
                                Before (Issue)
                              </p>
                              {c.imageUrl ? (
                                <img
                                  src={c.imageUrl}
                                  alt={`Before photo evidence for ${c.title}`}
                                  className="mt-1 h-20 w-full rounded-md border border-border object-cover shadow-sm"
                                />
                              ) : (
                                <div className="mt-1 flex h-20 items-center justify-center rounded-md border border-dashed border-neutral-300 bg-neutral-100 p-2 text-center text-[10px] text-neutral-400">
                                  No photo
                                </div>
                              )}
                            </div>

                            <div>
                              <p className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
                                After (Fix)
                              </p>
                              {fixPhoto ? (
                                <img
                                  src={fixPhoto}
                                  alt={`After resolution proof for ${c.title}`}
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
                          <div className="mt-2 rounded-lg border border-status-green/30 bg-status-green/5 p-3 text-[11px] text-muted-foreground">
                            Marked resolved. Before/after photos are shown when a fix photo exists.
                            Official resolution is not handled in this public app yet.
                          </div>
                        ) : (
                          <div className="mt-2 border border-border bg-muted/40 px-3 py-2 text-[10px] font-medium text-muted-foreground">
                            Awaiting official fix. This is a public record, not a GCC ticket.
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 p-4">
                        <p className="text-[10px] font-semibold tracking-wider text-primary uppercase">
                          SLA Status
                        </p>
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[11px]">
                          <dt className="text-muted-foreground">Opened</dt>
                          <dd className="font-medium">
                            {formatDate(new Date(`${c.date}T00:00:00`))}
                          </dd>
                          <dt className="text-muted-foreground">Time unattended</dt>
                          <dd className="font-medium">{getUnattendedDuration(c.date)}</dd>
                          <dt className="text-muted-foreground">SLA Deadline</dt>
                          <dd
                            className={
                              Date.now() > new Date(`${c.date}T00:00:00`).getTime() + 7 * 86_400_000
                                ? "font-semibold text-status-red"
                                : "font-medium"
                            }
                          >
                            {formatDate(
                              new Date(new Date(`${c.date}T00:00:00`).getTime() + 7 * 86_400_000),
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
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              </Fragment>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
