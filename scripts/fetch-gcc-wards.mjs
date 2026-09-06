// Run once: node scripts/fetch-gcc-wards.mjs
// 1) Overpass: ids of the 200 ward relations (admin_level=10) + 15 zone relations (admin_level=9) inside GCC
// 2) Nominatim /lookup: simplified polygons for each (50 ids per request)
// 2b) Overpass "out geom" fallback for relations Nominatim can't polygonise (gaps bridged with straight lines)
// 3) Writes src/data/gcc-wards.json  (FeatureCollection: ward, zone, zone_name, bbox, geometry)
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("src/data/gcc-wards.json");
const UA = "CivicLens/1.0 (local dev ward fetch)";

// Official GCC zone → ward ranges
const ZONES = [
    [1, "Tiruvottiyur", 1, 14], [2, "Manali", 15, 21], [3, "Madhavaram", 22, 33],
    [4, "Tondiarpet", 34, 48], [5, "Royapuram", 49, 63], [6, "Thiru-Vi-Ka Nagar", 64, 78],
    [7, "Ambattur", 79, 93], [8, "Anna Nagar", 94, 108], [9, "Teynampet", 109, 126],
    [10, "Kodambakkam", 127, 142], [11, "Valasaravakkam", 143, 155], [12, "Alandur", 156, 167],
    [13, "Adyar", 168, 182], [14, "Perungudi", 183, 191], [15, "Sholinganallur", 192, 200],
];
const zoneOf = (w) => ZONES.find(([, , a, b]) => w >= a && w <= b);

// ── 1. Overpass ids ─────────────────────────────────────────────────────────
const boundary = JSON.parse(await readFile("src/data/gcc-boundary.json", "utf8"));
const areaId = 3600000000 + boundary.properties.osm_id;
const query = `[out:json][timeout:120];area(${areaId})->.gcc;
(relation["boundary"="administrative"]["admin_level"="10"](area.gcc);
 relation["boundary"="administrative"]["admin_level"="9"](area.gcc););
out ids tags;`;

const ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
async function overpass(q, label) {
    for (let attempt = 1; attempt <= 2; attempt++) {
        for (const url of ENDPOINTS) {
            try {
                console.log(`→ ${url} (${label}, attempt ${attempt})`);
                const res = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
                    body: "data=" + encodeURIComponent(q),
                });
                if (!res.ok) { console.log(`   HTTP ${res.status}`); continue; }
                const json = await res.json();
                if (json.elements) { console.log("   ok"); return json.elements; }
            } catch (e) { console.log(`   ${e.message}`); }
        }
        if (attempt === 1) { console.log("waiting 30s…"); await new Promise((r) => setTimeout(r, 30_000)); }
    }
    throw new Error(`Overpass failed on all endpoints (${label})`);
}
const elements = await overpass(query, "ids");

// OSM data fixes (verified against Nominatim placement, 2025):
//  7888507 "Ward 152" (13.0407, 80.1791, Alwarthirunagar side) is actually Ward 151 — mislabelled duplicate
//  7888812 "Ward 152" (13.0317, 80.1689, Karambakkam side) is the real Ward 152
//  7888807 "Mugalivakkam" (Zone 12 Alandur, Manapakkam) is Ward 156 — relation has no number in its name
const OVERRIDES = { 7888507: 151, 7888812: 152, 7888807: 156 };

const wards = [], zones = [], unnumbered = [];
for (const el of elements) {
    if (OVERRIDES[el.id] !== undefined) {
        wards.push({ osm_id: el.id, ward: OVERRIDES[el.id], name: `Ward ${OVERRIDES[el.id]}` });
        continue;
    }
    const m = /(\d+)/.exec(el.tags.name ?? "");
    if (!m) { unnumbered.push({ osm_id: el.id, tags: el.tags }); continue; }
    const n = Number(m[1]);
    if (el.tags.admin_level === "10") wards.push({ osm_id: el.id, ward: n, name: el.tags.name });
    else zones.push({ osm_id: el.id, zone: n, name: el.tags.name });
}
const wardNums = new Set(wards.map((w) => w.ward));
const missing = Array.from({ length: 200 }, (_, i) => i + 1).filter((n) => !wardNums.has(n));
const dupes = wards.filter((w, _, arr) => arr.filter((x) => x.ward === w.ward).length > 1);

