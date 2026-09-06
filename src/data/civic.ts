import { supabase } from "@/lib/supabaseClient";

export type ComplaintStatus = "Unresolved" | "In Progress" | "Resolved";

export type Complaint = {
  id: string;
  title: string;
  description: string;
  category: string;
  subType?: string;
  resolvedAt?: string;
  landmark?: string;
  status: ComplaintStatus;
  upvotes: number;
  date: string;
  area: string;
  lat: number;
  lng: number;
  reporter?: string;
  imageUrl?: string;
  fixImageUrl?: string;
  wardId?: number;       // from complaints.ward_id (generated from area)
};

// Find this existing type in src/data/civic.ts and add the history field:
export type Ward = {
  id?: string | number;
  name: string;
  councillor: string;
  open: number;
  resolutionRate: number | null;   // null = no complaints ever filed for this ward
  avgDays: number | null;
  slaBreaches: number;
  zone?: string;
  // --- ADD THIS LINE ---
  history?: { date: string; resolutionRate: number; open: number }[];
};

export type Place = {
  name: string;
  lat: number;
  lng: number;
  aliases?: string[];
};

export const CATEGORY_TREE: Record<string, string[]> = {
  "Roads & Footpaths": [
    "Pothole fill up / Repairs",
    "Illegal parking on footpath",
    "Electrical wires on footpath",
    "Milling/Scraping of Road",
    "Unsafe dark spots",
    "Removal of Shops in Footpath",
  ],
  "Garbage & Solid Waste": [
    "Overflowing Garbage Bin",
    "Absenteeism of Sweepers",
    "Burning of Garbage",
    "Spilling of Garbage from Lorry",
    "Removal of Debris",
    "Broken Bin",
  ],
  Streetlights: [
    "Non burning of Street lights",
    "Burning of street light in daytime",
    "Damage to the Electric pole",
    "Overhead cable wires hazard",
    "Electric shock risk",
  ],
  "Public Health & Safety": [
    "Mosquito Menace",
    "Death of Stray Animals",
    "Open Defecation",
    "Unhygienic Restaurants / Eateries",
    "Illegal Slaughtering",
    "Biomedical waste hazard",
  ],
  "Water & Drainage": [
    "Stagnation of Water",
    "Desilting of Drain / Canal",
    "Missing/Broken Manhole Cover",
    "Sewage Overflow",
    "Obstruction of Water Flow",
  ],
  "Parks & Public Toilets": [
    "Toilets not in use / closed",
    "Cleanliness / water supply in toilets",
    "Fallen Trees in Park",
    "Broken Play Equipment",
    "No electricity in public toilet",
  ],
  "General / Other": [
    "Unauthorized Construction",
    "Encroachment on Public Property",
    "Air Quality Issue",
    "Unauthorized Advertisement Boards",
    "Other",
  ],
};

export const CATEGORIES = Object.keys(CATEGORY_TREE) as const;

