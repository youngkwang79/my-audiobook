// public/sw.js

self.addEventListener("push", function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || "무림북";
      const options = {
        body: data.body || "",
        icon: data.icon || "/favicon.ico",
        badge: "/favicon.ico",
        data: {
          url: data.url || "/"
        }
      };

      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      const text = event.data.text();
      const options = {
        body: text,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        data: {
          url: "/"
        }
      };
      event.waitUntil(self.registration.showNotification("무림북", options));
    }
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
