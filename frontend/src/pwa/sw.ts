/// <reference lib="webworker" />
export {}

declare const self: ServiceWorkerGlobalScope

// Optional: simple install/activate to keep SW current
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event: PushEvent) => {
  const payload = (() => {
    try {
      return event.data?.json() as {
        title?: string
        body?: string
        url?: string
        data?: any
        icon?: string
        badge?: string
      }
    } catch {
      return {} as any
    }
  })()

  const title = payload.title || 'ShelfLife'
  const body = payload.body || 'You have items to check'
  const options: NotificationOptions = {
    body,
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-192.png',
    data: payload.data || { url: payload.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const url = (event.notification.data && (event.notification.data as any).url) || '/'

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const match = allClients.find(c => (c as WindowClient).url.includes(new URL(url, self.location.origin).pathname))
    if (match && 'focus' in match) {
      await (match as WindowClient).focus()
      return
    }
    await self.clients.openWindow(url)
  })())
})
