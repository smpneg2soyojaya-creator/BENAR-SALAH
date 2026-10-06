const CACHE="spenda-game-center-v17";
const CORE=[
  "./","./index.html","./manifest.webmanifest","./config.js","./spenda-db.js","./spenda-import.js","./bank-soal.html",
  "./icon-192.png","./icon-512.png","./logo-sekolah.png",
  "./benar-salah.html","./spenda-family-100.html","./spenda-gesture-battle.html","./clash-of-champions.html"
];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp))}return r}).catch(()=>caches.match(e.request)))})
