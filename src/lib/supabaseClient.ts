import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
    (import.meta.env["VITE_SUPABASE_URL"] as string | undefined)?.trim() ||
    "https://placeholder.supabase.co";

const supabaseKey =
    (import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined)?.trim() ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

const isPlaceholder =
    supabaseUrl.includes("placeholder") || supabaseKey.includes("placeholder");

if (isPlaceholder) {
    console.warn(
        "⚠️ Supabase URL or Anon Key is missing — using placeholder client (OK for unit tests).",
    );
}

/**
 * Realtime JS expects a WebSocket constructor. Browsers have one; Node 20 CI does not.
 * Provide a no-op transport so createClient() can finish without throwing during vitest.
 */
class StubWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    readyState = StubWebSocket.CLOSED;
    binaryType = "blob";
    bufferedAmount = 0;
    extensions = "";
    protocol = "";
    url = "";
    onopen: ((ev: Event) => void) | null = null;
    onclose: ((ev: CloseEvent) => void) | null = null;
    onerror: ((ev: Event) => void) | null = null;
    onmessage: ((ev: MessageEvent) => void) | null = null;
    constructor(_url: string | URL, _protocols?: string | string[]) { }
    close(_code?: number, _reason?: string) { }
    send(_data: string | ArrayBufferLike | Blob | ArrayBufferView) { }
    addEventListener() { }
    removeEventListener() { }
    dispatchEvent(_event: Event): boolean {
        return false;
    }
}

const hasNativeWebSocket =
    typeof WebSocket !== "undefined" ||
    typeof (globalThis as { WebSocket?: unknown }).WebSocket !== "undefined";

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: typeof window !== "undefined",
        autoRefreshToken: typeof window !== "undefined",
        detectSessionInUrl: typeof window !== "undefined",
    },
    ...(hasNativeWebSocket
        ? {}
        : {
            realtime: {
                // Used only in Node/vitest; browser uses real WebSocket
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                transport: StubWebSocket as any,
            },
        }),
});