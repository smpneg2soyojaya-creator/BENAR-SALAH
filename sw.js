const CACHE='spenda-game-center-final-20261007';
const ASSETS=['./','./index.html','./bank-soal.html','./benar-salah.html','./spenda-gesture-battle.html','./spenda-family-100.html','./clash-of-champions.html','./config.js?v=20261007','./spenda-db.js?v=20261007','./spenda-import.js?v=20261007','./manifest.webmanifest','./icon-192.png','./icon-512.png','./favicon.ico','./logo-sekolah.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return r}).catch(()=>caches.match(e.request))) });
