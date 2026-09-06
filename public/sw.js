const CACHE = "voca-shell-v10";
const PRECACHE = ["/", "/index.html", "/manifest.webmanifest", "/icon.svg", "/data/terms.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "금맹탈출";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "오늘 공부할 게 남아 있어요.",
      icon: "/icon.svg",
      badge: "/icon.svg",
      // 같은 tag를 쓰면 읽지 않은 알림이 쌓이지 않고 최신 것만 남는다.
      tag: "voca-daily",
      renotify: false,
      data: { url: data.url || "/", kind: data.kind || null },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // API 요청은 캐시하지 않는다. 캐시된 응답을 돌려주면 전송 성공으로 오해한다.
  if (url.pathname.startsWith("/api/")) return;
  event.respondWith(
    caches.match(req).then((cached) => {
      if (url.pathname === "/content/today.json") {
        return fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
      }
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok && (url.pathname.startsWith("/assets/") || url.pathname === "/data/terms.json" || url.pathname === "/")) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fresh;
    }),
  );
});
