(function(){
  function banner(){
    const b=document.getElementById("networkBanner");
    if(!b)return;
    const update=()=>{
      b.textContent=navigator.onLine?"":"You are disconnected from the internet. Connect to the internet to continue.";
      b.classList.toggle("show",!navigator.onLine);
    };
    addEventListener("online",update,{passive:true});
    addEventListener("offline",update,{passive:true});
    update();
  }
  window.notifyOffline=()=>alert("You are disconnected from the internet. Please connect to the internet to continue.");
  window.showNetworkError=el=>{if(el){el.className="error";el.textContent="Network error. Please connect to the internet and try again."}};
  banner();
})();

/* PWA install support shared by all portal pages. The install control is
   intentionally visible whenever the site is running in a browser and the
   app is not currently installed. On browsers without beforeinstallprompt,
   it opens platform-specific installation instructions instead. */
(function(){
  let deferred=null;
  let modal=null;
  const standalone=()=>matchMedia("(display-mode: standalone)").matches || navigator.standalone===true;
  const buttons=()=>Array.from(document.querySelectorAll("#install, .install-btn"));
  const isInstalled=()=>standalone();

  function hide(){
    buttons().forEach(b=>{b.hidden=true;b.setAttribute("aria-hidden","true")});
    closeModal();
  }
  function reveal(){
    if(isInstalled()) return hide();
    buttons().forEach(b=>{b.hidden=false;b.removeAttribute("hidden");b.removeAttribute("aria-hidden")});
  }
  function instructions(){
    const ua=navigator.userAgent;
    if(/iPhone|iPad|iPod/i.test(ua)) return 'On iPhone or iPad: tap Share in Safari, then choose “Add to Home Screen”.';
    if(/Android/i.test(ua)) return 'On Android: open the browser menu (⋮) and choose “Install app” or “Add to Home screen”.';
    return 'On desktop: use the install icon in your browser address bar, or open the browser menu and choose “Install Gifted Brainz Tutorial”.';
  }
  function closeModal(){if(modal){modal.remove();modal=null}}
  function openModal(){
    if(isInstalled()||modal)return;
    modal=document.createElement("div");
    modal.className="install-modal";
    modal.innerHTML='<div class="install-card" role="dialog" aria-modal="true" aria-label="Install Gifted Brainz Tutorial">'+
      '<img src="/assets/icon-192.png" alt="Gifted Brainz Tutorial" width="76" height="76">'+
      '<h3>Install Gifted Brainz Tutorial</h3>'+
      '<p class="muted">Install the app for faster access, a home-screen icon and offline-ready pages.</p>'+
      '<p class="install-steps muted"></p>'+
      '<button class="btn gold" data-install-now type="button" style="width:100%">'+(deferred?'Install App':'Show Install Steps')+'</button>'+
      '<button class="btn light" data-install-later type="button" style="width:100%;margin-top:8px">Not now</button>'+
      '</div>';
    document.body.appendChild(modal);
    modal.querySelector(".install-steps").textContent=deferred?"Tap Install App to continue.":instructions();
    modal.addEventListener("click",e=>{
      if(e.target!==modal && !e.target.closest("[data-install-later]"))return;
      // "Not now" is remembered for a week, so the prompt does not reappear on
      // every single visit.
      try{localStorage.setItem("gbInstallDismissed",String(Date.now()))}catch{}
      closeModal();
    });
  }
  async function promptInstall(){
    if(isInstalled()) return hide();
    if(deferred){
      const promptEvent=deferred;
      deferred=null;
      try{
        await promptEvent.prompt();
        const choice=await promptEvent.userChoice;
        if(choice?.outcome==="accepted"){hide();return;}
      }catch{}
      reveal();
      if(modal){
        modal.querySelector(".install-steps").textContent=instructions();
        const action=modal.querySelector("[data-install-now]");
        if(action)action.textContent="Show Install Steps";
      }
      return;
    }
    if(modal){
      modal.querySelector(".install-steps").textContent=instructions();
      return;
    }
    openModal();
  }

  addEventListener("beforeinstallprompt",e=>{
    e.preventDefault();
    deferred=e;
    reveal();
    if(modal){
      const action=modal.querySelector("[data-install-now]"),steps=modal.querySelector(".install-steps");
      if(action)action.textContent="Install App";
      if(steps)steps.textContent="Tap Install App to continue.";
    }
    maybeAutoPopup();
  });
  addEventListener("appinstalled",()=>{deferred=null;try{localStorage.setItem("gbWasInstalled","1")}catch{};hide()});

  if(navigator.getInstalledRelatedApps){
    navigator.getInstalledRelatedApps().then(apps=>{if(apps?.length)hide();else reveal()}).catch(reveal);
  }

  document.addEventListener("click",e=>{
    if(e.target.closest("[data-install-now]")){e.preventDefault();promptInstall();return;}
    const b=e.target.closest("#install, .install-btn");
    if(!b)return;
    e.preventDefault();
    promptInstall();
  });

  let autoDone=false;
  function maybeAutoPopup(){
    if(autoDone||isInstalled())return;
    if(document.body?.dataset.installPopup!=="on")return;
    let dismissed=0; try{dismissed=Number(localStorage.getItem("gbInstallDismissed")||0)}catch{}
    if(dismissed && Date.now()-dismissed < 7*24*60*60*1000) return;
    autoDone=true;
    const splash=document.getElementById("splash");
    setTimeout(openModal,splash?8200:900);
  }

  const VERSION_KEY="gbAppVersion";
  const BASE_VERSION="10.5.6-final-qa";
  const read=k=>{try{return localStorage.getItem(k)||""}catch{return ""}};
  if("serviceWorker" in navigator){
    addEventListener("load",()=>{
      const v=read(VERSION_KEY)||BASE_VERSION;
      navigator.serviceWorker.register("/sw.js?v="+encodeURIComponent(v),{updateViaCache:"none"}).catch(()=>{});
    },{once:true});
  }

  function init(){reveal();maybeAutoPopup()}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
  window.GBInstall={open:openModal,prompt:promptInstall};
})();

