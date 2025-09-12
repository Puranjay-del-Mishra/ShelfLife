export type Storage = 'counter' | 'fridge' | 'freezer'
export type Stage = 'Fresh' | 'Eat Soon' | 'Last Call' | 'Spoiled'
export type Status = 'ok' | 'spoiling' | 'expired'
export type Sort = 'days_left_asc' | 'days_left_desc' | 'recent' | 'az'

export interface Item {
  id: string
  user_id: string
  name: string
  label: string
  store: string | null
  storage: Storage
  acquired_at: string // ISO date
  image_path: string
  initial_days_left: number | null
  days_left: number | null
  freshness_score: number | null
  freshness_stage: Stage | null
  last_vlm_at: string | null
  updated_at: string | null
  status: Status
  created_at: string | null

  // quantity
  qty_type: 'count' | 'weight' | 'volume' | 'bunch' | 'other'
  qty_unit: string
  qty_value: number
  qty_base: number | null
  initial_qty_base: number | null
  qty_is_estimated: boolean | null
}

export interface Counters {
  expiringToday: number
  thisWeek: number
  total: number
}