export const CHENNAI_PLACES: Place[] = [
  { name: "Thiruvottiyur", lat: 13.1692, lng: 80.3046 },
  { name: "Manali", lat: 13.1667, lng: 80.2583 },
  { name: "Madhavaram", lat: 13.1482, lng: 80.2314 },
  { name: "Ambattur", lat: 13.1143, lng: 80.1548 },
  { name: "Anna Nagar", lat: 13.0878, lng: 80.2101, aliases: ["annanagar"] },
  { name: "Kilpauk", lat: 13.0825, lng: 80.2425 },
  { name: "Nungambakkam", lat: 13.0569, lng: 80.2425 },
  { name: "T. Nagar", lat: 13.0418, lng: 80.2341, aliases: ["thyagaraya nagar"] },
  { name: "Mylapore", lat: 13.0339, lng: 80.2691 },
  { name: "Adyar", lat: 13.0067, lng: 80.2515 },
  { name: "Velachery", lat: 12.9756, lng: 80.2207 },
  { name: "Guindy", lat: 13.0067, lng: 80.2206 },
  { name: "Saidapet", lat: 13.0213, lng: 80.2231 },
  { name: "Kodambakkam", lat: 13.0524, lng: 80.2217 },
  { name: "Vadapalani", lat: 13.0507, lng: 80.2121 },
  { name: "Porur", lat: 13.0359, lng: 80.1567 },
  { name: "Maduravoyal", lat: 13.0602, lng: 80.1676 },
  { name: "Poonamallee", lat: 13.0475, lng: 80.1108 },
  { name: "Tambaram", lat: 12.9249, lng: 80.1 },
  { name: "Pallavaram", lat: 12.9675, lng: 80.1491 },
  { name: "Chromepet", lat: 12.9516, lng: 80.1462 },
  { name: "Sholinganallur", lat: 12.901, lng: 80.2279 },
  { name: "OMR", lat: 12.8776, lng: 80.2275, aliases: ["old mahabalipuram road"] },
  { name: "Thoraipakkam", lat: 12.9415, lng: 80.2362 },
  { name: "Perungudi", lat: 12.9601, lng: 80.2425 },
  { name: "Taramani", lat: 12.9849, lng: 80.244 },
  { name: "Velachery MRTS", lat: 12.9815, lng: 80.2207, aliases: ["velachery station"] },
  { name: "Royapuram", lat: 13.1158, lng: 80.2931 },
  { name: "Washermanpet", lat: 13.1088, lng: 80.2806 },
  { name: "George Town", lat: 13.0917, lng: 80.2861 },
  { name: "Egmore", lat: 13.0732, lng: 80.2609 },
  { name: "Chetpet", lat: 13.0736, lng: 80.2406 },
  { name: "Alandur", lat: 13.0025, lng: 80.2012 },
  { name: "Meenambakkam", lat: 12.9873, lng: 80.1767 },
  { name: "St. Thomas Mount", lat: 12.9951, lng: 80.1964 },
  { name: "Medavakkam", lat: 12.9172, lng: 80.1925 },
  { name: "Nanmangalam", lat: 12.9347, lng: 80.1847 },
  { name: "Kelambakkam", lat: 12.7877, lng: 80.2212 },
  { name: "Thazhambur", lat: 12.8465, lng: 80.2215 },
  { name: "Siruseri", lat: 12.8352, lng: 80.2188 },
  { name: "Perambur", lat: 13.1177, lng: 80.2337 },
  { name: "Kolathur", lat: 13.1246, lng: 80.2121 },
  { name: "Villivakkam", lat: 13.1072, lng: 80.2064 },
  { name: "Purasaiwakkam", lat: 13.0827, lng: 80.258 },
  { name: "Triplicane", lat: 13.0588, lng: 80.2757 },
  { name: "Besant Nagar", lat: 13.0003, lng: 80.2668 },
  { name: "Thiruvanmiyur", lat: 12.983, lng: 80.2594 },
  { name: "East Coast Road", lat: 12.9279, lng: 80.2565, aliases: ["ECR"] },
  { name: "Kotturpuram", lat: 13.0172, lng: 80.248 },
  { name: "Ashok Nagar", lat: 13.0358, lng: 80.2121 },
  { name: "KK Nagar", lat: 13.041, lng: 80.2064, aliases: ["k.k. nagar"] },
  { name: "Valasaravakkam", lat: 13.0418, lng: 80.175 },
  { name: "Virugambakkam", lat: 13.0524, lng: 80.1945 },
];

export const CHENNAI_CENTER: [number, number] = [13.0827, 80.2707];
// Single source of truth for the SLA window.
// MUST match INTERVAL '7 days' in refresh_ward_stats_from_complaints() in the DB.
export const SLA_DAYS = 7;

const MS_PER_DAY = 86_400_000;

/** Whole days since the complaint was raised (uses created_at date at 00:00 local). */
export function daysOpen(c: Pick<Complaint, "date">, now: Date = new Date()): number {
  const raised = new Date(`${c.date}T00:00:00`);
  return Math.max(0, Math.floor((now.getTime() - raised.getTime()) / MS_PER_DAY));
}

/** Whole days from raised → resolved; null if not resolved. */
export function daysToResolve(c: Pick<Complaint, "date" | "resolvedAt">): number | null {
  if (!c.resolvedAt) return null;
  const raised = new Date(`${c.date}T00:00:00`);
  const fixed = new Date(c.resolvedAt);
  return Math.max(0, Math.round((fixed.getTime() - raised.getTime()) / MS_PER_DAY));
}

/** True when an open complaint has exceeded the SLA window (same rule as the DB trigger). */
export function isSlaBreached(c: Pick<Complaint, "date" | "status">, now: Date = new Date()): boolean {
  if (c.status === "Resolved") return false;
  return daysOpen(c, now) >= SLA_DAYS;
}

