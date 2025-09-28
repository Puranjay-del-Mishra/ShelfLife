// auto-stub created
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
const __client = new QueryClient()
export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={__client}>{children}</QueryClientProvider>
}
