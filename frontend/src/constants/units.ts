// Base units: count/bunch → each; weight → grams; volume → milliliters
export type QtyType = 'count' | 'weight' | 'volume' | 'bunch' | 'other'

export const UNIT_BASE: Record<QtyType, string> = {
  count: 'ea',
  bunch: 'ea',
  other: 'ea',
  weight: 'g',
  volume: 'ml',
}

const WEIGHT_FACTORS: Record<string, number> = {
  g: 1,
  kg: 1000,
  lb: 453.59237,
  oz: 28.349523125,
}

const VOLUME_FACTORS: Record<string, number> = {
  ml: 1,
  l: 1000,
  fl_oz: 29.5735295625,
  cup: 240,
}

export function toBase(value: number, unit: string, type: QtyType): number {
  if (type === 'count' || type === 'bunch' || type === 'other') return value
  if (type === 'weight') return value * (WEIGHT_FACTORS[unit.toLowerCase()] ?? 1)
  if (type === 'volume') return value * (VOLUME_FACTORS[unit.toLowerCase()] ?? 1)
  return value
}

export function between(value: number, fromUnit: string, toUnit: string, type: QtyType): number {
  if (fromUnit === toUnit) return value
  const base = toBase(value, fromUnit, type)
  if (type === 'weight') {
    const to = WEIGHT_FACTORS[toUnit.toLowerCase()] ?? 1
    return base / to
  }
  if (type === 'volume') {
    const to = VOLUME_FACTORS[toUnit.toLowerCase()] ?? 1
    return base / to
  }
  // count/bunch/other
  return value
}

export const QUICK_STEPS: Record<QtyType, number[]> = {
  count: [-1, +1],
  bunch: [-1, +1],
  other: [-1, +1],
  weight: [-100, -50, +50, +100], // grams by convention
  volume: [-100, -50, +50, +100], // ml by convention
}