/** "5 Sep 2026" style label from YYYY-MM-DD or ISO timestamp. */
export function formatDay(value: string): string {
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
export const STATUS_COLOR: Record<ComplaintStatus, string> = {
  Unresolved: "#dc2626",
  "In Progress": "#eab308",
  Resolved: "#16a34a",
};

export function wardStatus(
  rate: number | null,
): { label: string; tone: "bad" | "mid" | "good" | "none" } {
  if (rate === null) return { label: "No activity", tone: "none" };
  if (rate < 30) return { label: "Failing", tone: "bad" };
  if (rate < 60) return { label: "Average", tone: "mid" };
  return { label: "Good", tone: "good" };
}

type DbComplaint = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  sub_type: string | null;
  landmark: string | null;
  latitude: number;
  longitude: number;
  status: string;
  upvote_count: number;
  user_name: string | null;
  photo_url: string | null;
  fix_photo_url: string | null;
  area: string;
  created_at: string;
};

function fromDb(row: any): Complaint {
  const statusRaw = row.status ?? "Unresolved";
  const status =
    statusRaw === "Pending Audit" ? "In Progress" : statusRaw;

  return {
    id: String(row.id),
    title: row.title ?? "",
    description: row.description ?? "",
    category: row.category ?? "",
    subType: row.sub_type ?? undefined,
    landmark: row.landmark ?? undefined,
    status,
    upvotes: Number(row.upvote_count ?? 0),
    date: row.created_at
      ? String(row.created_at).slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    area: row.area ?? "",
    lat: Number(row.latitude),
    lng: Number(row.longitude),
    reporter: row.user_name ?? undefined,
    imageUrl: row.photo_url ?? undefined,
    fixImageUrl: row.fix_photo_url ?? undefined,
    // DB → UI: resolve day for auto-hide
    // DB → UI: resolve day for auto-hide
    resolvedAt: row.resolved_at ?? row.fixed_at ?? undefined,
    wardId:
      row.ward_id === null || row.ward_id === undefined ? undefined : Number(row.ward_id),
  };
}

export async function getComplaints(): Promise<Complaint[]> {
  try {
    const { data, error } = await supabase
      .from("complaints")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getComplaints error:", error);
      return []; // empty map — DO NOT return MOCK_COMPLAINTS
    }

    return (data ?? []).map(fromDb);
  } catch (err) {
    console.error("getComplaints exception:", err);
    return [];
  }
}

type WardHistoryPoint = { date: string; resolutionRate: number; open: number };

async function fetchAllWardHistory(sinceIso: string): Promise<any[]> {
  // PostgREST caps a single response at 1000 rows; 200 wards × 31 days can exceed that.
  const page = 1000;
  let from = 0;
  const all: any[] = [];
  while (true) {
    const { data, error } = await supabase
      .from("ward_history")
      .select("ward_id, recorded_at, open_count, resolution_rate")
      .gte("recorded_at", sinceIso)
      .order("recorded_at", { ascending: true })
      .order("ward_id", { ascending: true })
      .range(from, from + page - 1);
    if (error) {
      console.error("ward_history error:", error);
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < page) break;
    from += page;
  }
  return all;
}
/** One complaint by id; null if not found or on error. */
export async function getComplaintById(id: string): Promise<Complaint | null> {
  try {
    const { data, error } = await supabase
      .from("complaints")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("getComplaintById error:", error);
      return null;
    }
    return data ? fromDb(data) : null;
  } catch (err) {
    console.error("getComplaintById exception:", err);
    return null;
  }
}