if (missing.length || dupes.length || unnumbered.length) {
    console.log(`\nPROBLEMS — missing: [${missing.join(",")}]  duplicates: [${[...new Set(dupes.map((d) => d.ward))].join(",")}]  unnumbered: ${unnumbered.length}`);
    const probe = [...dupes.map((d) => d.osm_id), ...unnumbered.map((u) => u.osm_id)];
    const url = new URL("https://nominatim.openstreetmap.org/lookup");
    url.search = new URLSearchParams({ osm_ids: probe.map((i) => `R${i}`).join(","), format: "json" }).toString();
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    const info = res.ok ? await res.json() : [];
    console.table(
        probe.map((id) => {
            const el = elements.find((e) => e.id === id);
            const r = info.find((x) => Number(x.osm_id) === id);
            return {
                osm_id: id,
                name: el.tags.name,
                lat: r ? Number(r.lat).toFixed(4) : "?",
                lon: r ? Number(r.lon).toFixed(4) : "?",
                display_name: r ? r.display_name.slice(0, 70) : "?",
            };
        }),
    );
    console.log("\nNothing written. Paste this table back to decide the fix.");
    process.exit(1);
}
console.log(`ids: ${wards.length} wards, ${zones.length} zones`);

// ── 2. Nominatim lookup (polygons) ──────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function lookup(ids, threshold) {
    const url = new URL("https://nominatim.openstreetmap.org/lookup");
    url.search = new URLSearchParams({
        osm_ids: ids.map((i) => `R${i}`).join(","),
        format: "json", polygon_geojson: "1", polygon_threshold: String(threshold),
    }).toString();
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
    return res.json();
}
const geomById = new Map();
const allIds = [...wards.map((w) => w.osm_id), ...zones.map((z) => z.osm_id)];
for (let i = 0; i < allIds.length; i += 50) {
    const batch = allIds.slice(i, i + 50);
    console.log(`lookup ${i + 1}–${i + batch.length} of ${allIds.length}`);
    for (const r of await lookup(batch, 0.0002)) if (r.geojson) geomById.set(Number(r.osm_id), r.geojson);
    if (i + 50 < allIds.length) await sleep(1100);
}

// ── 2b. Overpass fallback for relations Nominatim doesn't have polygons for ──
const key = (p) => p.join(",");
const round = (v) => Math.round(v * 1e5) / 1e5;
const BRIDGES = [];
const distM = ([x1, y1], [x2, y2]) => {
    const kx = 111320 * Math.cos((y1 * Math.PI) / 180), ky = 110570;
    return Math.hypot((x2 - x1) * kx, (y2 - y1) * ky);
};
function inRing(x, y, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i], [xj, yj] = ring[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
}
// Greedy nearest-endpoint chaining. Exact matches join normally; any distance > 0 is bridged
// with a straight segment (OSM relations sometimes lack a coastline/river segment entirely).
// A ring is finished when it returns to its own start; leftover ways start a new ring.
function assembleRings(ways, label) {
    const pool = ways.map((w) => w.slice());
    const rings = [];
    while (pool.length) {
        let ring = pool.shift();
        const gaps = [];
        while (pool.length) {
            const first = ring[0], last = ring[ring.length - 1];
            if (key(first) === key(last)) break; // already a closed ring
            let best = { idx: -1, d: Infinity, rev: false };
            pool.forEach((w, i) => {
                const dHead = distM(last, w[0]), dTail = distM(last, w[w.length - 1]);
                if (dHead < best.d) best = { idx: i, d: dHead, rev: false };
                if (dTail < best.d) best = { idx: i, d: dTail, rev: true };
            });
            const toStart = distM(last, first);
            if (toStart < best.d && toStart <= 60) break; // closing is tighter than continuing
            const [w] = pool.splice(best.idx, 1);
            if (best.d > 0) {
                gaps.push(best.d);
                const to = best.rev ? w[w.length - 1] : w[0];
                BRIDGES.push({ label, d: best.d, a: key(last.map(round)), b: key(to.map(round)) });
            }
            ring = ring.concat((best.rev ? w.reverse() : w).slice(best.d === 0 ? 1 : 0));
        }
        if (key(ring[0]) !== key(ring[ring.length - 1])) {
            const g = distM(ring[ring.length - 1], ring[0]);
            if (g > 0) {
                gaps.push(g);
                BRIDGES.push({ label, d: g, a: key(ring[ring.length - 1].map(round)), b: key(ring[0].map(round)) });
            }
            ring.push(ring[0]);
        }
        if (gaps.length) {
            const big = gaps.filter((g) => g > 200);
            console.log(`   ${label}: bridged ${gaps.length} gap(s), largest ${Math.max(...gaps).toFixed(0)} m${big.length ? `  ⚠ ${big.length} straight-line bridge(s) > 200 m (OSM data gap, likely missing coastline segment)` : ""}`);
        }
        if (ring.length >= 4) rings.push(ring);
    }
    return rings;
}

