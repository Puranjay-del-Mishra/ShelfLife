import { describe, it, expect } from 'vitest'
import { toBase, between } from '../../constants/units'

describe('units conversion', () => {
  it('weight to base (g)', () => {
    expect(toBase(1, 'kg', 'weight')).toBeCloseTo(1000)
    expect(toBase(1, 'lb', 'weight')).toBeCloseTo(453.59237, 5)
    expect(toBase(16, 'oz', 'weight')).toBeCloseTo(453.59237, 5)
  })

  it('volume to base (ml)', () => {
    expect(toBase(1, 'l', 'volume')).toBeCloseTo(1000)
    expect(toBase(8, 'fl_oz', 'volume')).toBeCloseTo(236.588, 2)
    expect(toBase(1, 'cup', 'volume')).toBeCloseTo(240)
  })

  it('between unit conversions', () => {
    expect(between(1, 'kg', 'g', 'weight')).toBeCloseTo(1000)
    expect(between(1000, 'g', 'kg', 'weight')).toBeCloseTo(1)
    expect(between(240, 'ml', 'cup', 'volume')).toBeCloseTo(1)
  })
})
