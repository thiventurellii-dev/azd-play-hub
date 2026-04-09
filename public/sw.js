// Service Worker for Push Notifications
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  const rawData = event.data ? event.data.json() : { title: 'Nova Mensagem', body: 'Clique para ver' };
  const data = {
    ...rawData,
    title: rawData.title || 'Nova Mensagem',
    body: rawData.body || rawData.message || 'Clique para ver',
    url: rawData.url || '/',
  };
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge.png',
    data: {
      url: data.url,
    },
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Force immediate activation to replace any old (vite-plugin-pwa) SW
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
