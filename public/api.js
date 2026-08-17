/* ------------------------------------------------------------------
   Gifted Brainz Tutorial — API client.

   Why this file is defensive: the portal runs on serverless functions, so
   the very first request after a quiet period has to wake the server up.
   A browser reports that wake-up delay (and any brief mobile-data drop) as
   "server not found". Requests are therefore retried with a short backoff,
   given a real timeout, and any non-JSON reply from a platform error page is
   translated into a message the student can act on.
------------------------------------------------------------------- */
window.GB = (() => {
  const tokenKey = "gbToken";
  const token = () => { try { return localStorage.getItem(tokenKey) || ""; } catch { return ""; } };

  const esc = v => String(v ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const TIMEOUT = 20000;      // allow a cold serverless start to finish
  const RETRIES = 3;          // retry brief gateway/serverless wake-up failures
  const wait = ms => new Promise(r => setTimeout(r, ms));

  class NetworkError extends Error {}

  async function once(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);
    try {
      return await fetch(url, { ...options, signal: controller.signal, cache: "no-store" });
    } catch (e) {
      // Aborts, DNS failures and dropped connections all land here.
      throw new NetworkError(
        e && e.name === "AbortError"
          ? "The server is taking too long to respond. Please try again."
          : "Could not reach the Gifted Brainz server. Check your internet connection and try again."
      );
    } finally { clearTimeout(timer); }
  }

  const api = async (url, options = {}) => {
    const headers = { ...(options.headers || {}) };
    if (token()) headers.Authorization = `Bearer ${token()}`;

    let lastError = null;
    for (let attempt = 0; attempt < RETRIES; attempt++) {
      if (attempt) await wait(350 * attempt);
      let r;
      try {
        r = await once(url, { ...options, headers });
      } catch (e) { lastError = e; continue; }

      // Gateway-level failures mean the function has not answered yet.
      if ([502, 503, 504, 522, 524].includes(r.status)) {
        lastError = new NetworkError("The server is waking up. Please try again in a moment.");
        continue;
      }

      let data = {};
      const type = r.headers.get("content-type") || "";
      if (type.includes("application/json")) {
        try { data = await r.json(); } catch { data = {}; }
      } else {
        // Anything that is not JSON on an /api/ route means the request never
        // reached the API function: the host answered with a web page instead.
        // The usual cause is a deploy that published the static files but not
        // the serverless function (a drag-and-drop deploy does not build
        // functions), in which case /api/* falls through to the 404 page or to
        // the single-page fallback. Reporting that plainly — on a 200 as well
        // as on an error — stops a broken deploy from looking like a wrong
        // password, and stops a fallback page from being mistaken for a
        // successful login.
        const text = await r.text().catch(() => "");
        const looksLikeHtml = text.trim().startsWith("<");
        if (looksLikeHtml || !r.ok) {
          data = {
            error: looksLikeHtml
              ? "The API is not responding on this site: the server returned a web page instead of data. The serverless function was not published with this deploy. Open /diagnostics.html for details."
              : (text || "Request failed."),
            apiMissing: looksLikeHtml
          };
          if (looksLikeHtml) throw Error(data.error);
        }
      }

      if (r.status === 401) {
        try {
          localStorage.removeItem(tokenKey);
          localStorage.removeItem("gbAdminToken");
          localStorage.removeItem("gbUser");
        } catch {}
        const path = location.pathname;
        // Say why the student is back on the sign-in screen. Without this the
        // bounce looks exactly like "the login page just refreshed".
        if (!path.endsWith("login.html") && !path.endsWith("admin.html") && !path.endsWith("register.html") && path !== "/")
          location = "/login.html?session=expired";
      }
      if (!r.ok) throw Error(data.error || `Request failed (${r.status}).`);
      return data;
    }
    throw lastError || new NetworkError("Could not reach the Gifted Brainz server. Please try again.");
  };

  // Used by the sign-in screens to say precisely what is wrong.
  const health = async () => {
    try { const r = await once("/api/health", { method: "GET" }); return r.ok; }
    catch { return false; }
  };

  const logout = () => {
    try {
      localStorage.removeItem("gbToken");
      localStorage.removeItem("gbAdminToken");
      localStorage.removeItem("gbUser");
    } catch {}
    location = "/";
  };

  // Phones frequently report an empty MIME type for camera videos, so the
  // extension is sent along and the server works the real type out.
  const guessType = name => {
    const e = String(name || "").toLowerCase().split(".").pop();
    return ({ mp4: "video/mp4", m4v: "video/x-m4v", mov: "video/quicktime", webm: "video/webm",
      "3gp": "video/3gpp", mkv: "video/x-matroska", avi: "video/x-msvideo",
      mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav", ogg: "audio/ogg", aac: "audio/aac",
      png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp",
      pdf: "application/pdf" }[e]) || "";
  };

  const uploadOverlay = (() => {
    let host=null, label=null, fill=null, pct=null;
    function ensure(){
      if(host) return;
      host=document.createElement("div");
      host.id="gbUploadProgress";
      host.setAttribute("role","status");
      host.setAttribute("aria-live","polite");
      host.style.cssText="position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:99999;width:min(92vw,430px);padding:12px 14px;border-radius:14px;background:#082d63;color:#fff;box-shadow:0 12px 30px rgba(0,0,0,.22);font:600 14px system-ui,sans-serif;";
      host.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><span id="gbUploadLabel">Uploading…</span><strong id="gbUploadPct">0%</strong></div><div style="height:8px;background:rgba(255,255,255,.22);border-radius:99px;overflow:hidden;margin-top:8px"><i id="gbUploadFill" style="display:block;height:100%;width:0%;background:#f4c542;border-radius:99px;transition:width .18s ease"></i></div>';
      document.body.appendChild(host);
      label=host.querySelector("#gbUploadLabel"); pct=host.querySelector("#gbUploadPct"); fill=host.querySelector("#gbUploadFill");
    }
    return {
      start(name){ensure(); label.textContent=`Uploading ${name||"file"}…`; pct.textContent="0%"; fill.style.width="0%"; host.hidden=false;},
      progress(name,v){ensure(); const n=Math.max(0,Math.min(100,Number(v)||0)); label.textContent=`Uploading ${name||"file"}…`; pct.textContent=n+"%"; fill.style.width=n+"%";},
      done(){if(!host)return; pct.textContent="100%"; fill.style.width="100%"; label.textContent="Upload complete"; setTimeout(()=>{if(host)host.hidden=true;},700);},
      fail(){if(host){label.textContent="Upload failed"; setTimeout(()=>{if(host)host.hidden=true;},1200);}}
    };
  })();

  const upload = async (file, onProgress) => {
    if (!file) return {};
    uploadOverlay.start(file.name);
    const report=(v)=>{uploadOverlay.progress(file.name,v); if(onProgress) onProgress(v);};
    report(0);
    try{
      const contentType = file.type || guessType(file.name);
      const init = await api("/api/admin/upload/init", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, contentType, size: file.size, chunkSize: 2 * 1024 * 1024 })
      });
      const CHUNK = Math.max(256 * 1024, Number(init.chunkSize) || 1024 * 1024);
      let index = 0, sent = 0;
      for (let off = 0; off < file.size; off += CHUNK, index++) {
        const bytes = new Uint8Array(await file.slice(off, off + CHUNK).arrayBuffer());
        let binary = ""; const step = 0x8000;
        for (let i = 0; i < bytes.length; i += step) binary += String.fromCharCode(...bytes.subarray(i, i + step));
        await api("/api/admin/upload/chunk", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uploadId: init.uploadId, index, data: btoa(binary) })
        });
        sent += bytes.length;
        report(Math.min(98, Math.round(sent / Math.max(1, file.size) * 98)));
      }
      const done = await api("/api/admin/upload/complete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId: init.uploadId, parts: index })
      });
      report(100);
      uploadOverlay.done();
      return { ...done, contentType: done.contentType || contentType, size: file.size };
    }catch(err){
      uploadOverlay.fail();
      throw err;
    }
  };
  // Browser navigations (downloads, embedded viewers) cannot send an
  // Authorization header, so the signed token travels as a query parameter.
  const fileUrl = (url, opts = {}) => {
    if (!url) return "";
    const u = new URL(url, location.origin);
    if (token()) u.searchParams.set("token", token());
    if (opts.inline) u.searchParams.set("inline", "1");
    return u.pathname + u.search;
  };

  const download = (url, fileName) => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = fileUrl(url); a.download = fileName || ""; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
  };

  const del = url => api(url, { method: "DELETE" });

  return { api, esc, token, logout, upload, fileUrl, download, del, health };
})();
