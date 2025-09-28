// src/app/App.tsx
import { BrowserRouter } from 'react-router-dom'
import { QueryProvider } from '@/providers/QueryProvider'
import { AuthProvider, useAuth } from '@/providers/AuthProvider'
import { ToastProvider } from '@/providers/ToastProvider'
import { DialogProvider } from '@/providers/DialogProvider'
import { RoutesView } from './routes'
import { SignInOverlay } from '@/components/auth/SignInOverlay' // adjust path if yours is in /common

function AppShell() {
  const { session } = useAuth()
  console.log('[app] render → session?', !!session)
  return (
    <>
      {!session && <SignInOverlay />}
      <RoutesView />
    </>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <QueryProvider>
        <AuthProvider>
          <ToastProvider>
            <DialogProvider>
              <AppShell />
            </DialogProvider>
          </ToastProvider>
        </AuthProvider>
      </QueryProvider>
    </BrowserRouter>
  )
}
