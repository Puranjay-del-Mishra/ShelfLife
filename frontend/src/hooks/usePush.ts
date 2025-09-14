import { useEffect, useState } from 'react'
import { registerDevice, unregisterDevice } from '@/services/notify'
import { getUser } from '@/services/auth'
import { supabase } from '@/lib/supabase'
import { BUCKET } from '@/lib/env'

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY

export function usePush() {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    if (!supported) return
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    })
  }, [supported])

  async function subscribe() {
    if (!supported) return false
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return false
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID),
    })
    await registerDevice(sub.endpoint, navigator.userAgent)
    setSubscribed(true)
    return true
  }

  async function unsubscribe() {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await unregisterDevice(sub.endpoint)
      await sub.unsubscribe()
    }
    setSubscribed(false)
  }

  return { supported, subscribed, subscribe, unsubscribe }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i=0; i<raw.length; ++i) output[i] = raw.charCodeAt(i)
  return output
}