/* ------------------------------------------------------------------
   App update support.
------------------------------------------------------------------- */
(function(){
  const VERSION_KEY="gbAppVersion";
  const BASE_VERSION="10.5.6-final-qa";
  const read=k=>{try{return localStorage.getItem(k)||""}catch{return ""}};
  const write=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
  const safeVersion=v=>String(v||"").replace(/[^A-Za-z0-9._-]/g,"_");
  let updating=false;

  async function serverManifest(){
    try{
      const r=await fetch("/api/app/runtime/manifest",{cache:"no-store"});
      if(!r.ok)return null;
      const d=await r.json();
      return d?.version&&Array.isArray(d.files)&&d.files.length?d:null;
    }catch{return null}
  }

  async function activateVersion(version){
    if(!version||!navigator.serviceWorker)return false;
    const v=safeVersion(version);
    write(VERSION_KEY,v);
    try{
      const reg=await navigator.serviceWorker.register("/sw.js?v="+encodeURIComponent(v),{updateViaCache:"none"});
      await reg.update().catch(()=>{});
      if(reg.waiting){reg.waiting.postMessage({type:"SKIP_WAITING"});}
      else if(reg.installing){
        const worker=reg.installing;
        await new Promise(resolve=>{
          const timer=setTimeout(resolve,15000);
          worker.addEventListener("statechange",()=>{if(["installed","activated","redundant"].includes(worker.state)){clearTimeout(timer);resolve()}},{once:false});
        });
        if(reg.waiting)reg.waiting.postMessage({type:"SKIP_WAITING"});
      }
      return true;
    }catch{return false}
  }

  async function applyUpdate(manifest){
    if(updating||!manifest?.version)return;
    const current=read(VERSION_KEY);
    if(current===String(manifest.version))return;
    updating=true;
    document.documentElement.dataset.appUpdating="1";
    const msg=document.createElement("div");
    msg.id="gbSilentUpdate";
    msg.style="position:fixed;inset:auto 12px 12px 12px;z-index:99999;background:#082d63;color:#fff;padding:12px 16px;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.2);font-weight:800;text-align:center";
    msg.textContent="Applying the latest Gifted Brainz Tutorial update…";
    document.body?.appendChild(msg);
    try{
      // The new service worker fetches this same manifest and downloads every
      // released public asset into its versioned cache before it becomes active.
      // No user confirmation is required, and all account data stays in Blobs.
      const swReady=navigator.serviceWorker && await activateVersion(manifest.version);
      if(swReady){
        write("gbPendingUpdate",String(manifest.version));
        let reloaded=false;
        const onController=()=>{if(reloaded)return;reloaded=true;write(VERSION_KEY,String(manifest.version));write("gbPendingUpdate","");location.reload()};
        navigator.serviceWorker.addEventListener("controllerchange",onController,{once:true});
        setTimeout(()=>{if(!reloaded){reloaded=true;write(VERSION_KEY,String(manifest.version));write("gbPendingUpdate","");location.reload()}},15000);
      }else{
        // Even without a service worker, HTML/API runtime updates are already
        // server-side. Revalidate the document so a normal browser picks up a
        // fresh static deployment immediately.
        write(VERSION_KEY,String(manifest.version));
        setTimeout(()=>location.reload(),250);
      }
    }catch{
      updating=false; document.documentElement.dataset.appUpdating=""; msg.remove();
    }
  }

  async function registerCurrent(){
    const m=await serverManifest();
    const previous=read(VERSION_KEY);
    const v=String(m?.version||previous||BASE_VERSION);
    const forced=sessionStorage.getItem("gbForceUpdateCheck")==="1";
    // A device with no stored version must still install the live runtime
    // package. The old build treated a first visit as "already up to date",
    // which is exactly why a published update could exist on the server while
    // the phone kept serving the older static files.
    if(m && (!previous || previous!==String(m.version) || forced)){
      sessionStorage.removeItem("gbForceUpdateCheck");
      write(VERSION_KEY,previous||BASE_VERSION);
      await applyUpdate(m);
      return;
    }
    write(VERSION_KEY,v);
    if("serviceWorker" in navigator){
      try{await navigator.serviceWorker.register("/sw.js?v="+encodeURIComponent(safeVersion(v)),{updateViaCache:"none"})}catch{}
    }
  }

  async function check(){
    const m=await serverManifest();
    if(m && read(VERSION_KEY)!==String(m.version)) await applyUpdate(m);
  }

  function init(){
    if(!read(VERSION_KEY))write(VERSION_KEY,BASE_VERSION);
    setTimeout(()=>{registerCurrent().catch(()=>{});setTimeout(()=>check().catch(()=>{}),2500)},500);
    setInterval(()=>check().catch(()=>{}),60000);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();;
