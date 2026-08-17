const VERSION=new URL(self.location.href).searchParams.get("v")||"10.5.6-final-qa";
const CACHE="gb-"+VERSION.replace(/[^A-Za-z0-9._-]/g,"_");
const SHELL=[
  "/","/index.html","/login.html","/register.html","/dashboard.html","/cbt.html",
  "/materials.html","/update.html","/performance.html","/leaderboards.html","/announcements.html","/help.html","/account.html","/feedback.html","/diagnostics.html",
  "/admin.html","/styles.css","/app.js","/api.js","/gb-ui.js","/manifest.webmanifest",
  "/assets/icon-192.png","/assets/icon-light.png","/assets/logo-full.png","/assets/icon-512.png"
];
async function installRuntime(cache){
  try{
    const r=await fetch("/api/app/runtime/manifest",{cache:"no-store"});
    if(!r.ok)return false;
    const manifest=await r.json();
    if(String(manifest.version)!==String(VERSION)||!Array.isArray(manifest.files))return false;
    // Folder entries ("assets/") are not files; skip them instead of firing
    // a request that can only 404.
    for(const f of manifest.files.filter(x=>x&&typeof x.path==="string"&&x.path&&!x.path.endsWith("/"))){
      const u="/api/app/runtime/file/"+f.path.split("/").map(encodeURIComponent).join("/");
      const response=await fetch(u,{cache:"no-store"});
      if(response.ok)await cache.put(new Request("/"+f.path),response.clone());
    }
    await cache.put(new Request("/__gb_active_runtime__"),new Response(String(manifest.version),{headers:{"content-type":"text/plain"}}));
    return true;
  }catch{return false}
}
// cache.addAll() rejects the whole install if a single file 404s, which used
// to leave the app with no service worker at all. Each file is now cached
// independently so one missing asset cannot break installation.
async function cacheShell(cache){
  await Promise.all(SHELL.map(async url=>{
    try{
      const response=await fetch(url,{cache:"no-store"});
      if(response.ok) await cache.put(new Request(url),response);
    }catch{}
  }));
}
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(async cache=>{await cacheShell(cache);await installRuntime(cache);await self.skipWaiting();})));
self.addEventListener("activate",e=>e.waitUntil((async()=>{
  // Remove older Gifted Brainz caches after the new worker is active.
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith("gb-")&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
})()));
self.addEventListener("message",e=>{
  if(e.data?.type==="SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("push",e=>{
  let data={};
  try{data=e.data?.json()||{}}catch{try{data={body:e.data?.text()||""}}catch{}}
  e.waitUntil(self.registration.showNotification(data.title||"Gifted Brainz Tutorial",{body:data.body||"",icon:"/assets/icon-192.png",badge:"/assets/icon-192.png",data:{url:data.url||"/dashboard.html"},tag:data.type||"gb-notification"}));
});

self.addEventListener("notificationclick",e=>{
  e.notification.close();
  const target=e.notification.data?.url||"/login.html";
  e.waitUntil((async()=>{
    const clients=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for(const c of clients){try{await c.focus();await c.navigate(target);return}catch{}}
    await self.clients.openWindow(target);
  })());
});
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=="GET"||u.pathname.startsWith("/api/")||u.pathname.startsWith("/api"))return;
  e.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const runtimeActive=!!await cache.match("/__gb_active_runtime__");
    if(runtimeActive){
      // A published runtime package is the active release. Serve its cached
      // asset first so an online network response cannot overwrite the newly
      // installed app with the older static deployment.
      const cached=await cache.match(e.request);
      if(cached)return cached;
    }
    try{
      const r=await fetch(e.request,{cache:"no-store"});
      if(r.ok)cache.put(e.request,r.clone()).catch(()=>{});
      return r;
    }catch{
      return cache.match(e.request).then(cached=>cached||caches.match("/index.html"));
    }
  })());
});
