import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-fingerprint",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const rateWindowMs = 60_000;
const maxRequestsPerWindow = 5;
const recentRequests = new Map<string, number[]>();
const MAX_BODY_BYTES = 6_000_000;
const MAX_IMAGE_CHARS = 5_500_000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ error: "Request too large" }, 413);
  }

  try {
    const body = (await req.json()) as {
      imageData?: unknown;
      mimeType?: unknown;
      promptText?: unknown;
      fingerprint?: unknown;
    };

    const imageData = typeof body.imageData === "string" ? body.imageData : "";
    const promptText = typeof body.promptText === "string" ? body.promptText : "";
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "image/jpeg";

    if (!imageData || !promptText || imageData.length > MAX_IMAGE_CHARS) {
      return json({ error: "Invalid request" }, 400);
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
      return json({ error: "Unsupported image type" }, 400);
    }

    const headerFp = req.headers.get("x-fingerprint")?.trim() ?? "";
    const bodyFp = typeof body.fingerprint === "string" ? body.fingerprint.trim() : "";
    const fingerprint = (headerFp || bodyFp || "anon").slice(0, 128);

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateKey = `${fingerprint}:${ip}`;
    const now = Date.now();
    const timestamps = (recentRequests.get(rateKey) ?? []).filter((t) => t > now - rateWindowMs);
    if (timestamps.length >= maxRequestsPerWindow) {
      return json({ error: "Rate limit exceeded. Please wait before retrying." }, 429);
    }
    timestamps.push(now);
    recentRequests.set(rateKey, timestamps);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("Gemini key missing");
      return json({ error: "Classification unavailable" }, 503);
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
                { inline_data: { mime_type: mimeType, data: imageData } },
              ],
            },
          ],
          generationConfig: { response_mime_type: "application/json" },
        }),
      },
    );

    if (!geminiResponse.ok) {
      console.error("Gemini API error:", geminiResponse.status);
      if (geminiResponse.status === 429) {
        return json({ error: "Classifier busy. Retry in 60s." }, 503);
      }
      return json({ error: "Classification failed" }, 502);
    }

    const data = await geminiResponse.json();
    return json({ result: data.candidates?.[0]?.content?.parts?.[0]?.text }, 200);
  } catch (err) {
    console.error("classify-image:", err instanceof Error ? err.message : "error");
    return json({ error: "Internal error" }, 500);
  }
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
