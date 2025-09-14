// src/hooks/useAuthGuard.ts
import { useAuth } from "@/providers/AuthProvider"
export function useAuthGuard() {
  const { session, loading } = useAuth()
  return { session, loading }
}
