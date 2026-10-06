/* Trophy Hunt push service worker.
 * - push: shows the notification from the encrypted payload {title, body, url}
 * - notificationclick: opens the leaderboard (or the payload URL)
 * - fetch: minimal cache-first for the app shell so the PWA is installable.
 */
var SHELL_CACHE = 'th-shell-v1';
var SHELL = ['./', './index.html', './app.js', './styles.css', './manifest.json',
  './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(SHELL_CACHE).then(function (c) { return c.addAll(SHELL); })
    .then(function () { return self.skipWaiting(); }).catch(function () {}));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var u = new URL(e.request.url);
  if (u.origin !== self.location.origin) return;
  e.respondWith(caches.match(e.request).then(function (hit) {
    return hit || fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(SHELL_CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () { return caches.match('./index.html'); });
  }));
});
self.addEventListener('push', function (e) {
  var d = { title: 'Trophy Hunt', body: '', url: 'https://tinyurl.com/trophy-hunt-leaderboard' };
  try { if (e.data) d = Object.assign(d, e.data.json()); } catch (err) {}
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    data: { url: d.url },
    tag: 'trophy-hunt',
    renotify: true,
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) ||
    'https://tinyurl.com/trophy-hunt-leaderboard';
  e.waitUntil(clients.matchAll({ type: 'window' }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].url.indexOf('trophy-hunt') >= 0 || list[i].url.indexOf('tinyurl.com') >= 0) {
        return list[i].focus();
      }
    }
    return clients.openWindow(url);
  }));
});
