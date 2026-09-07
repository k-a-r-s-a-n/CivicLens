// Run: node scripts/probe-gcc-wards.mjs
// READ-ONLY probe. Asks Overpass how many administrative sub-boundaries exist inside the
// GCC relation (from src/data/gcc-boundary.json) at admin_level 9 and 10, and prints samples.
import { readFile } from "node:fs/promises";

const boundary = JSON.parse(await readFile("src/data/gcc-boundary.json", "utf8"));
const gccRelId = boundary.properties.osm_id;
const areaId = 3600000000 + gccRelId;

const query = `
[out:json][timeout:120];
area(${areaId})->.gcc;
(
  relation["boundary"="administrative"]["admin_level"="10"](area.gcc);
  relation["boundary"="administrative"]["admin_level"="9"](area.gcc);
);
out ids tags;
`;

const ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

async function runOverpass() {
  for (let attempt = 1; attempt <= 2; attempt++) {
    for (const url of ENDPOINTS) {
      try {
        console.log(`→ ${url} (attempt ${attempt})`);
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "CivicLens/1.0 (ward probe)",
          },
          body: "data=" + encodeURIComponent(query),
        });
        if (!res.ok) {
          console.log(`   HTTP ${res.status} — trying next`);
          continue;
        }
        const json = await res.json();
        if (!json.elements) {
          console.log(`   no elements in response — trying next`);
          continue;
        }
        console.log(`   ok`);
        return json;
      } catch (err) {
        console.log(`   ${err.message} — trying next`);
      }
    }
    if (attempt === 1) {
      console.log("all endpoints failed, waiting 30s before retry…");
      await new Promise((r) => setTimeout(r, 30_000));
    }
  }
  throw new Error("All Overpass endpoints failed twice. Wait a few minutes and re-run.");
}

const { elements } = await runOverpass();

const byLevel = { 9: [], 10: [] };
for (const el of elements) byLevel[el.tags.admin_level]?.push(el);

console.log(`GCC relation ${gccRelId} → area ${areaId}`);
for (const lvl of [10, 9]) {
  const list = byLevel[lvl];
  console.log(`\nadmin_level=${lvl}: ${list.length} relations`);
  if (!list.length) continue;
  const tagKeys = {};
  for (const el of list) for (const k of Object.keys(el.tags)) tagKeys[k] = (tagKeys[k] ?? 0) + 1;
  console.log(
    "tag coverage:",
    Object.entries(tagKeys)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k, n]) => `${k}(${n})`)
      .join("  "),
  );
  console.table(
    list.slice(0, 8).map((el) => ({
      osm_id: el.id,
      name: el.tags.name ?? "",
      ref: el.tags.ref ?? "",
      wardno: el.tags["ward:number"] ?? el.tags.ward_no ?? "",
    })),
  );
  const refs = list
    .map((el) => Number(el.tags.ref ?? el.tags["ward:number"] ?? NaN))
    .filter((n) => !Number.isNaN(n));
  if (refs.length) {
    const have = new Set(refs);
    const missing = Array.from({ length: 200 }, (_, i) => i + 1).filter((n) => !have.has(n));
    console.log(
      `numeric refs: ${refs.length} · range ${Math.min(...refs)}–${Math.max(...refs)} · missing of 1–200: ${missing.length}${missing.length && missing.length <= 40 ? " → " + missing.join(",") : ""}`,
    );
  }
}