/** Absolute shareable URL for a complaint (client-side only). */
export function complaintPermalink(id: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/complaint/${id}`;
}
/** All complaints for one ward, newest first. Empty array on error. */
export async function getComplaintsForWard(wardId: number): Promise<Complaint[]> {
  try {
    const { data, error } = await supabase
      .from("complaints")
      .select("*")
      .eq("ward_id", wardId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getComplaintsForWard error:", error);
      return [];
    }
    return (data ?? []).map(fromDb);
  } catch (err) {
    console.error("getComplaintsForWard exception:", err);
    return [];
  }
}
export async function getWardsFromDb(): Promise<Ward[]> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 31);
    const sinceIso = since.toISOString().slice(0, 10);

    const [wardsRes, historyRows] = await Promise.all([
      supabase.from("ward_analytics").select("*").order("id", { ascending: true }),
      fetchAllWardHistory(sinceIso),
    ]);

    if (wardsRes.error) {
      console.error("getWardsFromDb error:", wardsRes.error);
      return [];
    }
    const data = wardsRes.data;
    if (!data) return [];

    const historyByWard: Record<string, WardHistoryPoint[]> = {};
    for (const h of historyRows) {
      // skip "no data" snapshots so they don't drag trend lines to 0
      if (h.resolution_rate === null || h.resolution_rate === undefined) continue;
      const key = String(h.ward_id);
      if (!historyByWard[key]) historyByWard[key] = [];
      historyByWard[key].push({
        date: String(h.recorded_at).slice(0, 10),
        resolutionRate: Number(h.resolution_rate),
        open: Number(h.open_count ?? 0),
      });
    }

    return data.map((row: any) => ({
      id: row.id,
      name: row.ward_name ?? row.name ?? `Ward ${row.id}`,
      councillor: row.councillor_name ?? row.councillor ?? "Vacant",
      open: Number(row.open_count ?? row.open ?? 0),
      resolutionRate:
        row.resolution_rate === null || row.resolution_rate === undefined
          ? null
          : Number(row.resolution_rate),
      avgDays:
        row.avg_days === null || row.avg_days === undefined ? null : Number(row.avg_days),
      slaBreaches: Number(row.sla_breaches ?? row.slaBreaches ?? 0),
      zone: row.zone_name ?? row.zone ?? "Unknown Zone",
      history: historyByWard[String(row.id)] ?? [],
    }));
  } catch (err) {
    console.error("getWardsFromDb exception:", err);
    return [];
  }
}
export async function submitComplaintToDb(
  payload: Omit<Complaint, "id" | "upvotes" | "date" | "status">,
): Promise<{ complaint: Complaint | null; error: string | null }> {
  const { data, error } = await supabase
    .from("complaints")
    .insert([
      {
        title: payload.title,
        description: payload.description,
        category: payload.category,
        sub_type: payload.subType ?? null,
        landmark: payload.landmark ?? null,
        latitude: payload.lat,
        longitude: payload.lng,
        area: payload.area,
        user_name: payload.reporter ?? null,
        photo_url: payload.imageUrl ?? null,
        status: "Unresolved",
        upvote_count: 1,
      },
    ])
    .select("*")
    .single();

  if (error) {
    console.error("submitComplaint error:", error);
    return { complaint: null, error: error.message };
  }
  return { complaint: fromDb(data as DbComplaint), error: null };
}

export async function upvoteComplaintInDb(
  complaintId: string,
  fingerprint: string,
): Promise<{ error: string | null; duplicate?: boolean }> {
  const { error } = await supabase.from("upvotes").insert([
    { complaint_id: complaintId, voter_fingerprint: fingerprint },
  ]);

  if (error) {
    if (error.code === "23505") return { error: null, duplicate: true };
    console.error("upvote error:", error);
    return { error: error.message };
  }
  return { error: null };
}

export function rememberMyTicket(id: string) {
  const key = "civiclens_my_tickets";
  const prev = JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
  if (!prev.includes(id)) {
    localStorage.setItem(key, JSON.stringify([id, ...prev].slice(0, 50)));
  }
}

export function getMyTicketIds(): string[] {
  return JSON.parse(localStorage.getItem("civiclens_my_tickets") ?? "[]") as string[];
}

export async function uploadComplaintPhoto(
  file: File,
  kind: "before" | "after",
): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${kind}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from("complaint-photos")
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) {
    console.error("upload photo error:", error);
    return null;
  }

  const { data } = supabase.storage.from("complaint-photos").getPublicUrl(path);
  return data.publicUrl;
}

export async function markComplaintFixed(
  complaintId: string,
  fixPhotoUrl: string,
): Promise<{ error: string | null }> {
  const resolvedAt = new Date().toISOString();

  const { error } = await supabase
    .from("complaints")
    .update({
      status: "Resolved",
      fix_photo_url: fixPhotoUrl,
      resolved_at: resolvedAt,
      fixed_at: resolvedAt,
    })
    .eq("id", complaintId);

  if (error) {
    console.error("markComplaintFixed error:", error);
    return { error: error.message };
  }
  return { error: null };
}