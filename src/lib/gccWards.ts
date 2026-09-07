import wardsJson from "@/data/gcc-wards.json";
import { isInsideGCC } from "@/lib/gccBoundary";

type Pos = [number, number]; // GeoJSON order: [lng, lat]
type Ring = Pos[];
type PolygonCoords = Ring[]; // [outer, ...holes]

type WardFeature = {
  properties: {
    ward: number;
    name: string; // "Ward 142"
    zone: number;
    zone_name: string;
    bbox: { south: number; north: number; west: number; east: number };
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: PolygonCoords | PolygonCoords[];
  };
};

const FEATURES = (wardsJson as unknown as { features: WardFeature[] }).features;

export type WardInfo = { ward: number; name: string; zone: number; zoneName: string };

/** zone number → official zone name (built from the data; 15 entries) */
export const ZONE_NAMES: Record<number, string> = Object.fromEntries(
  FEATURES.map((f) => [f.properties.zone, f.properties.zone_name]),
);

const BY_WARD = new Map<number, WardFeature>(FEATURES.map((f) => [f.properties.ward, f]));

function polysOf(f: WardFeature): PolygonCoords[] {
  return f.geometry.type === "Polygon"
    ? [f.geometry.coordinates as PolygonCoords]
    : (f.geometry.coordinates as PolygonCoords[]);
}

function inRing(lng: number, lat: number, ring: Ring): boolean {
  if (ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const pi = ring[i];
    const pj = ring[j];
    if (!pi || !pj) continue;
    const xi = pi[0];
    const yi = pi[1];
    const xj = pj[0];
    const yj = pj[1];
    if (
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi || Number.EPSILON) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function inFeature(lng: number, lat: number, f: WardFeature): boolean {
  const { south, north, west, east } = f.properties.bbox;
  if (lat < south || lat > north || lng < west || lng > east) return false;
  return polysOf(f).some((poly) => {
    const outer = poly[0];
    if (!outer) return false;
    return inRing(lng, lat, outer) && !poly.slice(1).some((h) => inRing(lng, lat, h));
  });
}

function toInfo(f: WardFeature): WardInfo {
  return {
    ward: f.properties.ward,
    name: f.properties.name,
    zone: f.properties.zone,
    zoneName: f.properties.zone_name,
  };
}

/**
 * Ward containing the point. Exact polygon hit first; if the point is inside GCC but falls in a
 * sliver gap between simplified ward polygons, snaps to the ward whose outline vertex is nearest
 * (only wards whose bbox is within ~300 m are considered). Returns null outside GCC.
 */
export function wardFor(lat: number, lng: number): WardInfo | null {
  for (const f of FEATURES) {
    if (inFeature(lng, lat, f)) return toInfo(f);
  }
  if (!isInsideGCC(lat, lng)) return null;

  const pad = 0.003; // ≈300 m
  const kx = 111_320 * Math.cos((lat * Math.PI) / 180);
  const ky = 110_570;
  let best: { f: WardFeature; d: number } | null = null;

  for (const f of FEATURES) {
    const { south, north, west, east } = f.properties.bbox;
    if (lat < south - pad || lat > north + pad || lng < west - pad || lng > east + pad) continue;

    for (const poly of polysOf(f)) {
      const outer = poly[0];
      if (!outer) continue;
      for (const pt of outer) {
        if (!pt) continue;
        const x = pt[0];
        const y = pt[1];
        const d = Math.hypot((x - lng) * kx, (y - lat) * ky);
        if (!best || d < best.d) best = { f, d };
      }
    }
  }

  return best ? toInfo(best.f) : null;
}

/** Zone for a ward number (1–200). */
export function zoneForWard(wardNo: number): { zone: number; zoneName: string } | null {
  const f = BY_WARD.get(wardNo);
  return f ? { zone: f.properties.zone, zoneName: f.properties.zone_name } : null;
}

/** Zone for an `area` string in the "Ward 142" format used in the DB. Null for anything else (e.g. legacy "Chennai"). */
export function zoneForArea(area: string): { zone: number; zoneName: string } | null {
  const m = /^\s*ward\s*(\d{1,3})\s*$/i.exec(area);
  if (!m?.[1]) return null;
  return zoneForWard(Number(m[1]));
}
