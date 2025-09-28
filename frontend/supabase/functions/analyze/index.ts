// supabase/functions/analyze/index.ts
// Analyze a Storage image using OpenRouter moonshotai/kimi-vl-a3b-thinking:free.
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
  days_left?: number | null; // YYYY-MM-DD
};

const BUCKET = "produce-images";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

const OPENROUTER_KEYS: string[] = (() => {
  const raw = Deno.env.get("OPENROUTER_API_KEYS");
  try {
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  } catch {
    return [];
  }
})();

const OPENROUTER_MODEL =
  Deno.env.get("OPENROUTER_MODEL") ?? "moonshotai/kimi-vl-a3b-thinking:free";

// Hash helper: stable starting index for a given seed (e.g., image_path)
async function stableIndex(seed: string, len: number): Promise<number> {
  const enc = new TextEncoder().encode(seed);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  const view = new DataView(digest as ArrayBuffer);
  const u32 = view.getUint32(0, false); // first 4 bytes
  return u32 % len;
}

function isRetryable(status: number) {
  // Retry on rate limit / transient server issues
  return status === 429 || (status >= 500 && status < 600);
}

async function fetchWithTimeout(input: RequestInfo, init: RequestInit, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort("timeout"), ms);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

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

// DROP-IN replacement for callOpenRouter()
// - Round-robin across OPENROUTER_API_KEYS (JSON array secret) with stable per-image start
// - Falls back to OPENROUTER_API_KEY if array is missing
// - FOOD-ONLY: if no edible grocery detected, return ALL-NULL exactly
// - days_left (0–365 int); if missing, use preset days or 3
// - Retries without response_format if provider rejects it

