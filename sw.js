const CACHE="benar-salah-v18";
const CORE=["./","./index.html","./config.js","./manifest.webmanifest","./icon.svg"];

self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)));
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
    ).then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);

  // Always get the HTML and SW from the network when possible.
  // This prevents the UI from being stuck on an old deployment.
  if(url.pathname.endsWith("/index.html") || url.pathname.endsWith("/sw.js") || url.pathname==="/"){
    event.respondWith(
      fetch(event.request,{cache:"no-store"})
        .then(response=>{
          if(response.ok && url.pathname.endsWith("/index.html")){
            const copy=response.clone();
            caches.open(CACHE).then(c=>c.put("./index.html",copy));
          }
          return response;
        })
        .catch(()=>caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>cached||fetch(event.request))
  );
});
