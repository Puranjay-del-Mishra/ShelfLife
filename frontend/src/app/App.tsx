import { BrowserRouter } from 'react-router-dom'
import { QueryProvider } from '@/providers/QueryProvider'
import { AuthProvider } from '@/providers/AuthProvider'
import { ToastProvider } from '@/providers/ToastProvider'
import { DialogProvider } from '@/providers/DialogProvider'
import { RoutesView } from './routes'

export function App() {
  return (
    <BrowserRouter>
      <QueryProvider>
        <AuthProvider>
          <ToastProvider>
            <DialogProvider>
              <RoutesView />
            </DialogProvider>
          </ToastProvider>
        </AuthProvider>
      </QueryProvider>
    </BrowserRouter>
  )
}
