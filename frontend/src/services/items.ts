import { supabase } from '../lib/supabase'
import { BUCKET } from '../lib/env'
import type { Item, Sort, Stage, Status, Storage } from '../types/domain'
import { between } from '../constants/units'

const PAGE = 24

export function buildImagePath(userId: string, itemId: string) {
  return `${userId}/${itemId}.jpg`
}

function escapeLike(s: string) {
  // Escape % and , which have meaning in PostgREST or()
  return s.replace(/[%]/g, '\\%').replace(/[,]/g, ' ')
}

function isoToday() {
  return new Date().toISOString().slice(0,10)
}
function diffDays(fromISO: string, toISO: string) {
  const from = new Date(fromISO)
  const to = new Date(toISO)
  return Math.ceil((to.getTime() - from.getTime()) / (1000*60*60*24))
}

export async function updateItemFields(
  id: string,
  patch: Partial<Pick<Item, 'name' | 'label' | 'store' | 'storage' | 'acquired_at'>>
) {
  const { error } = await supabase
    .from('items')
    .update(patch, { returning: 'minimal' }) // ⬅️ key change
    .eq('id', id);
  if (error) throw error;
  return { ok: true as const };
}

export async function listItems(params: {
  q?: string
  storage?: Storage[]
  stage?: Stage[]
  status?: Status[]
  sort?: Sort
  page?: number
  pageSize?: number
}) {
  const pageSize = params.pageSize ?? PAGE
  const page = Math.max(1, params.page ?? 1)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let q = supabase.from('items').select('*', { count: 'exact' })

  if (params.q && params.q.trim()) {
    const s = escapeLike(params.q.trim())
    q = q.or(`name.ilike.%${s}%,store.ilike.%${s}%`)
  }
  if (params.storage?.length) q = q.in('storage', params.storage)
  if (params.stage?.length) q = q.in('freshness_stage', params.stage)
  if (params.status?.length) q = q.in('status', params.status)

  switch (params.sort) {
    case 'days_left_asc':
      q = q.order('days_left', { ascending: true, nullsFirst: true })
      break
    case 'days_left_desc':
      q = q.order('days_left', { ascending: false })
      break
    case 'az':
      q = q.order('name', { ascending: true })
      break
    default:
      q = q.order('created_at', { ascending: false }) // 'recent'
  }

  q = q.range(from, to)

  const { data, error, count } = await q
  if (error) throw error
  return {
    items: (data ?? []) as Item[],
    total: count ?? 0,
    page,
    pageSize,
    pageCount: Math.ceil((count ?? 0) / pageSize),
  }
}

export async function getItemById(id: string) {
  const { data, error } = await supabase.from('items').select('*').eq('id', id).single()
  if (error) throw error
  return data as Item
}

export async function setDaysLeft(id: string, days: number | null) {
  const update: Partial<Item> = { days_left: days, updated_at: new Date().toISOString() };
  const { error } = await supabase
    .from('items')
    .update(update, { returning: 'minimal' }) // ⬅️
    .eq('id', id);
  if (error) throw error;
  return { ok: true as const };
}


export async function createItem(input: {
  name: string
  label?: string | null
  store?: string | null
  storage?: Storage
  acquired_at?: string // YYYY-MM-DD
  days_left?: number | null
  initial_days_left?: number | null
}) {
  const { data, error } = await supabase
    .from('items')
    .insert({
      name: input.name,
      label: (input.label ?? input.name),          // ensure non-null label for UI
      store: input.store ?? null,
      storage: input.storage ?? 'counter',
      acquired_at: input.acquired_at ?? new Date().toISOString().slice(0, 10),
      image_path: 'pending',
      days_left: input.days_left ?? null,          // allow seeding
      initial_days_left: input.initial_days_left ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Item
}


export async function setItemImagePath(itemId: string, userId: string) {
  const path = buildImagePath(userId, itemId)
  const { data, error } = await supabase
    .from('items')
    .update({ image_path: path })
    .eq('id', itemId)
    .select('*')
    .single()
  if (error) throw error
  return data as Item
}

export async function uploadImage(userId: string, itemId: string, blob: Blob) {
  const path = buildImagePath(userId, itemId)
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: true,
    contentType: 'image/webp',
  })
  if (error) throw error
  return { path }
}