const noGeom = wards.filter((w) => !geomById.has(w.osm_id));
if (noGeom.length) {
    console.log(`Nominatim had no polygon for wards ${noGeom.map((w) => w.ward).join(",")} — fetching from Overpass (out geom)`);
    const q = `[out:json][timeout:90];(${noGeom.map((w) => `relation(${w.osm_id});`).join("")});out geom;`;
    const rels = (await overpass(q, "geom")).filter((e) => e.type === "relation");
    if (!rels.length) throw new Error("Overpass fallback returned no relations");

    for (const rel of rels) {
        const wardNo = noGeom.find((w) => w.osm_id === rel.id)?.ward;
        const toCoords = (m) => m.geometry.map((p) => [p.lon, p.lat]);
        const wayMembers = rel.members.filter((m) => m.type === "way" && m.geometry);
        console.log(`   Ward ${wardNo} (relation ${rel.id}): ${wayMembers.length} way members (roles: ${[...new Set(wayMembers.map((m) => m.role || "(empty)"))].join(", ")})`);
        const outers = assembleRings(wayMembers.filter((m) => m.role === "outer" || m.role === "").map(toCoords), `Ward ${wardNo} outer`);
        const inners = assembleRings(wayMembers.filter((m) => m.role === "inner").map(toCoords), `Ward ${wardNo} inner`);
        if (!outers.length) throw new Error(`Ward ${wardNo}: no outer ring could be built`);
        const polys = outers.map((o) => [o, ...inners.filter((h) => inRing(h[0][0], h[0][1], o))]);
        geomById.set(rel.id, polys.length === 1 ? { type: "Polygon", coordinates: polys[0] } : { type: "MultiPolygon", coordinates: polys });
        console.log(`   Ward ${wardNo}: ${outers.length} outer ring(s), ${inners.length} hole(s)`);
    }
    const still = wards.filter((w) => !geomById.has(w.osm_id));
    if (still.length) throw new Error(`Still no polygon for wards: ${still.map((w) => w.ward).join(",")}`);

    const big = BRIDGES.filter((b) => b.d > 200);
    for (let i = 0; i < big.length; i++)
        for (let j = i + 1; j < big.length; j++) {
            const same = (big[i].a === big[j].a && big[i].b === big[j].b) || (big[i].a === big[j].b && big[i].b === big[j].a);
            console.log(`   ${big[i].label} ↔ ${big[j].label}: ${same ? "SAME chord — one shared missing way; the two wards tile each other consistently" : "different chords — independent gaps"}`);
        }
}

