const CACHE_NAME = 'rv-tabata-pro-v1';
const ASSETS = [
    '.', '/index.html', '/style.css', '/script.js', '/manifest.json'
    // inclua também ícones e recursos estáticos que desejar
];

self.addEventListener('install', (ev)=>{
    ev.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', (ev)=>{
    ev.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (ev)=>{
    const req = ev.request;
    ev.respondWith(
        caches.match(req).then(cached => cached || fetch(req).then(r=>{
            // optionally cache new requests
            return r;
        })).catch(()=>caches.match('/index.html'))
    );
});
