import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase client lightly to capture calls
vi.mock('../../lib/supabase', () => {
  const rows: any[] = [
    { id: 'i1', qty_type: 'count', qty_unit: 'ea', qty_value: 3 },
    { id: 'i2', qty_type: 'weight', qty_unit: 'g', qty_value: 500 },
  ]

  const tableApi = (table: string) => {
    let _data: any = rows
    const api: any = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      eq: vi.fn(function (this: any, col: string, val: any) {
        if (col === 'id') _data = rows.filter(r => r.id === val)
        return this
      }),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnValue({
        select: () => ({ single: () => Promise.resolve({ data: { id: 'new' } }) })
      }),
      update: vi.fn().mockReturnValue({
        eq: () => ({
          select: () => Promise.resolve({ data: [{ id: 'i1' }], error: null }),
          single: () => Promise.resolve({ data: { id: 'i1' }, error: null }),
        })
      }),
      delete: vi.fn().mockReturnValue({ eq: () => Promise.resolve({ error: null }) }),
      single: vi.fn(() => Promise.resolve({ data: _data[0] ?? null, error: null })),
      then: undefined, // prevent awaits on the chain accidentally
      // terminal call
      async thenable() { return { data: _data, error: null, count: _data.length } },
    }
    // Make calling without terminal still safe:
    ;(api as any)[Symbol.toStringTag] = 'PostgrestBuilder'
    return api
  }

  return {
    supabase: {
      from: vi.fn((t: string) => tableApi(t)),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({}),
          createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'http://signed' } }),
        })),
      },
      functions: { invoke: vi.fn().mockResolvedValue({}) },
    }
  }
})

import { buildImagePath, adjustQuantity, setQuantity } from '../items'

describe('items service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('buildImagePath', () => {
    expect(buildImagePath('u1', 'i1')).toBe('u1/i1.jpg')
  })

  it('setQuantity marks as not estimated when user edits', async () => {
    const res = await setQuantity('i1', { qty_type: 'count', qty_unit: 'ea', qty_value: 2, estimated: false })
    expect(res).toEqual({ ok: true })
  })

  it('adjustQuantity for count reduces and deletes at zero', async () => {
    // Start at 3 ea, subtract 3 → should mark deleted
    const r = await adjustQuantity('i1', { delta: -3, unit: 'ea' })
    // Our mock returns updated row, but we mimic deleted by checking newQty === 0
    // The service returns {deleted:true} when newQty === 0
    expect(r).toEqual({ deleted: true })
  })

  it('adjustQuantity for weight converts grams correctly', async () => {
    // i2 is 500 g, subtract 100 g → ok
    const r = await adjustQuantity('i2', { delta: -100, unit: 'g' })
    expect(r).toEqual({ ok: true })
  })
})
