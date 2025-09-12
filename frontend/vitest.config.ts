// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'          // <-- from 'vite', not 'vitest/config'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '') // loads .env, .env.test, etc.

  return {
    test: {
      environment: 'jsdom',
      globals: true,
      coverage: { provider: 'v8' },
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      'import.meta.env.VITE_BUCKET': JSON.stringify(env.VITE_BUCKET ?? 'produce-images'),
    },
  }
})
