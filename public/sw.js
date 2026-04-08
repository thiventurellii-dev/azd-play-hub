// Service Worker for Push Notifications
// This file is served from /sw.js

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || "Amizade (AzD)";
  const options = {
    body: data.message || data.body || "",
    icon: "/pwa-icon-192.png",
    badge: "/pwa-icon-192.png",
    tag: data.tag || "default",
    data: {
      url: data.url || "/",
    },
  };
  event.waitUntil(self.registration.showNotification(title, options));
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
