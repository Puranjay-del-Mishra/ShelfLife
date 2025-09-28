// src/lib/edge.ts
import { supabase } from "@/lib/supabase";

export const BUCKET = "produce-images";

export type AnalyzeResult = {
  name?: string;
  label?: string;
  store?: string;
  storage?: "counter" | "fridge" | "freezer";
  qty_type?: "count" | "weight" | "volume" | "bunch" | "other";
  qty_unit?: string;
  qty_value?: number;
  best_by?: string; // ISO YYYY-MM-DD
  // optional extras your function might return
  confidence?: number;
  notes?: string;
};

export async function uploadRawImage(file: File, userId: string) {
  const ext = file.type.includes("png") ? "png" : "jpg";
  const path = `raw/${userId}/${Date.now()}-${
    (crypto as any).randomUUID?.() ?? Math.random().toString(36).slice(2)
  }.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });

  if (error) throw error;
  return path;
}

export async function analyzeImage(storagePath: string): Promise<AnalyzeResult> {
  const { data, error } = await supabase.functions.invoke("analyze", {
    body: { image_path: storagePath },
  });
  if (error) throw error;

  // Accept both shapes: { ...fields } or { analysis: { ...fields } }
  const payload = (data && typeof data === "object" && "analysis" in (data as any))
    ? (data as any).analysis
    : data;
  console.log('Payload: ', payload)
  return (payload ?? {}) as AnalyzeResult;
}

export async function signedImageUrl(path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase
    .storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function notifyNow(opts?: { dryRun?: boolean }) {
  const { data, error } = await supabase.functions.invoke("notify", { body: opts ?? {} });
  if (error) throw error;
  return data;
}
