import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const supabaseKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;

if (!supabaseUrl || !supabaseKey) {
    console.warn("⚠️ Supabase URL or Anon Key is missing in environment variables.");
}

export const supabase = createClient(supabaseUrl ?? "", supabaseKey ?? "");