// Run once: node scripts/fetch-gcc-boundary.mjs
// Downloads the Greater Chennai Corporation admin boundary from OSM (via Nominatim),
// picks the candidate closest to the official 426 km², and writes src/data/gcc-boundary.json
import { writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("src/data/gcc-boundary.json");
const OFFICIAL_KM2 = 426;

const url = new URL("https://nominatim.openstreetmap.org/search");
url.search = new URLSearchParams({
    q: "Chennai, Tamil Nadu, India",
    format: "json",
    polygon_geojson: "1",
    polygon_threshold: "0.0004", // ~40 m simplification → small file, ward-level accurate
    limit: "10",
}).toString();

const res = await fetch(url, {
    headers: { "User-Agent": "CivicLens/1.0 (local dev boundary fetch)", Accept: "application/json" },
});
if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
const results = await res.json();

function ringAreaKm2(ring) {
    const lat0 = (ring.reduce((s, [, la]) => s + la, 0) / ring.length) * (Math.PI / 180);
    const kx = 111.32 * Math.cos(lat0), ky = 110.57;
    let a = 0;
    for (let i = 0; i < ring.length; i++) {
        const [x1, y1] = ring[i], [x2, y2] = ring[(i + 1) % ring.length];
        a += x1 * kx * (y2 * ky) - x2 * kx * (y1 * ky);
    }
    return Math.abs(a) / 2;
}
function areaKm2(g) {
    const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    return polys.reduce((s, p) => s + ringAreaKm2(p[0]) - p.slice(1).reduce((h, r) => h + ringAreaKm2(r), 0), 0);
}

const candidates = results
    .filter((r) => r.osm_type === "relation" && r.class === "boundary" && r.type === "administrative" && r.geojson)
    .filter((r) => r.geojson.type === "Polygon" || r.geojson.type === "MultiPolygon")
    .map((r) => ({ ...r, km2: areaKm2(r.geojson) }));

if (!candidates.length) throw new Error("No administrative boundary relation returned for Chennai");

console.table(candidates.map((c) => ({ osm_id: c.osm_id, name: c.display_name.slice(0, 50), km2: c.km2.toFixed(1) })));

const best = candidates.reduce((a, b) => (Math.abs(a.km2 - OFFICIAL_KM2) < Math.abs(b.km2 - OFFICIAL_KM2) ? a : b));
if (Math.abs(best.km2 - OFFICIAL_KM2) > 40) {
    throw new Error(`Best candidate is ${best.km2.toFixed(0)} km² — not the 426 km² GCC area. Do not write.`);
}

const [s, n, w, e] = best.boundingbox.map(Number);
const out = {
    type: "Feature",
    properties: {
        name: "Greater Chennai Corporation",
        osm_id: best.osm_id,
        area_km2: Math.round(best.km2),
        bbox: { south: s, north: n, west: w, east: e },
        source: "OpenStreetMap contributors (ODbL) via Nominatim",
        fetched_at: new Date().toISOString(),
    },
    geometry: best.geojson,
};
await writeFile(OUT, JSON.stringify(out));
console.log(`\nWrote ${OUT}\nosm_id ${best.osm_id} · ${best.km2.toFixed(0)} km² · bbox S${s} N${n} W${w} E${e} · ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`);