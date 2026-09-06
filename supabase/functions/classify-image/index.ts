// supabase/functions/classify-image/index.ts
// Purpose: Proxy Gemini API calls so VITE_GEMINI_API_KEY never reaches the browser.
//          Enforces rate limits per IP + fingerprint.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-fingerprint",
};

// Rate limit store (in-memory; resets on deploy, fine for v1)
const rateWindowMs = 60_000; // 1 minute window
const maxRequestsPerWindow = 5; // per fingerprint+IP combo
const recentRequests = new Map<string, number[]>();

serve(async (req) => {
    // Preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
        const { imageData, mimeType, categories, promptText, fingerprint } = await req.json();

        // --- Rate Limit Check ---
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const rateKey = `${fingerprint}:${ip}`;
        const now = Date.now();

        const windowStart = now - rateWindowMs;
        let timestamps = recentRequests.get(rateKey) || [];
        timestamps = timestamps.filter(t => t > windowStart);

        if (timestamps.length >= maxRequestsPerWindow) {
            return new Response(
                JSON.stringify({ error: "Rate limit exceeded. Please wait before retrying." }),
                { status: 429, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
            );
        }

        timestamps.push(now);
        recentRequests.set(rateKey, timestamps);

        // --- Gemini Call ---
        const apiKey = Deno.env.get("GEMINI_API_KEY");
        if (!apiKey) {
            throw new Error("Server misconfiguration: Gemini key missing");
        }

        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: promptText },
                                { inline_data: { mime_type: mimeType || "image/jpeg", data: imageData } },
                            ],
                        },
                    ],
                    generationConfig: {
                        response_mime_type: "application/json",
                    },
                }),
            }
        );

        if (!geminiResponse.ok) {
            const errBody = await geminiResponse.text();
            console.error("Gemini API error:", geminiResponse.status, errBody);

            if (geminiResponse.status === 429) {
                return new Response(JSON.stringify({ error: "Gemini API overloaded. Retry in 60s." }),
                    { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
            }
            throw new Error(`Gemini ${geminiResponse.status}: ${errBody}`);
        }

        const data = await geminiResponse.json();

        return new Response(
            JSON.stringify({ result: data.candidates?.[0]?.content?.parts?.[0]?.text }),
            { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );

    } catch (err) {
        return new Response(
            JSON.stringify({ error: err.message || "Internal error" }),
            { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }
});