// ── 3. Build features ───────────────────────────────────────────────────────
function roundGeom(g) {
    const rr = (ring) => ring.map(([x, y]) => [round(x), round(y)]);
    if (g.type === "Polygon") return { type: "Polygon", coordinates: g.coordinates.map(rr) };
    if (g.type === "MultiPolygon") return { type: "MultiPolygon", coordinates: g.coordinates.map((p) => p.map(rr)) };
    throw new Error(`Unsupported geometry ${g.type}`);
}
function bboxOf(g) {
    let w = 180, s = 90, e = -180, n = -90;
    const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    for (const p of polys) for (const [x, y] of p[0]) { if (x < w) w = x; if (x > e) e = x; if (y < s) s = y; if (y > n) n = y; }
    return { south: s, north: n, west: w, east: e };
}
function inGeom(x, y, g) {
    const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    return polys.some((p) => inRing(x, y, p[0]) && !p.slice(1).some((h) => inRing(x, y, h)));
}
function centroid(g) {
    const ring = (g.type === "Polygon" ? g.coordinates : g.coordinates[0])[0];
    const n = ring.length - 1;
    return [ring.slice(0, n).reduce((s, [x]) => s + x, 0) / n, ring.slice(0, n).reduce((s, [, y]) => s + y, 0) / n];
}

const zoneGeoms = zones.filter((z) => geomById.has(z.osm_id)).map((z) => ({ ...z, geom: geomById.get(z.osm_id) }));

// Fraction of a ward's AREA (≈100 m sample grid) falling in each OSM zone polygon — immune to centroid artefacts
function zoneShare(geometry) {
    const { south, north, west, east } = bboxOf(geometry);
    const dLat = 0.0009, dLng = 0.0009 / Math.cos((south * Math.PI) / 180);
    const counts = new Map();
    let total = 0;
    for (let y = south; y <= north; y += dLat)
        for (let x = west; x <= east; x += dLng) {
            if (!inGeom(x, y, geometry)) continue;
            total++;
            const z = zoneGeoms.find((zg) => inGeom(x, y, zg.geom));
            if (z) counts.set(z.zone, (counts.get(z.zone) ?? 0) + 1);
        }
    let best = null;
    for (const [zone, n] of counts) if (!best || n > best.n) best = { zone, n };
    return best ? { zone: best.zone, share: best.n / total } : null;
}

const resolved = [], unresolved = [];
const features = wards
    .sort((a, b) => a.ward - b.ward)
    .map((w) => {
        const geometry = roundGeom(geomById.get(w.osm_id));
        let [zone, zone_name] = zoneOf(w.ward);
        const s = zoneShare(geometry);
        if (s && s.zone !== zone) {
            const osmName = zoneGeoms.find((z) => z.zone === s.zone).name;
            if (s.share >= 0.85) {
                // OSM zone polygon is a mapped fact; the range table is a lookup — when ≥85% of the ward's area
                // sits in a different zone polygon, the range table is what's wrong for this ward.
                resolved.push(`Ward ${w.ward}: ${(s.share * 100).toFixed(0)}% of area in "${osmName}" → using Zone ${s.zone} (range table said ${zone})`);
                zone = s.zone;
                zone_name = ZONES.find(([n]) => n === s.zone)[1];
            } else {
                unresolved.push(`Ward ${w.ward}: only ${(s.share * 100).toFixed(0)}% in "${osmName}" — keeping range table Zone ${zone}`);
            }
        }
        return {
            type: "Feature",
            properties: { ward: w.ward, name: `Ward ${w.ward}`, zone, zone_name, osm_id: w.osm_id, bbox: bboxOf(geometry) },
            geometry,
        };
    });

const out = {
    type: "FeatureCollection",
    properties: { source: "OpenStreetMap contributors (ODbL) via Overpass + Nominatim", fetched_at: new Date().toISOString(), count: features.length },
    features,
};
await writeFile(OUT, JSON.stringify(out));
console.log(`\nWrote ${OUT} · ${features.length} wards · ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`);
console.log(resolved.length ? `Zone corrected from OSM (${resolved.length}):\n  ${resolved.join("\n  ")}` : "Zone check: all 200 wards agree with the range table");
if (unresolved.length) console.log(`Zone ambiguous, kept range table (${unresolved.length}):\n  ${unresolved.join("\n  ")}`);
console.log("\nSanity check around the overridden wards (centroids):");
console.table(
    features
        .filter((f) => f.properties.ward >= 149 && f.properties.ward <= 157)
        .map((f) => { const [x, y] = centroid(f.geometry); return { ward: f.properties.ward, zone: f.properties.zone_name, lat: y.toFixed(4), lon: x.toFixed(4), osm_id: f.properties.osm_id }; }),
);