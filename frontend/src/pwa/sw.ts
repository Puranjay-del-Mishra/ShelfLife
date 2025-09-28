self.addEventListener('push', (event: any) => {
  const data = (() => {
    try { return event.data?.json() } catch { return {} }
  })()
  const title = data.title || 'ShelfLife'
  const body = data.body || 'You have items to check'
  const options = {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: data.data || {},
  }
  event.waitUntil(self.registration.showNotification(title, options))
})
