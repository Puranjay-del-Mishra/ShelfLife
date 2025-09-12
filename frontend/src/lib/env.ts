import { z } from 'zod'

const schema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(10),
  VITE_BUCKET: z.string().default('produce-images'),
})

const parsed = schema.parse(import.meta.env)

export const SUPABASE_URL = parsed.VITE_SUPABASE_URL
export const SUPABASE_ANON_KEY = parsed.VITE_SUPABASE_ANON_KEY
export const BUCKET = parsed.VITE_BUCKET
