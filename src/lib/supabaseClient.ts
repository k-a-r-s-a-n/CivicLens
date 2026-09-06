import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
    (import.meta.env["VITE_SUPABASE_URL"] as string | undefined)?.trim() ||
    "https://placeholder.supabase.co";

const supabaseKey =
    (import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined)?.trim() ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

if (
    supabaseUrl.includes("placeholder") ||
    supabaseKey.includes("placeholder")
) {
    console.warn(
        "⚠️ Supabase URL or Anon Key is missing — using placeholder client (OK for unit tests).",
    );
}

export const supabase = createClient(supabaseUrl, supabaseKey);