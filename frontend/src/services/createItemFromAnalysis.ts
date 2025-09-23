// src/services/createItemFromAnalysis.ts
import { supabase } from "@/lib/supabase";
import type { AnalyzeResult } from "@/lib/edge";
import type { Storage, Item } from "@/types/domain";

type QtyType = Item["qty_type"];

function clampStorage(s?: string): Storage {
  return (["counter", "fridge", "freezer"] as const).includes(s as Storage)
    ? (s as Storage)
    : "counter";
}

function clampQtyType(t?: string): QtyType {
  return (["count", "weight", "volume", "bunch", "other"] as const).includes(t as QtyType)
    ? (t as QtyType)
    : "count";
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function diffDays(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export async function createItemFromAnalysis(
  userId: string,
  image_path: string,
  a: AnalyzeResult
) {
  const name = a.name?.trim() || "Unlabeled";
  const label = a.label?.trim() || name;
  const storage: Storage = clampStorage(a.storage);
  const qty_type: QtyType = clampQtyType(a.qty_type);
  const qty_unit = a.qty_unit?.trim() || "ea";
  const hasValidQty = typeof a.qty_value === "number" && a.qty_value > 0;
  const qty_value = hasValidQty ? a.qty_value! : 1;
  const qty_is_estimated = !hasValidQty;

  let initial_days_left: number | null = null;
  let days_left: number | null = null;

  if (a.best_by) {
    const best = new Date(a.best_by);
    const today = new Date();
    const d = diffDays(today, best);
    initial_days_left = d;
    days_left = d;
  }

  const payload = {
    user_id: userId,
    name,
    label,
    store: a.store ?? null,
    storage,
    acquired_at: isoToday(),
    image_path,

    initial_days_left,
    days_left,
    last_vlm_at: new Date().toISOString(), // marks that analysis ran

    qty_type,
    qty_unit,
    qty_value,
    qty_is_estimated,
    // qty_base, initial_qty_base, freshness_score, freshness_stage:
    // let DB defaults compute / remain null
  };

  const { data, error } = await supabase
    .from("items")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