export async function createSignedImageUrl(image_path: string, expiresSec = 3600) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(image_path, expiresSec)
  if (error) throw error
  return data.signedUrl
}

export async function analyze(itemId: string) {
  const { error } = await supabase.functions.invoke('analyze', { body: { item_id: itemId } })
  if (error) throw error
  return { ok: true }
}

export async function deleteItem(id: string, image_path: string) {
  // 1) Delete the row (authoritative)
  const { error: delErr } = await supabase.from("items").delete().eq("id", id);
  if (delErr) throw delErr;

  // 2) Best-effort: remove the object (will just warn if it fails)
  console.log(image_path);
  await removeImage(image_path);

  return { ok: true as const };
}

export async function removeImage(path?: string | null) {
  if (!path) return; // nothing to delete
  // Best-effort delete: don't explode the UX if it was already gone or RLS denies
  await supabase.storage.from(BUCKET).remove([path]).catch((e) => {
    console.warn("[removeImage] could not delete", path, e?.message || e);
  });
}
// ---- Quantity helpers ----

export async function setQuantity(
  id: string,
  input: { qty_type: Item['qty_type']; qty_unit: string; qty_value: number; estimated?: boolean }
) {
  const { error } = await supabase
    .from('items')
    .update({
      qty_type: input.qty_type,
      qty_unit: input.qty_unit,
      qty_value: input.qty_value,
      qty_is_estimated: input.estimated ?? false,
    }, { returning: 'minimal' }) // ⬅️
    .eq('id', id);
  if (error) throw error;
  return { ok: true as const };
}

/**
 * Adjust by delta in the given 'unit' (default: current display unit).
 * If new quantity reaches 0, DB trigger deletes the row → we return {deleted: true}.
 */
export async function adjustQuantity(
  id: string,
  opts: { delta: number; unit?: string }
) {
  // 1) Read current quantities (may be missing if already deleted)
  const { data: item, error } = await supabase
    .from('items')
    .select('id, qty_type, qty_unit, qty_value')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!item) return { deleted: true as const };

  const currentUnit = item.qty_unit;
  const targetUnit = opts.unit ?? currentUnit;
  let deltaInDisplay = opts.delta;

  // 2) Convert delta from targetUnit -> displayUnit (currentUnit), if needed
  if (targetUnit && targetUnit !== currentUnit) {
    const base = UNIT_BASE_TYPE(item.qty_type);
    const toBase = between(Math.abs(opts.delta), targetUnit, base, item.qty_type);
    const backToDisplay = between(toBase, base, currentUnit, item.qty_type);
    deltaInDisplay = opts.delta < 0 ? -backToDisplay : backToDisplay;
  }

  // 3) Compute new qty (clamped to >= 0)
  const current = typeof item.qty_value === 'number' ? item.qty_value : 0;
  const newQty = Math.max(0, round4(current + deltaInDisplay));

  // 4) Persist (no returning to avoid 406 under RLS)
  try {
    await supabase
      .from('items')
      .update({ qty_value: newQty, qty_is_estimated: false }, { returning: 'minimal' })
      .eq('id', id);
  } catch (e: any) {
    // If a trigger deleted the row or RLS blocks returning, treat going-to-zero as deleted.
    if (newQty === 0) return { deleted: true as const };
    throw e;
  }

  // 5) UI hint: if zero, callers should remove the card
  if (newQty === 0) return { deleted: true as const };
  return { ok: true as const };
}

function round4(n: number) {
  return Math.round(n * 10000) / 10000
}

// Map qty_type -> its base unit string (to use with 'between')
function UNIT_BASE_TYPE(type: Item['qty_type']) {
  switch (type) {
    case 'weight': return 'g'
    case 'volume': return 'ml'
    default: return 'ea'
  }
}
