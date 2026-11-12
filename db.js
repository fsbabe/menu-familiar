/* Menú Familiar · capa de datos sobre Supabase.
   Expone window.claude.use("db" | "downloads") con la misma forma que usaba el artefacto,
   para no tocar la lógica de la aplicación. Todos los documentos viven en la tabla public.docs
   (collection, id, data jsonb) y se sincronizan en tiempo real entre dispositivos. */
(() => {
  const cfg = window.MF_CONFIG || {};
  const $ = s => document.querySelector(s);
  const configured = cfg.SUPABASE_URL && !/TU-PROYECTO/.test(cfg.SUPABASE_URL) && cfg.SUPABASE_ANON_KEY && !/TU-CLAVE/.test(cfg.SUPABASE_ANON_KEY);
  const sb = configured ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  /* ---------- sesión ---------- */
  let resolveReady; const ready = new Promise(r => resolveReady = r);
  function showApp(email){
    $("#login-screen").hidden = true; $("#app-root").hidden = false;
    const s = $("#session");
    if (s) { s.textContent = "· " + email + " "; const b = document.createElement("button"); b.className = "btn sm ghost"; b.textContent = "Salir";
      b.onclick = async () => { await sb.auth.signOut(); location.reload(); }; s.appendChild(b); }
  }
  function showLogin(msg){
    $("#app-root").hidden = true; $("#login-screen").hidden = false;
    if (msg) $("#login-msg").textContent = msg;
  }
  async function start(){
    if (!sb) { showLogin("Falta configurar Supabase: edita config.js con la URL y la clave anon de tu proyecto (ver README)."); $("#login-btn").disabled = true; return; }
    const { data } = await sb.auth.getSession();
    if (data.session) { showApp(data.session.user.email); resolveReady(true); return; }
    showLogin("");
    sb.auth.onAuthStateChange((ev, session) => { if (session) location.reload(); });
  }
  document.addEventListener("submit", async ev => {
    if (ev.target.id !== "login-form") return; ev.preventDefault();
    const email = $("#login-email").value.trim(); const btn = $("#login-btn"); btn.disabled = true;
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true } });
    btn.disabled = false;
    $("#login-msg").textContent = error ? "No se pudo enviar el enlace: " + error.message : "Te he enviado un enlace a " + email + ". Ábrelo en este mismo dispositivo.";
  });

  /* ---------- documentos ---------- */
  const cache = {};           // collection -> Map(id -> data)
  const loading = {};         // collection -> Promise
  const collSubs = [];        // {coll, cb}
  const docSubs = [];         // {coll, id, cb}
  const err = (code, message) => Object.assign(new Error(message), { code });
  function emit(coll){
    const m = cache[coll] || new Map();
    const docs = [...m.entries()].map(([id, d]) => ({ id, data: () => d }));
    collSubs.filter(s => s.coll === coll).forEach(s => { try { s.cb({ docs }); } catch (e) { console.error(e); } });
    docSubs.filter(s => s.coll === coll).forEach(s => { const d = m.get(s.id); try { s.cb({ exists: d !== undefined, data: () => d }); } catch (e) { console.error(e); } });
  }
  async function load(coll, onErr){
    if (!loading[coll]) loading[coll] = (async () => {
      const m = new Map(); let from = 0; const page = 1000;
      for (;;) {
        const { data, error } = await sb.from("docs").select("id,data").eq("collection", coll).range(from, from + page - 1);
        if (error) throw err(error.code === "42501" ? "not_granted" : "unavailable", error.message);
        data.forEach(r => m.set(r.id, r.data)); if (data.length < page) break; from += page;
      }
      cache[coll] = m;
    })().catch(e => { loading[coll] = null; if (onErr) onErr(e); throw e; });
    await loading[coll]; emit(coll);
  }
  const split = path => { const i = path.indexOf("/"); return [path.slice(0, i), path.slice(i + 1)]; };
  const db = {
    collection(coll){ return { onSnapshot(cb, onErr){ collSubs.push({ coll, cb }); if (cache[coll]) cb({ docs: [...cache[coll]].map(([id, d]) => ({ id, data: () => d })) }); else load(coll, onErr).catch(() => {}); return () => {}; } }; },
    doc(path){
      const [coll, id] = split(path);
      return {
        onSnapshot(cb, onErr){ docSubs.push({ coll, id, cb }); if (cache[coll]) emit(coll); else load(coll, onErr).catch(() => {}); return () => {}; },
        async get(){ if (!cache[coll]) await load(coll); const d = cache[coll].get(id); return { exists: d !== undefined, data: () => d }; },
        async set(data){
          const clean = JSON.parse(JSON.stringify(data));
          const { error } = await sb.from("docs").upsert({ collection: coll, id, data: clean });
          if (error) throw err(error.code === "42501" ? "not_granted" : "unavailable", error.message);
          (cache[coll] = cache[coll] || new Map()).set(id, clean); emit(coll);
        },
        async delete(){
          const { error } = await sb.from("docs").delete().eq("collection", coll).eq("id", id);
          if (error) throw err(error.code === "42501" ? "not_granted" : "unavailable", error.message);
          if (cache[coll]) cache[coll].delete(id); emit(coll);
        }
      };
    }
  };
  function realtime(){
    sb.channel("docs-cambios").on("postgres_changes", { event: "*", schema: "public", table: "docs" }, p => {
      const row = p.eventType === "DELETE" ? p.old : p.new; if (!row || !row.collection) return;
      const m = cache[row.collection]; if (!m) return;
      if (p.eventType === "DELETE") m.delete(row.id); else m.set(row.id, row.data);
      emit(row.collection);
    }).subscribe();
  }

  /* ---------- descargas ---------- */
  const downloads = {
    async save({ filename, data }){
      const blob = data instanceof Blob ? data : new Blob([data], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      return { status: "saved" };
    }
  };

  window.claude = { use: async name => {
    if (name === "downloads") return downloads;
    if (name !== "db") return null;              // sin funciones de IA en esta versión
    await ready; realtime(); return db;
  } };
  start();
})();
