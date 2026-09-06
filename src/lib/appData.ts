import { getComplaints, getWardsFromDb, type Complaint, type Ward } from "@/data/civic";

type Preload = {
    complaints: Promise<Complaint[]>;
    wards: Promise<Ward[]>;
    all: Promise<void>;
};

let inflight: Preload | null = null;
let cachedComplaints: { data: Complaint[]; at: number } | null = null;
let cachedWards: { data: Ward[]; at: number } | null = null;

const FRESH_MS = 5 * 60_000;

/** Starts both fetches once per page load; safe to call from many places. */
export function preloadAppData(): Preload {
    if (!inflight) {
        const complaints = getComplaints().then((d) => { cachedComplaints = { data: d, at: Date.now() }; return d; });
        const wards = getWardsFromDb().then((d) => { cachedWards = { data: d, at: Date.now() }; return d; });
        inflight = { complaints, wards, all: Promise.all([complaints, wards]).then(() => undefined) };
    }
    return inflight;
}

/** Instant initial render for the ward view; caller should still refetch silently in the background. */
export function peekPreloadedWards(): Ward[] | null {
    if (!cachedWards || Date.now() - cachedWards.at > FRESH_MS) return null;
    return cachedWards.data;
}

export function peekPreloadedComplaints(): Complaint[] | null {
    if (!cachedComplaints || Date.now() - cachedComplaints.at > FRESH_MS) return null;
    return cachedComplaints.data;
}