/* store.js : les données. Supabase en ligne, ou mode démo (stockage local). */
(function () {
  'use strict';
  const CFG = window.APP_CONFIG || {};
  const LIVE = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
  const BUCKET = CFG.BUCKET || 'souvenirs';
  const POLL_MS = 15000;
  const PLATFORM = Object.assign({ Ange: 'deezer', Leeamm: 'apple' }, CFG.PLATFORM || {});

  const pad = (n) => String(n).padStart(2, '0');
  const uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
  const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const localInput = (d) => ymd(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = () => rej(new Error('Impossible de charger ' + src));
      document.head.appendChild(s);
    });
  }

  /* ---------- Fichiers du mode démo (IndexedDB) ---------- */
  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('lxa_demo', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('blobs');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function idbGet(k) {
    const db = await idb();
    return new Promise((res, rej) => {
      const q = db.transaction('blobs').objectStore('blobs').get(k);
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(q.error);
    });
  }
  async function idbPut(k, v) {
    const db = await idb();
    return new Promise((res, rej) => {
      const q = db.transaction('blobs', 'readwrite').objectStore('blobs').put(v, k);
      q.onsuccess = () => res();
      q.onerror = () => rej(q.error);
    });
  }
  async function idbDel(k) {
    const db = await idb();
    return new Promise((res) => {
      const q = db.transaction('blobs', 'readwrite').objectStore('blobs').delete(k);
      q.onsuccess = () => res();
      q.onerror = () => res();
    });
  }

  /* ---------- Contenu d'exemple du mode démo ---------- */
  function makeSeed() {
    const now = new Date();
    const at = (dd, h, m) => localInput(new Date(now.getFullYear(), now.getMonth(), now.getDate() + dd, h, m));
    const day = (dd) => ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + dd));
    let k = 0;
    const rows = [];
    const add = (kind, author, data) => {
      const t = new Date(now.getTime() - (200 - k++) * 36e5).toISOString();
      const r = { id: uid(), kind, author, data, created_at: t, updated_at: t };
      rows.push(r);
      return r;
    };

    const m0 = add('moment', 'Leeamm', { place: 'Chez Leeamm', start: at(-83, 17, 0), end: at(-80, 14, 0) });
    const m1 = add('moment', 'Ange', { place: 'Chez Leeamm', start: at(24, 18, 30), end: at(27, 14, 0) });
    const m2 = add('moment', 'Leeamm', { place: 'Chez la mamie de Ange', start: at(43, 10, 0), end: at(47, 17, 0) });
    add('moment', 'Ange', { place: '12 rue des Lilas', start: at(95, 19, 0), end: at(97, 16, 0) });
    add('activity', 'Ange', { momentId: m1.id, label: 'Marché de Noël', date: day(25), place: 'En ville' });
    add('activity', 'Leeamm', { momentId: m1.id, label: 'Cuisiner ensemble', date: day(26), place: '' });
    add('activity', 'Ange', { momentId: m1.id, label: 'Film sous un plaid', date: '', place: '' });
    add('activity', 'Ange', { momentId: m2.id, label: "Balade au bord de l'eau", date: day(46), place: '' });
    add('activity', 'Leeamm', { momentId: m2.id, label: 'Goûter avec la mamie', date: '', place: '' });
    add('activity', 'Ange', { momentId: m0.id, label: 'Premier dîner', date: day(-83), place: '' });

    const i1 = add('idea', 'Ange', { text: "Et si on écrivait chacun une lettre qu'on ouvrirait ensemble à notre prochaine rencontre ?" });
    const i2 = add('idea', 'Leeamm', { text: 'On pourrait cuisiner la même recette en visio, chacun chez soi.' });
    add('comment', 'Leeamm', { parentId: i1.id, text: 'Je commence la mienne ce soir.' });
    add('reaction', 'Leeamm', { parentId: i1.id, type: 'heart' });
    add('reaction', 'Leeamm', { parentId: i1.id, type: 'cute' });
    add('reaction', 'Ange', { parentId: i2.id, type: 'heart' });

    add('question', 'Leeamm', { to: 'Ange', status: 'open', text: "Quel petit moment de notre semaine t'a fait sourire sans que je le sache ?" });
    add('question', 'Ange', { to: 'Leeamm', status: 'think', text: "Qu'est-ce que tu aimerais qu'on fasse plus souvent, à distance ?" });

    const t1 = add('trip', 'Ange', { name: 'Lisbonne', stage: 'planned', start: day(124), end: day(128), notes: "Penser à prendre les chargeurs et la carte d'identité." });
    const ex = (tripId, category, label, amount, paidBy, scope, details) => add('expense', paidBy, { tripId, category, label, amount, paidBy, scope, details: details || {}, date: day(-10), time: '' });
    ex(t1.id, 'transport', 'Vols aller-retour pour deux', 180, 'Leeamm', 'both', { mode: 'Avion', company: 'TAP Air Portugal', route: 'Paris → Lisbonne' });
    ex(t1.id, 'lodging', 'Appartement, 4 nuits', 320, 'Leeamm', 'both', { type: 'Appartement', name: 'Appartement Alfama', nights: '4' });
    ex(t1.id, 'groceries', 'Courses du premier soir', 64, 'Ange', 'both', { store: 'Pingo Doce' });
    ex(t1.id, 'activities', 'Entrées de musée', 52, 'Ange', 'both', { place: 'Musée du Fado' });
    ex(t1.id, 'transport', 'Valise cabine supplémentaire', 25, 'Ange', 'Ange', { mode: 'Avion', company: 'TAP Air Portugal' });
    const t2 = add('trip', 'Leeamm', { name: 'Islande en hiver', stage: 'idea', start: '', end: '', notes: 'Aurores boréales et bains chauds.' });
    ex(t2.id, 'transport', 'Vols (estimation)', 600, 'Leeamm', 'both', { mode: 'Avion' });
    ex(t2.id, 'lodging', 'Logement (estimation)', 300, 'Ange', 'both', { type: 'Chambre d\'hôtes' });
    add('trip', 'Ange', { name: 'Les Cinque Terre au printemps', stage: 'idea', start: '', end: '', notes: '' });

    const q = (t, a) => 'https://www.deezer.com/search/' + encodeURIComponent(t + ' ' + a);
    const q2 = (t, a) => 'https://music.apple.com/fr/search?term=' + encodeURIComponent(t + ' ' + a);
    add('song', 'Ange', { title: 'Lueur de décembre', artist: 'Maëlle Voss', cover: '', deezer: q('Lueur de décembre', 'Maëlle Voss'), apple: q2('Lueur de décembre', 'Maëlle Voss'), deezerSearch: true, appleSearch: true });
    add('song', 'Leeamm', { title: 'Fenêtre sur le soir', artist: 'Orchestre des Marées', cover: '', deezer: q('Fenêtre sur le soir', 'Orchestre des Marées'), apple: q2('Fenêtre sur le soir', 'Orchestre des Marées'), deezerSearch: true, appleSearch: true });
    const tr = (title, artist) => ({ title, artist, cover: '', apple: 'https://music.apple.com/fr/search?term=' + encodeURIComponent(title + ' ' + artist), deezer: 'https://www.deezer.com/search/' + encodeURIComponent(title + ' ' + artist) });
    add('folder', 'Ange', { name: 'Enregistrements', parentId: '' });
    add('show', 'Ange', { type: 'concert', title: 'Maëlle Voss en concert', venue: 'La Cigale, Paris', ticketsOpen: day(10), ticketsOpenTime: '10:00', date: day(60), time: '20:00', duration: 120, notes: '', setlist: [tr('Lueur de décembre', 'Maëlle Voss'), tr('Encore un peu', 'Sinclair Ro')], outfits: [], tripId: '' });
    add('show', 'Leeamm', { type: 'cine', title: 'Un film à voir ensemble', venue: 'Cinéma du coin', ticketsOpen: '', ticketsOpenTime: '', date: day(30), time: '21:15', duration: 105, notes: '', setlist: [], outfits: [], tripId: '' });
    const pr = add('presence', 'Leeamm', { at: new Date(now.getTime() - 2 * 36e5).toISOString() });
    pr.id = 'presence-Leeamm';
    return rows;
  }

  /* ---------- Mode démo ---------- */
  const demo = {
    rows: [],
    async init() {
      const raw = localStorage.getItem('lxa_demo_items');
      this.rows = raw ? JSON.parse(raw) : makeSeed();
      this.save();
    },
    save() { localStorage.setItem('lxa_demo_items', JSON.stringify(this.rows)); },
    async hasSession() { return true; },
    async signIn() { return true; },
    async signOut() {},
    async list() { return JSON.parse(JSON.stringify(this.rows)); },
    async insert(row) { this.rows.push(JSON.parse(JSON.stringify(row))); this.save(); },
    async update(id, patch) { const r = this.rows.find((x) => x.id === id); if (r) { Object.assign(r, patch); this.save(); } },
    async remove(id) { this.rows = this.rows.filter((x) => x.id !== id); this.save(); },
    async upsert(row) { const i = this.rows.findIndex((x) => x.id === row.id); if (i >= 0) this.rows[i] = JSON.parse(JSON.stringify(row)); else this.rows.push(JSON.parse(JSON.stringify(row))); this.save(); },
    async saveSub() {},
    async removeSub() {},
    async upload(path, blob) { await idbPut(path, blob); },
    async urls(paths) {
      const out = {};
      for (const p of paths) { const b = await idbGet(p); if (b) out[p] = URL.createObjectURL(b); }
      return out;
    },
    async removeFiles(paths) { for (const p of paths) await idbDel(p); },
    reset() { localStorage.removeItem('lxa_demo_items'); }
  };

  /* ---------- Supabase ---------- */
  const sbb = {
    c: null,
    async init() {
      await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
      this.c = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    },
    async hasSession() {
      const r = await this.c.auth.getSession();
      return !!(r.data && r.data.session);
    },
    async signIn(pw) {
      const r = await this.c.auth.signInWithPassword({ email: CFG.SHARED_EMAIL, password: pw });
      if (r.error) throw r.error;
    },
    async signOut() { await this.c.auth.signOut(); },
    async list() {
      let all = [];
      let from = 0;
      const step = 1000;
      for (;;) {
        const r = await this.c.from('items').select('*').order('created_at', { ascending: true }).range(from, from + step - 1);
        if (r.error) throw r.error;
        all = all.concat(r.data);
        if (r.data.length < step) break;
        from += step;
      }
      return all;
    },
    async insert(row) { const r = await this.c.from('items').insert(row); if (r.error) throw r.error; },
    async update(id, patch) { const r = await this.c.from('items').update(patch).eq('id', id); if (r.error) throw r.error; },
    async remove(id) { const r = await this.c.from('items').delete().eq('id', id); if (r.error) throw r.error; },
    async upsert(row) { const r = await this.c.from('items').upsert(row); if (r.error) throw r.error; },
    async saveSub(person, sub) {
      const r = await this.c.from('push_subscriptions').upsert({ endpoint: sub.endpoint, person, sub, updated_at: new Date().toISOString() });
      if (r.error) throw r.error;
    },
    async removeSub(endpoint) { await this.c.from('push_subscriptions').delete().eq('endpoint', endpoint); },
    async upload(path, blob, type) {
      const r = await this.c.storage.from(BUCKET).upload(path, blob, { contentType: type || blob.type || 'application/octet-stream', upsert: false, cacheControl: '3600' });
      if (r.error) throw r.error;
    },
    async urls(paths) {
      const r = await this.c.storage.from(BUCKET).createSignedUrls(paths, 3600);
      if (r.error) throw r.error;
      const out = {};
      r.data.forEach((x) => { if (x.signedUrl) out[x.path] = x.signedUrl; });
      return out;
    },
    async removeFiles(paths) { await this.c.storage.from(BUCKET).remove(paths); }
  };

  const backend = LIVE ? sbb : demo;
  const urlCache = {};

  const Store = {
    LIVE,
    items: [],
    presence: {},
    onPresence: null,
    idx: {},
    map: new Map(),
    sig: '',
    me: localStorage.getItem('lxa_me') || '',
    util: { uid, ymd, localInput },

    setMe(n) { this.me = n; localStorage.setItem('lxa_me', n); },
    async boot() { await backend.init(); },
    hasSession() { return backend.hasSession(); },
    signIn(pw) { return backend.signIn(pw); },
    async signOut() { await backend.signOut(); this.items = []; this.sig = ''; this.reindex(); },
    resetDemo() { if (!LIVE) { demo.reset(); } },

    reindex() {
      const idx = {};
      const map = new Map();
      this.items.forEach((r) => { (idx[r.kind] = idx[r.kind] || []).push(r); map.set(r.id, r); });
      this.idx = idx;
      this.map = map;
      this.sig = this.items.map((r) => r.id + '@' + r.updated_at).join('|');
    },
    by(kind) { return this.idx[kind] || []; },
    get(id) { return this.map.get(id); },

    platform(name) { return PLATFORM[name || this.me] === 'apple' ? 'apple' : 'deezer'; },

    /* « Dernière connexion » : écrite sur le serveur à chaque ouverture réelle du site */
    async beat() {
      if (!this.me) return;
      const now = new Date().toISOString();
      const row = { id: 'presence-' + this.me, kind: 'presence', author: this.me, data: { at: now }, created_at: now, updated_at: now };
      try { await backend.upsert(row); this.presence[this.me] = row; if (this.onPresence) this.onPresence(); } catch (e) { /* hors ligne */ }
    },
    saveSub(person, sub) { return backend.saveSub(person, sub); },
    removeSub(endpoint) { return backend.removeSub(endpoint); },
    removeFiles(paths) { return backend.removeFiles(paths); },

    async load() {
      const all = await backend.list();
      const pres = {};
      const rows = [];
      all.forEach((r) => { if (r.kind === 'presence') pres[r.author] = r; else rows.push(r); });
      this.presence = pres;
      if (this.onPresence) this.onPresence();
      const sig = rows.map((r) => r.id + '@' + r.updated_at).join('|');
      if (sig === this.sig) return false;
      this.items = rows;
      this.reindex();
      return true;
    },

    async add(kind, data) {
      const now = new Date().toISOString();
      const row = { id: uid(), kind, author: this.me, data, created_at: now, updated_at: now };
      this.items.push(row);
      this.reindex();
      try { await backend.insert(row); } catch (e) { this.items = this.items.filter((x) => x.id !== row.id); this.reindex(); throw e; }
      return row;
    },

    async patch(id, partial) {
      const it = this.get(id);
      if (!it) return;
      const old = { data: it.data, updated_at: it.updated_at };
      it.data = Object.assign({}, it.data, partial);
      it.updated_at = new Date().toISOString();
      this.reindex();
      try { await backend.update(id, { data: it.data, updated_at: it.updated_at }); } catch (e) { it.data = old.data; it.updated_at = old.updated_at; this.reindex(); throw e; }
    },

    async del(id) {
      const it = this.get(id);
      if (!it) return;
      const kill = [it];
      this.items.forEach((x) => {
        if (x.id === id) return;
        const d = x.data;
        if ((it.kind === 'idea' || it.kind === 'question') && d.parentId === id) kill.push(x);
        if (it.kind === 'trip' && x.kind === 'expense' && d.tripId === id) kill.push(x);
        if (it.kind === 'moment' && x.kind === 'activity' && d.momentId === id) kill.push(x);
      });
      const ids = kill.map((x) => x.id);
      const fix = [];
      if (it.kind === 'moment' || it.kind === 'activity') {
        this.items.forEach((x) => {
          if (x.kind === 'photo' && (ids.indexOf(x.data.momentId) >= 0 || ids.indexOf(x.data.activityId) >= 0)) fix.push(x);
        });
      }
      const paths = [];
      kill.forEach((x) => {
        if (x.kind === 'photo') paths.push(x.data.path, x.data.thumb);
        if (x.kind === 'file') paths.push(x.data.path);
        if (x.kind === 'show') (x.data.outfits || []).forEach((o) => paths.push(o.path, o.thumb));
      });
      const unlink = it.kind === 'trip' ? this.items.filter((x) => x.kind === 'show' && x.data.tripId === id) : [];
      this.items = this.items.filter((x) => ids.indexOf(x.id) < 0);
      this.reindex();
      for (const x of kill) await backend.remove(x.id);
      for (const p of fix) {
        const d = {};
        if (ids.indexOf(p.data.momentId) >= 0) { d.momentId = ''; d.activityId = ''; }
        if (ids.indexOf(p.data.activityId) >= 0) d.activityId = '';
        await this.patch(p.id, d);
      }
      for (const s of unlink) await this.patch(s.id, { tripId: '' });
      if (paths.length) { try { await backend.removeFiles(paths); } catch (e) { /* tant pis */ } }
    },

    upload(path, blob, type) { return backend.upload(path, blob, type); },

    async fileUrls(paths) {
      const now = Date.now();
      const need = paths.filter((p) => !urlCache[p] || urlCache[p].exp < now);
      if (need.length) {
        try {
          const got = await backend.urls(need);
          Object.keys(got).forEach((p) => { urlCache[p] = { url: got[p], exp: now + 50 * 60 * 1000 }; });
        } catch (e) { /* on réessaiera */ }
      }
      const out = {};
      paths.forEach((p) => { if (urlCache[p]) out[p] = urlCache[p].url; });
      return out;
    },

    startPolling(cb) {
      const poll = async () => {
        try { if (await this.load()) cb(); } catch (e) { /* hors ligne : on réessaiera */ }
      };
      setInterval(poll, POLL_MS);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
    }
  };

  window.Store = Store;
})();
