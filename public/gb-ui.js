/* ------------------------------------------------------------------
   Gifted Brainz Tutorial — shared portal shell.

   Every student page includes this file. It renders the left-hand menu
   (each entry is an icon *plus its name*), the top bar, the mobile menu
   button, and the helpers used to display rich announcements, media and
   "Show more / Show less" lists.
------------------------------------------------------------------- */
window.GBUI = (() => {

  const NAV = [
    { href: "/dashboard.html",     icon: "🏠", label: "Dashboard",          desc: "Your overview at a glance" },
    { href: "/cbt.html",           icon: "🎯", label: "CBT Arena",          desc: "Take computer based tests" },
    { href: "/materials.html",     icon: "📚", label: "Learning Materials", desc: "Notes and files by subject" },
    { href: "/performance.html",   icon: "📈", label: "My Performance",     desc: "Scores, progress and corrections" },
    { href: "/leaderboards.html",  icon: "🏆", label: "Leaderboards",       desc: "Rankings overall and per subject" },
    { href: "/announcements.html", icon: "📢", label: "Announcements",      desc: "News from Gifted Brainz" },
    { href: "/feedback.html",      icon: "⭐", label: "Feedback & Rating",  desc: "Rate the app and send complaints" },
    { href: "/help.html",          icon: "🆘", label: "Help & Support",     desc: "Talk to us on WhatsApp" },
    { href: "/account.html",       icon: "👤", label: "My Account",         desc: "Your profile and sign out" }
  ];

  const SUBJECTS = ["Mathematics", "Use of English", "Physics", "Chemistry", "Biology"];
  const SUBJECT_ICONS = {
    "Mathematics": "➗", "Use of English": "📘", "Physics": "⚡",
    "Chemistry": "🧪", "Biology": "🌿"
  };

  const esc = v => String(v ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ------------------------- channel promotion ------------------------ */
  const CHANNEL_URL = "https://whatsapp.com/channel/0029VbC1jX73QxRtsF3Kms3r";
  function channelBanner() {
    return `<a class="channel-banner" href="${CHANNEL_URL}" target="_blank" rel="noopener noreferrer">
      <span class="channel-icon">📱</span><span><b>Follow our WhatsApp Channel</b><small>Tap here — get announcements, updates &amp; learning alerts instantly ✅</small></span><span class="channel-arrow">↗</span>
    </a>`;
  }

  /* ----------------------------- the shell ----------------------------- */
  function shell(opts = {}) {
    const active = opts.active || location.pathname;
    const links = NAV.map(item => {
      const on = item.href === active;
      return `<a class="${on ? "active" : ""}" href="${item.href}" aria-label="${esc(item.label)} — ${esc(item.desc)}" ${on ? 'aria-current="page"' : ""}>
        <span class="ic" aria-hidden="true">${item.icon}</span>
        <span class="nav-text"><span class="lbl">${esc(item.label)}</span><small>${esc(item.desc)}</small></span>
      </a>`;
    }).join("");

    return `
    <button class="menu-toggle" id="menuToggle" type="button" aria-label="Open menu">☰ Menu</button>
    <div class="scrim" id="scrim" hidden></div>
    <aside class="sidebar" id="sidebar">
      <a class="side-brand" href="/dashboard.html">
        <img class="logo-transparent" src="/assets/icon-light.png" alt="Gifted Brainz Tutorial">
        <span>Gifted Brainz<br><small>Tutorial</small></span>
      </a>
      <nav class="sidenav" aria-label="Main menu">${links}</nav>
      <div class="side-foot">Gifted Brainz Tutorial<br>No cramming, just understanding.</div>
    </aside>`;
  }

  function mount(opts = {}) {
    const host = document.getElementById("shell");
    if (!host) return;
    host.classList.add("shell");
    const main = host.querySelector(".main");
    host.insertAdjacentHTML("afterbegin", shell(opts));
    if (main) host.appendChild(main);
    const content = host.querySelector(".content");
    if (content && !content.querySelector(".channel-banner")) content.insertAdjacentHTML("afterbegin", channelBanner());

    const sidebar = document.getElementById("sidebar");
    const scrim = document.getElementById("scrim");
    const toggle = document.getElementById("menuToggle");
    const close = () => { sidebar.classList.remove("open"); scrim.hidden = true; };
    toggle?.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      scrim.hidden = !sidebar.classList.contains("open");
    });
    scrim?.addEventListener("click", close);
    sidebar?.addEventListener("click", e => { if (e.target.closest("a")) close(); });
    addEventListener("keydown", e => { if (e.key === "Escape") close(); });

    const who = document.getElementById("who");
    if (who) {
      try {
        const u = JSON.parse(localStorage.getItem("gbUser") || "{}");
        if (u && u.name) who.textContent = u.name;
      } catch {}
    }
    setTimeout(()=>{notificationCenter();syncGrantedDeviceNotifications();},0);
  }

  /* --------------------------- notifications --------------------------- */
  function pushBytes(value){
    const s=String(value||"").replace(/-/g,"+").replace(/_/g,"/");
    const pad=s.length%4?"=".repeat(4-s.length%4):"";
    const raw=atob(s+pad); return Uint8Array.from(raw,c=>c.charCodeAt(0));
  }
  async function enableDeviceNotifications(){
    if(!("Notification" in window)||!("serviceWorker" in navigator)||!("PushManager" in window)) throw new Error("This browser does not support device notifications.");
    const permission=Notification.permission==="granted"?"granted":await Notification.requestPermission();
    if(permission!=="granted") throw new Error("Device notifications are blocked. Allow notifications for this site in your browser settings, then try again.");
    const reg=await navigator.serviceWorker.ready;
    const key=await GB.api("/api/push/public-key");
    let sub=await reg.pushManager.getSubscription();
    if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:pushBytes(key.publicKey)});
    const json=sub.toJSON();
    await GB.api("/api/push/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(json)});
    return true;
  }
  async function syncGrantedDeviceNotifications(){
    try{
      if(!window.GB?.token?.() || !("Notification" in window) || Notification.permission!=="granted") return false;
      await enableDeviceNotifications();
      return true;
    }catch{return false}
  }
  function notificationCenter(){
    if(document.getElementById("gbNoticeButton")) return;
    const top=document.querySelector(".topbar-right");
    if(!top || !window.GB?.token?.()) return;
    const wrap=document.createElement("div");
    wrap.style="position:relative;display:inline-flex";
    wrap.innerHTML=`<button class="btn light" id="gbNoticeButton" type="button" aria-label="Notifications" style="position:relative">🔔<span id="gbNoticeBadge" style="display:none;position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;padding:0 4px;border-radius:20px;background:#b91c1c;color:#fff;font-size:.68rem;line-height:18px;font-weight:900"></span></button><div id="gbNoticePanel" hidden style="position:absolute;right:0;top:46px;width:min(360px,calc(100vw - 28px));max-height:420px;overflow:auto;background:#fff;border:1px solid rgba(8,45,99,.15);border-radius:16px;box-shadow:0 18px 45px rgba(0,0,0,.18);z-index:5000;padding:10px"></div>`;
    top.prepend(wrap);
    const button=wrap.querySelector("#gbNoticeButton"), panel=wrap.querySelector("#gbNoticePanel"), badge=wrap.querySelector("#gbNoticeBadge");
    let lastIds=new Set(); let first=true;
    function esc2(v){return esc(v)}
    function render(items){
      if(!items.length){panel.innerHTML='<div class="muted" style="padding:16px;text-align:center">No notifications yet.</div>';return}
      panel.innerHTML=`<div style="padding:4px 4px 8px;display:flex;justify-content:space-between;align-items:center"><b>Notifications</b>${("Notification" in window && Notification.permission!=="granted")?'<button type="button" id="gbEnableNotifications" class="btn light" style="font-size:.78rem">Enable device alerts</button>':''}</div>`+items.map(n=>`<button type="button" data-notice-id="${esc2(n.id)}" data-notice-url="${esc2(n.url||"/dashboard.html")}" style="display:block;width:100%;text-align:left;border:0;background:${n.read?'#fff':'#f2f7ff'};padding:12px;border-radius:12px;margin:0 0 6px;cursor:pointer"><b>${esc2(n.title||"Notification")}</b><span style="display:block;color:#425466;font-size:.86rem;margin-top:4px">${esc2(n.message||"")}</span><small style="display:block;color:#7b8794;margin-top:6px">${n.createdAt?new Date(n.createdAt).toLocaleString():""}</small></button>`).join("");
      panel.querySelector("#gbEnableNotifications")?.addEventListener("click",async e=>{e.stopPropagation();const b=e.currentTarget;b.disabled=true;b.textContent="Enabling…";try{await enableDeviceNotifications();b.textContent="Device alerts enabled ✓";await load()}catch(err){b.disabled=false;b.textContent="Enable device alerts";panel.insertAdjacentHTML("afterbegin",`<div class="error" style="padding:8px">${esc2(err.message)}</div>`)}});
    }
    async function load(){
      try{
        const x=await GB.api("/api/notifications"); const items=x.items||[];
        const unread=Number(x.unread)||0; badge.style.display=unread?"inline-block":"none"; if(unread)badge.textContent=unread>99?"99+":String(unread);
        for(const n of items){
          if(!first && !lastIds.has(String(n.id)) && n.type==="update" && "serviceWorker" in navigator){
            try{const reg=await navigator.serviceWorker.ready; await reg.showNotification(n.title||"Gifted Brainz update",{body:n.message||"A new update is available.",icon:"/assets/icon-192.png",badge:"/assets/icon-192.png",data:{url:n.url||"/login.html"}})}catch{}
          }
        }
        lastIds=new Set(items.map(n=>String(n.id))); first=false; render(items);
      }catch{}
    }
    button.addEventListener("click",async e=>{e.stopPropagation();panel.hidden=!panel.hidden;if(!panel.hidden){await load();const unread=(panel.querySelectorAll("button[data-notice-id]").length);if(unread)await GB.api("/api/notifications/read",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})}).catch(()=>{});await load()}});
    panel.addEventListener("click",async e=>{const item=e.target.closest("[data-notice-id]");if(!item)return;const id=item.dataset.noticeId,url=item.dataset.noticeUrl||"/dashboard.html";await GB.api("/api/notifications/read",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids:[id]})}).catch(()=>{});if(url.startsWith("/login.html?update=")) sessionStorage.setItem("gbForceUpdateCheck","1");location.href=url});
    load();setInterval(load,45000);
  }

  /* ------------------- safe rendering of rich content ------------------- */
  // The server already strips anything unsafe. This is the second line of
  // defence: the markup is rebuilt from an allow-list inside the browser too.
  const ALLOWED = new Set(["B", "STRONG", "I", "EM", "U", "S", "STRIKE", "BR", "P", "DIV",
    "SPAN", "UL", "OL", "LI", "BLOCKQUOTE", "H1", "H2", "H3", "H4", "SUP", "SUB", "CODE", "PRE", "A"]);

  function safeHtml(html) {
    const src = document.createElement("div");
    src.innerHTML = String(html ?? "");
    const out = document.createElement("div");
    walk(src, out);
    return out.innerHTML;
  }

  function walk(from, to) {
    from.childNodes.forEach(node => {
      if (node.nodeType === 3) { to.appendChild(document.createTextNode(node.nodeValue)); return; }
      if (node.nodeType !== 1) return;
      if (!ALLOWED.has(node.tagName)) { walk(node, to); return; }
      const el = document.createElement(node.tagName.toLowerCase());
      if (node.tagName === "A") {
        const href = String(node.getAttribute("href") || "");
        if (!/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(href)) { walk(node, to); return; }
        el.setAttribute("href", href);
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer nofollow");
      }
      walk(node, el);
      to.appendChild(el);
    });
  }

  // Older material was stored as plain text: keep the line breaks and make
  // any link inside it clickable, so nothing published before an update is lost.
  function textToHtml(text) {
    const escaped = esc(text);
    const linked = escaped.replace(/((?:(?:https?:\/\/|www\.)[^\s<]+|[a-z0-9.-]+\.(?:com|org|net|ng|edu|gov|co|uk)(?:\/[^\s<]*)?))/gi, url => {
      const clean = url.replace(/[).,;:!?]+$/, "");
      const tail = url.slice(clean.length);
      const href = /^(?:https?:\/\/)/i.test(clean) ? clean : "https://" + clean;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer nofollow">${clean}</a>${tail}`;
    });
    return linked.replace(/\n/g, "<br>");
  }

  function renderBody(value, format) {
    const raw = String(value ?? "");
    if (!raw.trim()) return "";
    return format === "html" || /<(a|b|i|u|p|div|br|ul|ol|li|strong|em)\b/i.test(raw)
      ? safeHtml(raw)
      : textToHtml(raw);
  }

  /* ---------------------------- media & files --------------------------- */
  function kindOf(f) {
    if (f.kind) return f.kind;
    const t = String(f.contentType || "").toLowerCase(), n = String(f.fileName || "").toLowerCase();
    if (t.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(n)) return "image";
    if (t.startsWith("video/") || /\.(mp4|webm|ogv|mov|m4v)$/.test(n)) return "video";
    if (t.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac)$/.test(n)) return "audio";
    if (t === "application/pdf" || /\.pdf$/.test(n)) return "pdf";
    if (t.startsWith("text/") || /\.(txt|md|csv|json)$/.test(n)) return "text";
    return "file";
  }

  const ICON_FOR = { image: "🖼️", video: "🎬", audio: "🎧", pdf: "📄", text: "📃", file: "📎" };

  // Pictures and videos are shown inline; every other type gets a
  // "View in app" button (when the browser can display it) and a download.
  function media(list) {
    if (!Array.isArray(list) || !list.length) return "";
    return `<div class="media-grid">` + list.map(f => {
      const url = GB.fileUrl(f.url, { inline: true });
      const kind = kindOf(f);
      if (kind === "image") return `<figure class="media"><a href="${esc(url)}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(url)}" alt="${esc(f.fileName || "Announcement picture")}"></a><figcaption>${esc(f.fileName || "")}</figcaption></figure>`;
      if (kind === "video") return `<figure class="media"><video controls playsinline preload="metadata" src="${esc(url)}" type="${esc(f.contentType||"video/mp4")}"></video><figcaption>${esc(f.fileName || "")}</figcaption><a class="muted" href="${esc(url)}" target="_blank" rel="noopener">Open video separately</a></figure>`;
      if (kind === "audio") return `<figure class="media"><audio controls preload="metadata" src="${esc(url)}"></audio><figcaption>${esc(f.fileName || "")}</figcaption></figure>`;
      return fileRow(f);
    }).join("") + `</div>`;
  }

  function fileRow(f) {
    const kind = kindOf(f);
    const viewable = kind !== "file";
    const inline = GB.fileUrl(f.url, { inline: true });
    return `<div class="filerow"><span class="fic">${ICON_FOR[kind] || "📎"}</span>
      <span class="fname">${esc(f.fileName || "Attachment")}</span>
      <span class="factions">
        ${viewable ? `<a class="btn light" href="${esc(inline)}" target="_blank" rel="noopener">View in app</a>` : ""}
        <button class="btn gold" type="button" data-download-file="${esc(f.url)}" data-download-name="${esc(f.fileName || "")}">Download</button>
      </span></div>`;
  }

  function files(list) {
    if (!Array.isArray(list) || !list.length) return "";
    return `<div class="filelist">${list.map(fileRow).join("")}</div>`;
  }

  /* -------------------------- show more / less -------------------------- */
  // Any list longer than the limit collapses, with a Show more / Show less
  // control so a busy subject never crowds the screen.
  const LIMIT = 5;
  function collapsible(id, cards, limit = LIMIT) {
    if (!cards.length) return `<p class="muted">Nothing here yet.</p>`;
    const head = cards.slice(0, limit).join("");
    if (cards.length <= limit) return `<div class="list">${head}</div>`;
    const rest = cards.slice(limit).join("");
    return `<div class="list">${head}<div class="list more" id="${id}" hidden>${rest}</div></div>
      <button class="btn light showmore" type="button" data-more="${id}">▾ Show more (${cards.length - limit} more)</button>`;
  }

  document.addEventListener("click", e => {
    const dl = e.target.closest("[data-download-file]");
    if (dl) {
      e.preventDefault();
      GB.download(dl.dataset.downloadFile, dl.dataset.downloadName || "");
      return;
    }
    const b = e.target.closest("[data-more]");
    if (!b) return;
    const box = document.getElementById(b.dataset.more);
    if (!box) return;
    const open = box.hidden;
    box.hidden = !open;
    b.textContent = open ? "▴ Show less" : `▾ Show more (${box.children.length} more)`;
  });

  function confirmAction(title, message, proceedLabel="Yes, proceed") {
    return new Promise(resolve => {
      const modal=document.createElement("div"); modal.className="modal critical-modal";
      modal.innerHTML=`<div class="modal-box critical-box" role="dialog" aria-modal="true"><div class="section-head"><h2>${esc(title)}</h2><button type="button" class="btn light" data-cancel>✕</button></div><p>${esc(message)}</p><div class="factions" style="justify-content:flex-end"><button class="btn light" type="button" data-cancel>Cancel</button><button class="btn danger" type="button" data-proceed>${esc(proceedLabel)}</button></div></div>`;
      document.body.appendChild(modal); document.body.classList.add("noscroll");
      const finish=v=>{modal.remove();document.body.classList.remove("noscroll");resolve(v)};
      modal.addEventListener("click",e=>{if(e.target===modal||e.target.closest("[data-cancel]"))finish(false);else if(e.target.closest("[data-proceed]"))finish(true)});
      setTimeout(()=>modal.querySelector("[data-proceed]")?.focus(),0);
    });
  }

  function unsavedGuard() {
    let dirty=false;
    const mark=()=>{dirty=true}; const clear=()=>{dirty=false};
    addEventListener("beforeunload",e=>{if(!dirty)return;e.preventDefault();e.returnValue=""});
    return {mark,clear};
  }

  /* ------------------------- grading (score bands) ---------------------- */
  // One place decides the colour, the word, the remark and the emoji so the
  // dashboard, the CBT results page, performance and the admin views agree.
  const BANDS = [
    { min: 0,  max: 39,  band: "red",    word: "Needs work", colour: "#b3261e", soft: "#fdeceb", ink: "#8a1b13",
      emoji: "💪", remark: "Don't be discouraged, you just need work" },
    { min: 40, max: 59,  band: "orange", word: "Fair",       colour: "#e08a00", soft: "#fff3e0", ink: "#8a5000",
      emoji: "🙂", remark: "Fair enough. There is room for improvement" },
    { min: 60, max: 79,  band: "green",  word: "Good",       colour: "#067647", soft: "#e7f6ee", ink: "#04502f",
      emoji: "👍", remark: "Nice attempt. You can do better" },
    { min: 80, max: 100, band: "blue",   word: "Excellent",  colour: "#1454b8", soft: "#e8f0fe", ink: "#123a6b",
      emoji: "🌟", remark: "Excellent. Keep it up" }
  ];

  function GRADE(score) {
    const n = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
    const b = BANDS.find(x => n >= x.min && n <= x.max) || BANDS[0];
    return { ...b, score: n, text: `${b.remark} ${b.emoji}` };
  }

  // Circular score meter used on the results screen (matches the design).
  function scoreDonut(percent, size = 168) {
    const g = GRADE(percent);
    const r = 52, c = 2 * Math.PI * r, off = c * (1 - g.score / 100);
    return `<svg class="donut" viewBox="0 0 130 130" width="${size}" height="${size}" role="img" aria-label="Score ${g.score} percent">
      <circle class="track" cx="65" cy="65" r="${r}"></circle>
      <circle class="bar" cx="65" cy="65" r="${r}" stroke="${g.colour}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"></circle>
      <text x="65" y="73" text-anchor="middle" fill="${g.colour}">${g.score}%</text>
    </svg>`;
  }

  function stars(rating, big = false) {
    const n = Math.round(Number(rating) || 0);
    return `<span class="rating-stars${big ? " big" : ""}" aria-label="${n} out of 5 stars">${"★".repeat(Math.min(5, n))}${"☆".repeat(Math.max(0, 5 - n))}</span>`;
  }

  return { NAV, SUBJECTS, SUBJECT_ICONS, esc, mount, safeHtml, textToHtml, renderBody, media, files, fileRow, kindOf, collapsible, confirmAction, unsavedGuard, CHANNEL_URL, GRADE, scoreDonut, stars, enableDeviceNotifications, syncGrantedDeviceNotifications };
})();
