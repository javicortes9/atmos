// Atmos service worker: la app abre sin conexión; los datos siempre se piden en directo.
const V = 'atmos-v12';
const SHELL = ['./', 'index.html', 'app.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-180.png',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const shell = u.origin === location.origin || u.hostname === 'cdnjs.cloudflare.com' || u.hostname.endsWith('gstatic.com') || u.hostname === 'fonts.googleapis.com';
  if (!shell) return; // APIs, teselas y Windy: siempre a la red
  // red primero para la propia app (actualizaciones), caché como respaldo
  const req = u.origin === location.origin ? fetch(e.request.url, {cache: 'no-cache'}) : fetch(e.request);
  e.respondWith(req.then(r => { const c = r.clone(); caches.open(V).then(ca => ca.put(e.request, c)); return r; }).catch(() => caches.match(e.request, {ignoreSearch: true})));
});
