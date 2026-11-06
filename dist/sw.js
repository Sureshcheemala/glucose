const CACHE='glucoguide-shell-mw4i3g89';
const PREFIX='glucoguide-shell-';
const PRECACHE=["/","/assets/index-0njMPeJX.js","/assets/index-BIHUKsrE.css","/fonts/NotoSansTelugu-Regular.ttf","/fonts/OFL.txt","/icon.svg","/index.html","/manifest.webmanifest"];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(PRECACHE);
    if(self.registration.active){
      const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
      clients.forEach(client=>client.postMessage({type:'UPDATE_AVAILABLE'}));
    }else{
      await self.skipWaiting();
    }
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const cacheNames=await caches.keys();
    await Promise.all(cacheNames.filter(name=>name.startsWith(PREFIX)&&name!==CACHE).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')void self.skipWaiting();
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(request);
    if(cached)return cached;
    try{
      const response=await fetch(request);
      if(response.ok)void cache.put(request,response.clone());
      return response;
    }catch{
      if(request.mode==='navigate')return (await cache.match('/index.html'))??Response.error();
      return Response.error();
    }
  })());
});
