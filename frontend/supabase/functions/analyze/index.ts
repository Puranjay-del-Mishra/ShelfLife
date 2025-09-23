// supabase/functions/analyze/index.ts
// Analyze a Storage image using OpenRouter Llama 3.2-90B Vision.
// Returns a strict AnalyzeResult JSON your frontend already consumes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type StorageKind = "counter" | "fridge" | "freezer";
type QtyType = "count" | "weight" | "volume" | "bunch" | "other";

type AnalyzeResult = {
  name?: string;
  label?: string;
  store?: string | null;
  storage?: StorageKind;
  qty_type?: QtyType;
  qty_unit?: string;
  qty_value?: number;
  best_by?: string; // YYYY-MM-DD
};

const BUCKET = "produce-images";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY")!;
const OPENROUTER_MODEL =
  Deno.env.get("OPENROUTER_MODEL") ??
  "meta-llama/llama-3.2-90b-vision-instruct";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
function daysFromNow(n: number) {
  const now = new Date();
  return toISO(new Date(now.getTime() + n * 86400000));
}

// A wider cheat-sheet to help the model be consistent.
// It’s fine if the model goes off-list; this just nudges it.
const PRESETS: Record<
  string,
  { display: string; storage: StorageKind; days: number }
> = {
  banana: { display: "Banana", storage: "counter", days: 4 },
  apple: { display: "Apple", storage: "counter", days: 7 },
  avocado: { display: "Avocado", storage: "counter", days: 4 },
  tomato: { display: "Tomato", storage: "counter", days: 4 },
  onion: { display: "Onion", storage: "counter", days: 14 },
  garlic: { display: "Garlic", storage: "counter", days: 21 },
  potato: { display: "Potato", storage: "counter", days: 21 },
  orange: { display: "Orange", storage: "counter", days: 10 },
  lemon: { display: "Lemon", storage: "counter", days: 10 },
  lime: { display: "Lime", storage: "counter", days: 10 },

  lettuce: { display: "Lettuce", storage: "fridge", days: 5 },
  spinach: { display: "Spinach", storage: "fridge", days: 4 },
  kale: { display: "Kale", storage: "fridge", days: 5 },
  broccoli: { display: "Broccoli", storage: "fridge", days: 6 },
  cucumber: { display: "Cucumber", storage: "fridge", days: 6 },
  bellpepper: { display: "Bell Pepper", storage: "fridge", days: 7 },
  carrot: { display: "Carrot", storage: "fridge", days: 10 },
  celery: { display: "Celery", storage: "fridge", days: 10 },
  mushroom: { display: "Mushroom", storage: "fridge", days: 4 },
  grape: { display: "Grapes", storage: "fridge", days: 5 },
  strawberry: { display: "Strawberries", storage: "fridge", days: 3 },
  blueberry: { display: "Blueberries", storage: "fridge", days: 5 },
  raspberry: { display: "Raspberries", storage: "fridge", days: 3 },
  cheese: { display: "Cheese", storage: "fridge", days: 14 },
  milk: { display: "Milk", storage: "fridge", days: 7 },
  yogurt: { display: "Yogurt", storage: "fridge", days: 10 },
  chicken: { display: "Raw Chicken", storage: "fridge", days: 2 },
  beef: { display: "Raw Beef", storage: "fridge", days: 3 },
  pork: { display: "Raw Pork", storage: "fridge", days: 3 },
  fish: { display: "Raw Fish", storage: "fridge", days: 2 },
  bread: { display: "Bread", storage: "counter", days: 4 },

  peas: { display: "Peas (Frozen)", storage: "freezer", days: 180 },
  corn: { display: "Corn (Frozen)", storage: "freezer", days: 180 },
  berries: { display: "Berries (Frozen)", storage: "freezer", days: 180 },
  chickenfrozen: { display: "Chicken (Frozen)", storage: "freezer", days: 270 },
  beeffrozen: { display: "Beef (Frozen)", storage: "freezer", days: 270 },
};

function findPreset(s?: string) {
  const q = (s ?? "").toLowerCase().replace(/\s+/g, "");
  let best: { k: string; v: (typeof PRESETS)[string] } | null = null;
  for (const k of Object.keys(PRESETS)) {
    if (q.includes(k) || q.includes(`${k}s`)) {
      best = { k, v: PRESETS[k] };
      break;
    }
  }
  return best?.v ?? null;
}

async function signUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 120);
  if (error || !data?.signedUrl) throw new Error("Unable to sign image URL");
  return data.signedUrl;
}

async function callOpenRouter(imageUrl: string): Promise<AnalyzeResult> {
  const system = [
    "You are a grocery item analyzer.",
    "Return ONLY a valid JSON object with these keys:",
    JSON.stringify({
      name: "string | null",
      label: "string | null",
      store: "string | null",
      storage: "counter | fridge | freezer | null",
      qty_type: "count | weight | volume | bunch | other | null",
      qty_unit: "string | null",
      qty_value: "number | null",
      best_by: "YYYY-MM-DD | null",
    }),
    "Rules:",
    "- If unsure, use null for store; defaults for qty: qty_type='count', qty_unit='ea', qty_value=1.",
    "- storage MUST be one of: 'counter', 'fridge', 'freezer'.",
    "- Estimate 'best_by' as YYYY-MM-DD based on typical shelf life.",
    "- If multiple items in view, pick the single most central/obvious item.",
    "- Do not include extra text; only JSON.",
  ].join("\n");

  const cheat = [
    "Shelf-life cheat sheet (typical, approximate):",
    ...Object.entries(PRESETS).map(
      ([k, v]) => `- ${v.display}: ${v.storage}, ~${v.days} days`
    ),
  ].join("\n");

  const userText = [
    "Identify the produce and fill the JSON. If name is generic (e.g., 'Apple'), label can be shorter.",
    "If uncertain, still pick the most likely item.",
    cheat,
  ].join("\n\n");

  const body = {
    model: OPENROUTER_MODEL,
    response_format: { type: "json_object" }, // ask for strict JSON
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
  };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${t}`);
  }

  const json = await res.json();
  const raw = json?.choices?.[0]?.message?.content ?? "{}";
  let parsed: AnalyzeResult;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  // Apply sensible defaults & fallback to presets.
  const preset = findPreset(parsed.name || parsed.label);
  const bestBy =
    parsed.best_by ?? (preset ? daysFromNow(preset.days) : daysFromNow(3));

  return {
    name: preset?.display ?? parsed.name ?? "Unlabeled",
    label: parsed.label ?? preset?.display ?? parsed.name ?? "Unlabeled",
    store: parsed.store ?? null,
    storage: (parsed.storage as StorageKind) ?? preset?.storage ?? "counter",
    qty_type: (parsed.qty_type as QtyType) ?? "count",
    qty_unit: parsed.qty_unit ?? "ea",
    qty_value:
      typeof parsed.qty_value === "number" && parsed.qty_value > 0
        ? parsed.qty_value
        : 1,
    best_by: bestBy,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { image_path } = await req.json().catch(() => ({}));
    if (!image_path) {
      return new Response(JSON.stringify({ error: "Missing image_path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = await signUrl(image_path);
    const result = await callOpenRouter(url);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("/analyze error:", err);
    return new Response(JSON.stringify({ error: "Analyze failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
