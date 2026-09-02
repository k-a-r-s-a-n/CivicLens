import { supabase } from "@/lib/supabaseClient";

export type ComplaintStatus = "Unresolved" | "In Progress" | "Resolved";

export type Complaint = {
  id: string;
  title: string;
  description: string;
  category: string;
  subType?: string;
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
};

export type Ward = {
  id?: number;
  name: string;
  zone?: string;
  councillor: string;
  open: number;
  resolutionRate: number;
  avgDays: number;
  slaBreaches: number;
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

export const STATUS_COLOR: Record<ComplaintStatus, string> = {
  Unresolved: "#dc2626",
  "In Progress": "#eab308",
  Resolved: "#16a34a",
};

export const MOCK_COMPLAINTS: Complaint[] = [
  {
    id: "c1",
    title: "Crater-sized pothole on Usman Road",
    description:
      "A deep pothole near the Pondy Bazaar junction has caused three two-wheeler skids this week. Unmarked and unlit at night.",
    category: "Roads & Footpaths",
    subType: "Pothole fill up / Repairs",
    status: "Unresolved",
    upvotes: 214,
    date: "2026-08-11",
    area: "T. Nagar",
    lat: 13.0418,
    lng: 80.2341,
  },
  {
    id: "c2",
    title: "Garbage pile outside Ranganathan Street",
    description:
      "Uncollected commercial waste has been rotting for nine days. Stray dogs scatter it across the footpath every morning.",
    category: "Garbage & Solid Waste",
    subType: "Overflowing Garbage Bin",
    status: "In Progress",
    upvotes: 168,
    date: "2026-08-04",
    area: "T. Nagar",
    lat: 13.0389,
    lng: 80.2338,
  },
  {
    id: "c3",
    title: "Streetlights dead on Venkatanarayana Road",
    description:
      "An entire 400m stretch has been dark since the last storm. Unsafe for women walking home after 8pm.",
    category: "Streetlights",
    subType: "Non burning of Street lights",
    status: "Resolved",
    upvotes: 92,
    date: "2026-07-19",
    area: "T. Nagar",
    lat: 13.0362,
    lng: 80.2384,
  },
  {
    id: "c4",
    title: "Sewage overflow near Velachery MRTS",
    description:
      "Drain manhole overflowing onto the approach road to the station. Commuters wade through it during peak hours.",
    category: "Water & Drainage",
    subType: "Sewage Overflow",
    status: "Unresolved",
    upvotes: 301,
    date: "2026-08-16",
    area: "Velachery",
    lat: 12.9756,
    lng: 80.2207,
  },
  {
    id: "c5",
    title: "Water main leak on 100 Feet Road",
    description:
      "Treated drinking water gushing out of a burst pipe for over two weeks. Enormous daily wastage.",
    category: "Water & Drainage",
    subType: "Obstruction of Water Flow",
    status: "In Progress",
    upvotes: 143,
    date: "2026-08-07",
    area: "Velachery",
    lat: 12.9812,
    lng: 80.2181,
  },
  {
    id: "c6",
    title: "Stray dog pack near Velachery Lake",
    description:
      "Aggressive pack of 8-10 dogs around the lake walkway. Two morning walkers bitten last month.",
    category: "Public Health & Safety",
    subType: "Death of Stray Animals",
    status: "Unresolved",
    upvotes: 76,
    date: "2026-08-13",
    area: "Velachery",
    lat: 12.9698,
    lng: 80.2255,
  },
  {
    id: "c7",
    title: "Broken footpath slabs on Sardar Patel Road",
    description:
      "Loose concrete slabs over an open drain right outside the bus stop. A child stepped through last week.",
    category: "Roads & Footpaths",
    subType: "Illegal parking on footpath",
    status: "In Progress",
    upvotes: 118,
    date: "2026-08-02",
    area: "Adyar",
    lat: 13.0067,
    lng: 80.2515,
  },
  {
    id: "c8",
    title: "Garbage bins never emptied in Kasturba Nagar",
    description:
      "Bins on the 3rd Main Road overflow by noon daily. Collection truck skips this lane entirely.",
    category: "Garbage & Solid Waste",
    subType: "Absenteeism of Sweepers",
    status: "Resolved",
    upvotes: 64,
    date: "2026-07-28",
    area: "Adyar",
    lat: 13.0032,
    lng: 80.2564,
  },
  {
    id: "c9",
    title: "Flooded junction at Adyar Signal",
    description:
      "Even 20 minutes of rain leaves knee-deep water. Stormwater drain outlet appears fully blocked.",
    category: "Water & Drainage",
    subType: "Stagnation of Water",
    status: "Unresolved",
    upvotes: 259,
    date: "2026-08-18",
    area: "Adyar",
    lat: 13.0102,
    lng: 80.2559,
  },
  {
    id: "c10",
    title: "Potholes along North Mada Street",
    description:
      "Temple processional route riddled with potholes after cable-laying work was left unrepaired.",
    category: "Roads & Footpaths",
    subType: "Pothole fill up / Repairs",
    status: "In Progress",
    upvotes: 187,
    date: "2026-08-09",
    area: "Mylapore",
    lat: 13.0339,
    lng: 80.2686,
  },
  {
    id: "c11",
    title: "Streetlight pole leaning dangerously",
    description:
      "A rusted pole near Luz Corner tilts over the footpath. Live wiring exposed at the base.",
    category: "Streetlights",
    subType: "Damage to the Electric pole",
    status: "Unresolved",
    upvotes: 133,
    date: "2026-08-15",
    area: "Mylapore",
    lat: 13.0368,
    lng: 80.2652,
  },
  {
    id: "c12",
    title: "Illegal dumping on 2nd Avenue",
    description:
      "Construction debris dumped nightly on the service lane, narrowing the road to a single vehicle.",
    category: "Garbage & Solid Waste",
    subType: "Removal of Debris",
    status: "Unresolved",
    upvotes: 97,
    date: "2026-08-12",
    area: "Anna Nagar",
    lat: 13.0878,
    lng: 80.2101,
  },
  {
    id: "c13",
    title: "Water tanker supply skipped for 5 days",
    description:
      "Metro water tanker has not reached the K Block streets. Residents buying private cans at ₹80 each.",
    category: "Water & Drainage",
    subType: "Obstruction of Water Flow",
    status: "Resolved",
    upvotes: 152,
    date: "2026-07-24",
    area: "Anna Nagar",
    lat: 13.0925,
    lng: 80.2178,
  },
  {
    id: "c14",
    title: "Open drain beside Porur Lake Road",
    description:
      "Unfenced drain running along the pedestrian path. No barricades, no warning signage at night.",
    category: "Water & Drainage",
    subType: "Desilting of Drain / Canal",
    status: "In Progress",
    upvotes: 88,
    date: "2026-08-06",
    area: "Porur",
    lat: 13.0359,
    lng: 80.1567,
  },
  {
    id: "c15",
    title: "Pothole cluster near Tambaram Station",
    description:
      "Approach road to the suburban station has over a dozen potholes. Autos refuse the last 200 metres.",
    category: "Roads & Footpaths",
    subType: "Pothole fill up / Repairs",
    status: "Unresolved",
    upvotes: 226,
    date: "2026-08-17",
    area: "Tambaram",
    lat: 12.9249,
    lng: 80.1,
  },
];

export const WARDS: Ward[] = [
  { id: 176, name: "Ward 176 - Thiruvanmiyur South", zone: "Zone 13 - Adyar", councillor: "V. Anandam", open: 85, resolutionRate: 22, avgDays: 24, slaBreaches: 18 },
  { id: 35, name: "Ward 35 - Mottai Thottam", zone: "Zone 4 - Tondiarpet", councillor: "S. Jeevan", open: 78, resolutionRate: 27, avgDays: 22, slaBreaches: 16 },
  { id: 15, name: "Ward 15 - Edyanchavadi", zone: "Zone 2 - Manali", councillor: "S. Nandhini", open: 71, resolutionRate: 31, avgDays: 20, slaBreaches: 14 },
  { id: 1, name: "Ward 1 - Kathivakkam", zone: "Zone 1 - Thiruvottiyur", councillor: "M. Sivakumar", open: 65, resolutionRate: 36, avgDays: 18, slaBreaches: 12 },
  { id: 84, name: "Ward 84 - Ambattur Industrial Estate", zone: "Zone 7 - Ambattur", councillor: "J. John", open: 59, resolutionRate: 41, avgDays: 16, slaBreaches: 10 },
  { id: 145, name: "Ward 145 - Maduravoyal", zone: "Zone 11 - Valasaravakkam", councillor: "T. Sathyanathan", open: 53, resolutionRate: 46, avgDays: 15, slaBreaches: 9 },
  { id: 142, name: "Ward 142 - Velachery North", zone: "Zone 10 - Kodambakkam", councillor: "M. Krishnamoorthy", open: 47, resolutionRate: 51, avgDays: 13, slaBreaches: 7 },
  { id: 123, name: "Ward 123 - Mylapore Central", zone: "Zone 9 - Teynampet", councillor: "M. Saraswathi", open: 41, resolutionRate: 56, avgDays: 12, slaBreaches: 6 },
  { id: 174, name: "Ward 174 - Adyar South", zone: "Zone 13 - Adyar", councillor: "M. Rathika", open: 36, resolutionRate: 61, avgDays: 10, slaBreaches: 5 },
  { id: 98, name: "Ward 98 - Anna Nagar West", zone: "Zone 8 - Anna Nagar", councillor: "A. Priyadharshini", open: 31, resolutionRate: 65, avgDays: 9, slaBreaches: 4 },
  { id: 106, name: "Ward 106 - Kilpauk South", zone: "Zone 8 - Anna Nagar", councillor: "N. Ramalingam", open: 27, resolutionRate: 69, avgDays: 8, slaBreaches: 3 },
  { id: 112, name: "Ward 112 - T. Nagar North", zone: "Zone 9 - Teynampet", councillor: "Elizabeth Augustine", open: 23, resolutionRate: 73, avgDays: 7, slaBreaches: 3 },
  { id: 155, name: "Ward 155 - Porur Lake", zone: "Zone 11 - Valasaravakkam", councillor: "K. Raju", open: 19, resolutionRate: 77, avgDays: 6, slaBreaches: 2 },
  { id: 182, name: "Ward 182 - Perungudi South", zone: "Zone 14 - Perungudi", councillor: "K.P.K. Sathish Kumar", open: 15, resolutionRate: 81, avgDays: 5, slaBreaches: 1 },
  { id: 191, name: "Ward 191 - Pallikaranai", zone: "Zone 14 - Perungudi", councillor: "J.L. Lakshmi", open: 12, resolutionRate: 85, avgDays: 4, slaBreaches: 1 },
];

export function wardStatus(rate: number): { label: string; tone: "bad" | "mid" | "good" } {
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

function fromDb(row: DbComplaint): Complaint {
  const status = (["Unresolved", "In Progress", "Resolved"].includes(row.status)
    ? row.status
    : row.status === "Pending Audit"
      ? "In Progress"
      : "Unresolved") as ComplaintStatus;

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    category: row.category,
    subType: row.sub_type ?? undefined,
    landmark: row.landmark ?? undefined,
    status,
    upvotes: row.upvote_count ?? 0,
    date: row.created_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    area: row.area,
    lat: Number(row.latitude),
    lng: Number(row.longitude),
    reporter: row.user_name ?? undefined,
    imageUrl: row.photo_url ?? undefined,
    fixImageUrl: row.fix_photo_url ?? undefined,
  };
}

export async function getComplaints(): Promise<Complaint[]> {
  const { data, error } = await supabase
    .from("complaints")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getComplaints error:", error);
    return MOCK_COMPLAINTS;
  }
  return (data as DbComplaint[]).map(fromDb);
}

export async function getWardsFromDb(): Promise<Ward[]> {
  const { data, error } = await supabase
    .from("ward_analytics")
    .select("*")
    .order("id", { ascending: true });

  if (error || !data || data.length === 0) {
    console.error("getWardsFromDb error:", error);
    return WARDS;
  }

  return data.map((row: any) => ({
    id: row.id,
    name: row.ward_name,
    zone: row.zone_name ?? "Zone",
    councillor: row.councillor_name,
    open: row.open_count ?? 0,
    resolutionRate: row.resolution_rate ?? 0,
    avgDays: row.open_count > 0 ? 7 : 0,
    slaBreaches: Math.floor((row.open_count ?? 0) * 0.15),
  }));
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
  const { error } = await supabase
    .from("complaints")
    .update({
      fix_photo_url: fixPhotoUrl,
      status: "Resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", complaintId);

  if (error) {
    console.error("mark fixed error:", error);
    return { error: error.message };
  }
  return { error: null };
}