async function callOpenRouter(imageUrl: string, seedForRR: string): Promise<AnalyzeResult> {
  const keys = OPENROUTER_KEYS.length > 0 ? OPENROUTER_KEYS : [Deno.env.get("OPENROUTER_API_KEY")!];
  if (!keys[0]) throw new Error("No OpenRouter API key(s) configured.");

  const TODAY_UTC = toISO(new Date());

  // --- helpers ---
  const ALL_NULL: AnalyzeResult = {
    name: null, label: null, store: null,
    storage: null, qty_type: null, qty_unit: null,
    qty_value: null, days_left: null,
  };
  function isSchemaErr(text: string) {
    return /response_format/i.test(text) && /schema/i.test(text);
  }
  function extractJson(s: string): any {
    try { return JSON.parse(s); } catch {}
    const i = s.indexOf("{"), j = s.lastIndexOf("}");
    if (i >= 0 && j > i) { try { return JSON.parse(s.slice(i, j + 1)); } catch {} }
    return {};
  }
  function isAllNull(obj: any) {
    return obj &&
      obj.name == null && obj.label == null && obj.store == null &&
      obj.storage == null && obj.qty_type == null && obj.qty_unit == null &&
      obj.qty_value == null && obj.days_left == null;
  }
  function normDays(n: any): number | null {
    if (typeof n !== "number" || !Number.isFinite(n)) return null;
    const v = Math.round(n);
    return Math.max(0, Math.min(365, v));
  }

  const start = await stableIndex(seedForRR, keys.length);

  // ----- concise prompts -----
  const system =
`You are a grocery analyzer. Output EXACTLY ONE JSON object (JSON only):
${JSON.stringify(ALL_NULL)}
Meanings:
- name: generic item ("Gala Apple", "Baby Spinach")
- label: friendly display; if store/brand visible, prefix it ("Trader Joe's Baby Spinach")
- store: retailer/brand if visible
- storage: "counter" | "fridge" | "freezer" | null
- qty_type: "count" | "weight" | "volume" | "bunch" | "other" | null
- qty_unit: string or null
- qty_value: number or null
- days_left: integer 0–365 or null

FOOD-ONLY:
- Detect only edible groceries (produce, packaged, dairy, meat, bakery, pantry, frozen).
- If no edible grocery is clearly visible, RETURN THIS EXACT OBJECT:
${JSON.stringify(ALL_NULL)}`;

  const cheat =
`Shelf-life presets (rough days): ${
  Object.values(PRESETS).map(v => `${v.display}=${v.storage}~${v.days}d`).join(", ")
}

Visual cues (shorten/extend days_left):
- Bananas: green 5–7d; yellow 3–4d; many specks 1–2d; black/ooze 0–1d
- Berries: mold/wet/leaking/shriveled caps → 0–2d; firm/dry → longer
- Leafies: wilt/yellow/slime → short; crisp/vibrant → longer
- Avocados: very soft/black at stem → short; gentle yield → longer
- Tomatoes: wrinkled/soft/leaking → short; taut skin → longer
- Citrus: soft spots/mold → short; heavy/firm → longer
- Grapes: shriveled/brown stems → short; plump/tight → longer
- Cucumbers/Peppers: soft/pitting/wrinkles → short; smooth/firm → longer
- Brassicas: yellowing/mushy → short; tight heads → longer
- Mushrooms: slime/dark wet → short; dry/firm → longer
- Onions/Garlic: sprout/soft → shorter; dry/firm → longer
- Potatoes: many sprouts/soft/green → shorter; firm → longer`;

  const userText =
`TODAY_UTC is ${TODAY_UTC}.

Task:
1) If NO edible grocery is present, return the ALL-NULL object above.
2) If food is present, identify the DOMINANT item and fill the JSON.
3) For days_left:
   - If a "best/use/sell-by" DATE is visible, compute days_left = max(0, floor(date - TODAY_UTC in days)).
   - Else estimate using presets and adjust with the visual cues. For SAME items, use the most perishable-looking; for DIFFERENT items, still scan ALL items to inform days_left of the dominant item.
4) If store/brand text is visible, set "store" and prefix "label" with it.

Defaults if unknown: qty_type="count", qty_unit="ea", qty_value=1.
storage must be one of {'counter','fridge','freezer'} or null.
Return JSON ONLY.

${cheat}`;

  const basePayload: any = {
    model: OPENROUTER_MODEL,
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

  const endpoint = "https://openrouter.ai/api/v1/chat/completions";
  const errors: string[] = [];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[(start + i) % keys.length];

    for (let attempt = 0; attempt < 2; attempt++) {
      const payload = attempt === 0
        ? { ...basePayload, response_format: { type: "json_object" } }
        : { ...basePayload };

      try {
        const res = await fetchWithTimeout(
          endpoint,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
              "HTTP-Referer": SUPABASE_URL,
              "X-Title": "ShelfLife / analyze",
            },
            body: JSON.stringify(payload),
          },
          15000
        );

        const text = await res.text();
        if (!res.ok) {
          if (attempt === 0 && res.status === 400 && isSchemaErr(text)) {
            // provider rejected response_format → retry same key without it
            continue;
          }
          if (isRetryable(res.status)) {
            errors.push(`key#${(start + i) % keys.length} -> ${res.status}: ${text.slice(0, 160)}`);
            break; // try next key
          }
          throw new Error(`OpenRouter ${res.status}: ${text}`);
        }

        // Parse
        const outer = JSON.parse(text);
        const raw = outer?.choices?.[0]?.message?.content ?? "{}";
        const parsed = extractJson(raw) as AnalyzeResult;

        // STRICT no-food path: return ALL-NULL exactly
        if (isAllNull(parsed)) return parsed;

        // Fill defaults & preset-based fallbacks
        const nameOrLabel = (parsed.name ?? parsed.label) ?? undefined;
        let preset = null as null | { display: string; storage: StorageKind; days: number };
        if (nameOrLabel) {
          const q = String(nameOrLabel).toLowerCase().replace(/\s+/g, "");
          for (const [k, v] of Object.entries(PRESETS)) {
            if (q.includes(k) || q.includes(`${k}s`)) { preset = v; break; }
          }
        }

        const days = normDays(parsed.days_left) ?? preset?.days ?? 3;

        return {
          name: preset?.display ?? parsed.name ?? "Unlabeled",
          label: parsed.label ?? preset?.display ?? parsed.name ?? "Unlabeled",
          store: parsed.store ?? null,
          storage: (parsed.storage as StorageKind) ?? preset?.storage ?? "counter",
          qty_type: (parsed.qty_type as QtyType) ?? "count",
          qty_unit: parsed.qty_unit ?? "ea",
          qty_value: typeof parsed.qty_value === "number" && parsed.qty_value > 0 ? parsed.qty_value : 1,
          days_left: days,
        };
      } catch (e: any) {
        if (attempt === 0) continue; // fall through to no-response_format attempt
        errors.push(`key#${(start + i) % keys.length} -> ${e?.message || e}`);
      }
    }
  }

  throw new Error(`All OpenRouter keys failed. Attempts: ${errors.join(" | ")}`);
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
    const result = await callOpenRouter(url, image_path);

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
