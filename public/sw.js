// Service worker: makes the configurator installable and usable offline.
// Pages: network first (fresh product data when online), cache as fallback.
// Static assets: cache first, refreshed in the background.
// Bump VERSION when the precache list changes.
const VERSION = 'rm-v1';
const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'impressum.html',
  'datenschutz.html',
  'assets/legal.css',
  'assets/fonts/fonts.css',
  'assets/fonts/barlow-condensed-500-latin.woff2',
  'assets/fonts/barlow-condensed-600-latin.woff2',
  'assets/fonts/barlow-condensed-700-latin.woff2',
  'assets/fonts/ibm-plex-mono-400-latin.woff2',
  'assets/fonts/ibm-plex-mono-500-latin.woff2',
  'assets/fonts/ibm-plex-sans-400-latin.woff2',
  'assets/fonts/ibm-plex-sans-500-latin.woff2',
  'assets/fonts/ibm-plex-sans-600-latin.woff2',
  'assets/vendor/jspdf-2.5.1.umd.min.js',
  'assets/icons/icon.svg',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req)
      .then(res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
    return;
  }

  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => {
      if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    });
    if (hit) { net.catch(() => {}); return hit; }
    return net;
  }));
});
