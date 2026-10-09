/* Trophy Hunt push service worker.
 * - push: shows the notification from the encrypted payload {title, body, url}
 * - notificationclick: opens the leaderboard (or the payload URL)
 * - fetch: NETWORK-FIRST for the page itself (index.html / navigations) so
 *   standings and the subscriber counter are never served stale; cache-first
 *   only for static shell assets (js/css/icons/manifest).
 * 2026-10-07 fix: the old cache-first-for-everything strategy served a
 * day-old page indefinitely (Shawn caught 576 subs / "updated 27h ago").
 */
var SHELL_CACHE = 'th-shell-v3';
var SHELL_ASSETS = ['./app.js', './styles.css', './manifest.json',
  './icon-192.png', './icon-512.png'];

function isPageRequest(url) {
  var p = url.pathname;
  return p === '/' || p.endsWith('/') || p.endsWith('/index.html') ||
    p.endsWith('trophy-hunt-leaderboard') || p.endsWith('trophy-hunt-leaderboard/');
}

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(SHELL_CACHE).then(function (c) { return c.addAll(SHELL_ASSETS); })
    .then(function () { return self.skipWaiting(); }).catch(function () {}));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== SHELL_CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  /* 2026-10-08 fix (frozen avatar video): NEVER intercept byte-range
   * requests. Video/audio elements fetch in ranges; the cache-first path
   * below stored a 206 partial under the plain URL and then served those
   * same first bytes for every later range — the player got garbage and
   * froze on the poster frame. Let ranges hit the network directly. */
  if (e.request.headers.has('range')) return;
  var u = new URL(e.request.url);
  /* Media files never go through the worker cache either — same class of
   * bug (partial/encoded responses cached under the plain URL). */
  if (/\.(mp4|webm|mp3|wav|ogg)$/i.test(u.pathname)) return;
  if (u.origin !== self.location.origin) return;

  if (isPageRequest(u) || e.request.mode === 'navigate') {
    // NETWORK-FIRST for the page: always try live, fall back to cache offline.
    e.respondWith(fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(SHELL_CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () {
      return caches.match(e.request).then(function (hit) {
        return hit || caches.match('./index.html');
      });
    }));
    return;
  }

  // CACHE-FIRST for static assets.
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
