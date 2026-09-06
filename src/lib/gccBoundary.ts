import boundaryJson from "@/data/gcc-boundary.json";

type Pos = [number, number]; // GeoJSON order: [lng, lat]
type Ring = Pos[];
type PolygonCoords = Ring[]; // [outer, ...holes]

const boundary = boundaryJson as unknown as {
    properties: {
        name: string;
        area_km2: number;
        bbox: { south: number; north: number; west: number; east: number };
    };
    geometry: {
        type: "Polygon" | "MultiPolygon";
        coordinates: PolygonCoords | PolygonCoords[];
    };
};

const POLYGONS: PolygonCoords[] =
    boundary.geometry.type === "Polygon"
        ? [boundary.geometry.coordinates as PolygonCoords]
        : (boundary.geometry.coordinates as PolygonCoords[]);

const { south, north, west, east } = boundary.properties.bbox;

/** Leaflet-style bounds [[south, west], [north, east]] with a small pad. */
export const GCC_BOUNDS: [[number, number], [number, number]] = [
    [south - 0.02, west - 0.02],
    [north + 0.02, east + 0.02],
];

export const GCC_NAME = boundary.properties.name;
export const GCC_AREA_KM2 = boundary.properties.area_km2;

/** Raw GeoJSON Feature for drawing the outline. */
export const GCC_FEATURE = boundaryJson as unknown as GeoJSON.Feature;

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
        const intersects =
            yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi || Number.EPSILON) + xi;
        if (intersects) inside = !inside;
    }
    return inside;
}

/** True if the point lies inside the Greater Chennai Corporation area (200 wards). */
export function isInsideGCC(lat: number, lng: number): boolean {
    if (lat < south || lat > north || lng < west || lng > east) return false;
    for (const poly of POLYGONS) {
        const outer = poly[0];
        if (!outer) continue;
        if (inRing(lng, lat, outer) && !poly.slice(1).some((hole) => inRing(lng, lat, hole))) {
            return true;
        }
    }
    return false;
}

/** World polygon with the GCC area cut out — used to dim everything outside Chennai on the map. */
export function gccMaskFeature(): GeoJSON.Feature<GeoJSON.Polygon> {
    const world: Ring = [
        [-180, -90],
        [180, -90],
        [180, 90],
        [-180, 90],
        [-180, -90],
    ];
    const holes: Ring[] = [];
    for (const p of POLYGONS) {
        const outer = p[0];
        if (outer && outer.length >= 3) holes.push(outer);
    }
    return {
        type: "Feature",
        properties: {},
        geometry: {
            type: "Polygon",
            coordinates: [world, ...holes],
        },
    };
}