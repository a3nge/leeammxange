/* actions.js : ce qui se passe quand on touche un bouton, et le démarrage. */
(function () {
  'use strict';
  const { S, $, esc, other, NAMES, toast, openSheet, closeSheet, field, fd, ymd, parseDay, fShort, euro, round2, plural, ic } = L;
  const CFG = window.APP_CONFIG;
  const A = (L.actions = {});
  const F = (L.forms = {});
  const C = (L.changes = {});
  const me = () => Store.me;
  const errMsg = (e) => (e && e.message ? e.message : 'Une erreur est survenue.');
  const redraw = () => L.renderMain();

  /* ---------- Affichage général ---------- */
  const TABS = [['home', 'Accueil'], ['moments', 'Moments'], ['ideas', 'Idées'], ['questions', 'Questionnements'], ['trips', 'Voyages'], ['shows', 'Concerts et ciné'], ['music', 'Musique'], ['album', 'Album'], ['files', 'Fichiers']];

  L.renderChrome = () => {
    $('#top').innerHTML = '<h1 class="brand"><span class="l">Leeamm</span> <span class="x">X</span> <span class="a">Ange</span></h1><button class="me-chip" data-act="settings" aria-label="Réglages">' + L.who(me()) + '</button>';
    $('#tabs').innerHTML = TABS.map((t) => '<button class="tab' + (S.tab === t[0] ? ' on' : '') + '" data-act="tab" data-tab="' + t[0] + '">' + t[1] + '</button>').join('');
    const on = $('#tabs .tab.on');
    if (on && on.scrollIntoView) { try { on.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) { /* ok */ } }
    if (L.renderPresence) L.renderPresence();
  };
  L.renderMain = () => {
    const y = window.scrollY;
    $('#view').innerHTML = L.views[S.tab]();
    L.hydrate($('#view'));
    window.scrollTo(0, y);
  };
  L.softRender = () => {
    const ae = document.activeElement;
    if (ae && ae.matches && ae.matches('#view input, #view textarea, #view select')) { S.dirty = true; return; }
    L.renderMain();
  };
  document.addEventListener('focusout', () => {
    if (!S.dirty) return;
    setTimeout(() => {
      const ae = document.activeElement;
      if (!(ae && ae.matches && ae.matches('#view input, #view textarea, #view select'))) { S.dirty = false; L.renderMain(); }
    }, 150);
  });

  A.tab = (el) => {
    const same = S.tab === el.dataset.tab;
    S.tab = el.dataset.tab; S.tripId = null; S.showId = null; S.openPicker = null;
    if (same) S.folderId = '';
    L.renderChrome(); redraw(); window.scrollTo(0, 0);
  };
  A.expand = (el) => { S.expanded[el.dataset.id] = !S.expanded[el.dataset.id]; redraw(); };
  A.toggleQ = (el) => { S.expanded[el.dataset.id] = !S.expanded[el.dataset.id]; redraw(); };
  A.toggleClosed = () => { S.showClosed = !S.showClosed; redraw(); };
  A.closeSheet = () => closeSheet();
  A.confirmYes = async () => { const cb = L._confirm; L._confirm = null; closeSheet(); if (cb) await cb(); };

  /* ---------- Réglages ---------- */
  A.settings = () => {
    openSheet('<h3 class="h3">Réglages</h3><div class="eyebrow">Je suis</div><div class="row">' + NAMES.map((n) => '<button class="btn ' + (me() === n ? 'btn-primary' : 'btn-ghost') + ' grow" data-act="setMe" data-name="' + n + '">' + n + '</button>').join('') + '</div>' +
      (Store.LIVE
        ? '<button class="btn btn-ghost btn-block" data-act="signOut">Verrouiller le site sur cet appareil</button>'
        : '<p class="note">Mode démo : tout reste sur cet appareil. Le guide explique comment relier le site à une base partagée.</p><button class="btn btn-ghost btn-block" data-act="resetDemo">Réinitialiser la démo</button>') +
      (L.notifBlock ? L.notifBlock() : '') +
      '<p class="small muted" style="text-align:center">Version du site : ' + L.VERSION + '</p>' +
      '<button class="btn btn-text btn-block" data-act="closeSheet">Fermer</button>');
  };
  A.setMe = (el) => { Store.setMe(el.dataset.name); closeSheet(); L.renderChrome(); redraw(); };
  A.signOut = async () => { closeSheet(); await Store.signOut(); showGate(); };
  A.resetDemo = () => { Store.resetDemo(); location.reload(); };

  /* ---------- Menus génériques ---------- */
  A.itemMenu = (el) => {
    const it = Store.get(el.dataset.id);
    if (!it) return;
    const items = [];
    if (['idea', 'comment', 'question'].indexOf(it.kind) >= 0) items.push({ label: 'Modifier', act: 'editItem', attrs: 'data-id="' + it.id + '"' });
    items.push({ label: 'Supprimer', act: 'delItem', attrs: 'data-id="' + it.id + '"', danger: true });
    L.menu('', items);
  };
  A.editItem = (el) => {
    const it = Store.get(el.dataset.id);
    if (!it) return;
    openSheet('<h3 class="h3">Modifier</h3><form class="stack-sm" data-form="saveText" data-id="' + it.id + '"><textarea class="input" name="t" rows="5" required>' + esc(it.data.text) + '</textarea><button class="btn btn-primary btn-block" type="submit">Enregistrer</button></form>');
  };
  F.saveText = async (form, d) => { await Store.patch(form.dataset.id, { text: d.t }); closeSheet(); redraw(); };
  A.delItem = (el) => {
    const id = el.dataset.id;
    L.confirm('Supprimer définitivement ? Cette action ne peut pas être annulée.', 'Supprimer', async () => { await Store.del(id); redraw(); toast('Supprimé.'); });
  };

  /* ---------- Moments ensemble ---------- */
  C.placeSel = (sel) => { const w = $('#customPlace'); if (w) w.hidden = sel.value !== '__custom'; };
  function momentSheet(m) {
    const d = m ? m.data : {};
    const presets = CFG.PLACE_PRESETS;
    const isCustom = !!d.place && presets.indexOf(d.place) < 0;
    const now = new Date();
    const defStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 18, 0);
    const defEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10, 14, 0);
    openSheet('<h3 class="h3">' + (m ? 'Modifier le moment' : 'Nouveau moment ensemble') + '</h3><form class="stack-sm" data-form="saveMoment" data-id="' + (m ? m.id : '') + '">' +
      field('Lieu', '<select class="input" name="place" data-onchange="placeSel">' + presets.map((p) => '<option value="' + esc(p) + '"' + (d.place === p ? ' selected' : '') + '>' + esc(p) + '</option>').join('') + '<option value="__custom"' + (isCustom ? ' selected' : '') + '>Une adresse…</option></select>') +
      '<label class="field" id="customPlace"' + (isCustom ? '' : ' hidden') + '><span>Adresse</span><input class="input" name="custom" value="' + (isCustom ? esc(d.place) : '') + '" placeholder="12 rue des Lilas, Rennes"></label>' +
      field('Début', '<input class="input" type="datetime-local" name="start" required value="' + (d.start || Store.util.localInput(defStart)) + '">') +
      field('Fin', '<input class="input" type="datetime-local" name="end" required value="' + (d.end || Store.util.localInput(defEnd)) + '">') +
      '<button class="btn btn-primary btn-block" type="submit">Enregistrer</button></form>');
  }
  A.addMoment = () => momentSheet(null);
  A.momentMenu = (el) => L.menu('', [{ label: 'Modifier', act: 'editMoment', attrs: 'data-id="' + el.dataset.id + '"' }, { label: 'Supprimer', act: 'delMoment', attrs: 'data-id="' + el.dataset.id + '"', danger: true }]);
  A.editMoment = (el) => momentSheet(Store.get(el.dataset.id));
  A.delMoment = (el) => {
    const id = el.dataset.id;
    L.confirm("Supprimer ce moment et ses idées d'activités ? Les photos associées resteront dans l'Album, rangées selon leur date.", 'Supprimer', async () => { await Store.del(id); redraw(); toast('Moment supprimé.'); });
  };
  F.saveMoment = async (form, d) => {
    const place = d.place === '__custom' ? d.custom : d.place;
    if (!place) return toast('Indique le lieu.');
    if (new Date(d.end) <= new Date(d.start)) return toast('La fin doit être après le début.');
    const data = { place, start: d.start, end: d.end };
    if (form.dataset.id) await Store.patch(form.dataset.id, data); else await Store.add('moment', data);
    closeSheet(); redraw();
  };

  function activitySheet(momentId, a) {
    const m = Store.get(momentId);
    if (!m) return;
    const mm = m.data;
    const places = CFG.PLACE_PRESETS.concat([mm.place]).filter((p, i, arr) => arr.indexOf(p) === i);
    const d = a ? a.data : {};
    openSheet('<h3 class="h3">' + (a ? "Modifier l'idée d'activité" : "Nouvelle idée d'activité") + '</h3><form class="stack-sm" data-form="saveActivity" data-id="' + (a ? a.id : '') + '" data-moment="' + momentId + '">' +
      field('Idée', '<input class="input" name="label" required value="' + esc(d.label || '') + '" placeholder="Marché de Noël, cuisiner ensemble…">') +
      '<p class="small muted">Laisse la date et le lieu vides pour une idée libre, à placer plus tard.</p>' +
      field('Date (facultatif)', '<input class="input" type="date" name="date" min="' + ymd(new Date(mm.start)) + '" max="' + ymd(new Date(mm.end)) + '" value="' + esc(d.date || '') + '">') +
      field('Lieu (facultatif)', '<input class="input" name="place" list="placeList" value="' + esc(d.place || '') + '" placeholder="En ville, chez…"><datalist id="placeList">' + places.map((p) => '<option value="' + esc(p) + '">').join('') + '</datalist>') +
      '<button class="btn btn-primary btn-block" type="submit">Enregistrer</button>' +
      (a ? '<button class="btn btn-danger btn-block" type="button" data-act="delActivity" data-id="' + a.id + '">Supprimer</button>' : '') + '</form>');
  }
  A.addActivity = (el) => activitySheet(el.dataset.moment, null);
  A.editActivity = (el) => { const a = Store.get(el.dataset.id); if (a) activitySheet(a.data.momentId, a); };
  A.delActivity = (el) => {
    const id = el.dataset.id;
    L.confirm("Supprimer cette idée d'activité ?", 'Supprimer', async () => { await Store.del(id); redraw(); });
  };
  F.saveActivity = async (form, d) => {
    const data = { momentId: form.dataset.moment, label: d.label, date: d.date || '', place: d.place || '' };
    if (form.dataset.id) await Store.patch(form.dataset.id, data); else await Store.add('activity', data);
    closeSheet(); redraw();
  };

  /* ---------- Idées, commentaires, réactions ---------- */
  F.postIdea = async (form, d) => { S.drafts.idea = ''; const p = Store.add('idea', { text: d.t }); redraw(); await p; };
  F.comment = async (form, d) => {
    const pid = form.dataset.parent;
    const parent = Store.get(pid);
    if (!parent) return;
    S.drafts['c' + pid] = '';
    const p = Store.add('comment', { parentId: pid, text: d.t });
    if (parent.kind === 'question' && me() === parent.data.to && parent.data.status !== 'answered') await Store.patch(pid, { status: 'answered' });
    delete S.answering[pid];
    redraw();
    await p;
  };
  A.togglePicker = (el) => { S.openPicker = S.openPicker === el.dataset.id ? null : el.dataset.id; redraw(); };
  A.react = async (el) => {
    const pid = el.dataset.id, type = el.dataset.type;
    const ex = Store.by('reaction').find((r) => r.data.parentId === pid && r.data.type === type && r.author === me());
    S.openPicker = null;
    const p = ex ? Store.del(ex.id) : Store.add('reaction', { parentId: pid, type });
    redraw();
    await p;
  };

  /* ---------- Questionnements ---------- */
  A.qClose = async (el) => { const p = Store.patch(el.dataset.id, { closed: true, closedBy: me() }); redraw(); toast('Questionnement clos. Tu peux le rouvrir à tout moment.'); await p; };
  A.qReopen = async (el) => { const p = Store.patch(el.dataset.id, { closed: false }); redraw(); await p; };
  F.postQuestion = async (form, d) => { S.drafts.question = ''; const p = Store.add('question', { text: d.t, to: other(me()), status: 'open' }); redraw(); await p; };
  const setQ = (id, status) => { delete S.answering[id]; const p = Store.patch(id, { status }); redraw(); return p; };
  A.qNow = (el) => { S.answering[el.dataset.id] = true; redraw(); };
  A.qCancel = (el) => { delete S.answering[el.dataset.id]; redraw(); };
  A.qThink = (el) => setQ(el.dataset.id, 'think');
  A.qDecline = (el) => setQ(el.dataset.id, 'decline');
  A.qPause = (el) => setQ(el.dataset.id, 'paused');
  A.qResume = (el) => setQ(el.dataset.id, 'answered');

  /* ---------- Voyages ---------- */
  function tripSheet(t) {
    const d = t ? t.data : {};
    openSheet('<h3 class="h3">' + (t ? 'Modifier le voyage' : 'Nouvelle idée de voyage') + '</h3><form class="stack-sm" data-form="saveTrip" data-id="' + (t ? t.id : '') + '">' +
      field('Nom', '<input class="input" name="name" required value="' + esc(d.name || '') + '" placeholder="Lisbonne, un chalet…">') +
      field('Du (facultatif)', '<input class="input" type="date" name="start" value="' + esc(d.start || '') + '">') +
      field('Au (facultatif)', '<input class="input" type="date" name="end" value="' + esc(d.end || '') + '">') +
      field('Notes (facultatif)', '<textarea class="input" name="notes" rows="3">' + esc(d.notes || '') + '</textarea>') +
      '<button class="btn btn-primary btn-block" type="submit">Enregistrer</button></form>');
  }
  A.addTrip = () => tripSheet(null);
  A.editTrip = (el) => tripSheet(Store.get(el.dataset.id));
  A.tripMenu = (el) => {
    const t = Store.get(el.dataset.id);
    const id = 'data-id="' + t.id + '"';
    const items = [{ label: 'Modifier', act: 'editTrip', attrs: id }];
    if (t.data.stage === 'planned') items.push({ label: 'Remettre en idée', act: 'unready', attrs: id });
    items.push({ label: 'Supprimer', act: 'delTrip', attrs: id, danger: true });
    L.menu('', items);
  };
  A.delTrip = (el) => {
    const id = el.dataset.id;
    L.confirm('Supprimer ce voyage et toutes ses dépenses ?', 'Supprimer', async () => { S.tripId = null; await Store.del(id); redraw(); toast('Voyage supprimé.'); });
  };
  A.openTrip = (el) => { S.tab = 'trips'; S.tripId = el.dataset.id; L.renderChrome(); redraw(); window.scrollTo(0, 0); };
  A.backTrips = () => { S.tripId = null; redraw(); window.scrollTo(0, 0); };
  A.ready = async (el) => { const p = Store.patch(el.dataset.id, { stage: 'planned' }); redraw(); toast("C'est planifié !"); await p; };
  A.unready = async (el) => { closeSheet(); const p = Store.patch(el.dataset.id, { stage: 'idea' }); redraw(); await p; };
  F.saveTrip = async (form, d) => {
    if (d.start && d.end && d.end < d.start) return toast('La fin doit être après le début.');
    const data = { name: d.name, start: d.start || '', end: d.end || '', notes: d.notes || '' };
    if (form.dataset.id) await Store.patch(form.dataset.id, data);
    else { const r = await Store.add('trip', Object.assign({ stage: 'idea', paid: [], payLink: null }, data)); S.tripId = r.id; }
    closeSheet(); redraw();
  };

  function detailFields(cat, det) {
    return L.cat(cat).fields.map((f) => {
      const v = det[f.k] || '';
      const input = f.opts
        ? '<select class="input" name="d_' + f.k + '"><option value="">-</option>' + f.opts.map((o) => '<option' + (v === o ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select>'
        : '<input class="input" type="' + (f.type || 'text') + '" name="d_' + f.k + '" value="' + esc(v) + '"' + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + (f.type === 'number' ? ' min="0" step="1" inputmode="numeric"' : '') + '>';
      return field(esc(f.l), input);
    }).join('');
  }
  C.expCat = (sel) => { const box = $('#expDetails'); if (box) box.innerHTML = detailFields(sel.value, {}); };
  function expenseSheet(tripId, e, cat) {
    const d = e ? e.data : { category: cat || 'transport', paidBy: me(), scope: 'both', details: {}, date: Store.util.ymd(new Date()), time: '' };
    openSheet('<h3 class="h3">' + (e ? 'Modifier la dépense' : 'Nouvelle dépense') + '</h3><form class="stack-sm" data-form="saveExpense" data-id="' + (e ? e.id : '') + '" data-trip="' + tripId + '">' +
      field('Catégorie', '<select class="input" name="category" data-onchange="expCat">' + L.CATS.map((c) => '<option value="' + c.k + '"' + (d.category === c.k ? ' selected' : '') + '>' + c.label + '</option>').join('') + '</select>') +
      field('Intitulé', '<input class="input" name="label" value="' + esc(d.label || '') + '" placeholder="Billets de train, courses du soir…">') +
      field('Montant (€)', '<input class="input" type="number" name="amount" min="0.01" step="0.01" inputmode="decimal" required value="' + (d.amount != null ? d.amount : '') + '">') +
      '<div class="grid2">' + field('Date de la dépense', '<input class="input" type="date" name="date" required value="' + esc(d.date || '') + '">') + field('Heure (facultatif)', '<input class="input" type="time" name="time" value="' + esc(d.time || '') + '">') + '</div>' +
      field('Payé par', '<select class="input" name="paidBy">' + NAMES.map((n) => '<option' + (d.paidBy === n ? ' selected' : '') + '>' + n + '</option>').join('') + '</select>') +
      field('Pour', '<select class="input" name="scope"><option value="both"' + (d.scope === 'both' ? ' selected' : '') + '>Nous deux (partagée)</option>' + NAMES.map((n) => '<option value="' + n + '"' + (d.scope === n ? ' selected' : '') + '>Rien que pour ' + n + '</option>').join('') + '</select>') +
      '<p class="small muted">« Rien que pour » compte dans le budget global, mais pas dans ce que l\'un demande à l\'autre.</p>' +
      '<div class="eyebrow">Détails</div><div class="stack-sm" id="expDetails">' + detailFields(d.category, d.details || {}) + '</div>' +
      '<button class="btn btn-primary btn-block" type="submit">Enregistrer</button>' +
      (e ? '<button class="btn btn-danger btn-block" type="button" data-act="delExpense" data-id="' + e.id + '">Supprimer</button>' : '') + '</form>');
  }
  A.addExpense = (el) => expenseSheet(el.dataset.trip, null, el.dataset.cat);
  A.editExpense = (el) => { const e = Store.get(el.dataset.id); if (e) expenseSheet(e.data.tripId, e); };
  A.delExpense = (el) => {
    const id = el.dataset.id;
    L.confirm('Supprimer cette dépense ?', 'Supprimer', async () => { await Store.del(id); redraw(); });
  };
  F.saveExpense = async (form, d) => {
    const amount = parseFloat(String(d.amount).replace(',', '.'));
    if (!(amount > 0)) return toast('Indique un montant.');
    const details = {};
    Object.keys(d).forEach((k) => { if (k.indexOf('d_') === 0 && d[k]) details[k.slice(2)] = d[k]; });
    const data = { tripId: form.dataset.trip, category: d.category, label: d.label || L.cat(d.category).label, amount: round2(amount), paidBy: d.paidBy, scope: d.scope, date: d.date || '', time: d.time || '', details };
    if (form.dataset.id) await Store.patch(form.dataset.id, data); else await Store.add('expense', data);
    closeSheet(); redraw();
  };
  F.payLink = async (form, d) => {
    const url = d.url || '';
    if (url && !/^https?:\/\//i.test(url)) return toast('Le lien doit commencer par https://');
    await Store.patch(form.dataset.id, { payLink: url ? { by: form.dataset.by, url } : null });
    toast(url ? 'Lien enregistré.' : 'Lien retiré.');
    redraw();
  };
  A.markPaid = async (el) => {
    const t = Store.get(el.dataset.id);
    const b = L.budget(t.id);
    const marks = (t.data.paid || []).filter((p) => p.by === b.debtor);
    const remaining = round2(b.due - marks.reduce((s, p) => s + p.amount, 0));
    if (remaining <= 0) return;
    const p = Store.patch(t.id, { paid: (t.data.paid || []).concat([{ by: me(), amount: remaining, at: new Date().toISOString() }]) });
    redraw();
    await p;
  };
  A.unmarkPaid = async (el) => {
    const t = Store.get(el.dataset.id);
    const paid = (t.data.paid || []).slice();
    for (let i = paid.length - 1; i >= 0; i--) { if (paid[i].by === me()) { paid.splice(i, 1); break; } }
    const p = Store.patch(t.id, { paid });
    redraw();
    await p;
  };

  /* Synthèse PDF : aperçu puis impression (« Enregistrer en PDF ») */
  A.synth = (el) => {
    const t = Store.get(el.dataset.id);
    if (!t) return;
    $('#synth-root').innerHTML = '<div class="synth"><div class="synth-bar"><button class="btn btn-ghost" data-act="closeSynth">Fermer</button><button class="btn btn-primary" data-act="printSynth">Enregistrer en PDF</button></div>' + L.synthHtml(t) + '<p class="synth-help">Dans la fenêtre qui s\'ouvre, choisis « Enregistrer au format PDF ». Sur iPhone : « Partager », puis « Enregistrer dans Fichiers ».</p></div>';
    document.body.classList.add('synth-open');
    const s = $('.synth');
    if (s) s.scrollTop = 0;
  };
  A.printSynth = () => window.print();
  A.closeSynth = () => { $('#synth-root').innerHTML = ''; document.body.classList.remove('synth-open'); };

  /* ---------- Bibliothèque musicale ---------- */
  /* Recherche : iTunes (gratuit, avec pochettes et lien Apple Music).
     Version Deezer : retrouvée via Odesli (song.link), sinon via la recherche Deezer. */
  async function getJson(url, ms) {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), ms || 9000);
    try {
      const r = await fetch(url, { signal: ctl.signal });
      if (!r.ok) throw new Error('http ' + r.status);
      return await r.json();
    } finally { clearTimeout(to); }
  }
  function jsonp(url, ms) {
    return new Promise((res, rej) => {
      const cb = 'dz' + Math.random().toString(36).slice(2);
      const s = document.createElement('script');
      let tm = null;
      const done = (fn, v) => { clearTimeout(tm); try { delete window[cb]; } catch (e) { window[cb] = undefined; } s.remove(); fn(v); };
      tm = setTimeout(() => done(rej, new Error('timeout')), ms || 7000);
      window[cb] = (d) => done(res, d);
      s.onerror = () => done(rej, new Error('jsonp'));
      s.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + cb;
      document.head.appendChild(s);
    });
  }
  async function resolveSong(url) {
    const j = await getJson('https://api.song.link/v1-alpha.1/links?userCountry=FR&url=' + encodeURIComponent(url), 9000);
    const e = (j.entitiesByUniqueId && j.entitiesByUniqueId[j.entityUniqueId]) || {};
    const lp = j.linksByPlatform || {};
    return { title: e.title, artist: e.artistName, cover: e.thumbnailUrl, deezer: lp.deezer && lp.deezer.url, apple: lp.appleMusic && lp.appleMusic.url };
  }
   async function searchItunes(q) {
    const j = await getJson('https://itunes.apple.com/search?media=music&entity=song&limit=12&country=FR&term=' + encodeURIComponent(q), 9000);
    return (j.results || []).filter((x) => x.trackName && x.trackViewUrl).map((x) => ({
      title: x.trackName, artist: x.artistName || '', album: x.collectionName || '',
      cover: (x.artworkUrl100 || '').replace('100x100bb', '600x600bb'), apple: x.trackViewUrl, deezer: ''
    }));
  }
  async function searchDeezer(q) {
    const j = await jsonp('https://api.deezer.com/search?limit=12&output=jsonp&q=' + encodeURIComponent(q), 8000);
    return ((j && j.data) || []).filter((x) => x.title && x.link).map((x) => ({
      title: x.title, artist: (x.artist && x.artist.name) || '', album: (x.album && x.album.title) || '',
      cover: (x.album && (x.album.cover_big || x.album.cover_medium)) || '', apple: '', deezer: x.link
    }));
  }
  /* Deux sources : si l'une est indisponible (réseau, navigateur), l'autre prend le relais */
  async function searchTracks(q) {
    let err = null;
    try { const r = await searchItunes(q); if (r.length) return r; } catch (e) { err = e; }
    try { const r = await searchDeezer(q); if (r.length || !err) return r; } catch (e) { err = err || e; }
    if (err) throw err;
    return [];
  }
  async function resolveDeezer(t) {
    if (t.apple) { try { const r = await resolveSong(t.apple); if (r.deezer) return r.deezer; } catch (e) { /* on essaie autrement */ } }
    try {
      const j = await jsonp('https://api.deezer.com/search?limit=1&output=jsonp&q=' + encodeURIComponent('artist:"' + t.artist + '" track:"' + t.title + '"'), 7000);
      const x = j && j.data && j.data[0];
      if (x && x.link) return x.link;
    } catch (e) { /* pas de version exacte trouvée */ }
    return '';
  }
  async function completeTrack(r) {
    let deezer = r.deezer || '';
    let apple = r.apple || '';
    if (!deezer) deezer = await resolveDeezer(r);
    if (!apple && deezer) { try { const x = await resolveSong(deezer); apple = x.apple || ''; } catch (e) { /* recherche Apple Music au clic */ } }
    return { title: r.title, artist: r.artist, cover: r.cover || '', apple, deezer: deezer || '' };
  }
  L.completeTrack = completeTrack;

  const resultHtml = (r, i) => '<button class="result" data-act="pickTrack" data-i="' + i + '"><span class="cover sm">' + L.trackCover(r) + '</span><span class="grow"><b>' + esc(r.title) + '</b><span class="sub block">' + esc(r.artist) + (r.album ? ' · ' + esc(r.album) : '') + '</span></span><span class="res-state">Ajouter</span></button>';
  let seq = 0;
  async function searchNow(q) {
    q = (q || '').trim();
    const box = $('#trackResults');
    if (!box) return;
    if (q.length < 2) { box.innerHTML = '<p class="sub">Tape au moins deux lettres.</p>'; return; }
    const my = ++seq;
    box.innerHTML = '<p class="sub">Recherche…</p>';
    let res = [];
    try {
      if (/^https?:\/\//i.test(q)) {
        const r = await resolveSong(q);
        if (r.title) res = [{ title: r.title, artist: r.artist || '', album: '', cover: r.cover || '', apple: r.apple || '', deezer: r.deezer || '' }];
      } else res = await searchTracks(q);
    } catch (e) {
            if (my === seq && $('#trackResults')) $('#trackResults').innerHTML = '<p class="error">La recherche est indisponible pour le moment (' + esc(e && e.name === 'AbortError' ? 'délai dépassé' : e && e.message ? e.message : 'erreur inconnue') + '). Vérifie ta connexion, ou ajoute le morceau à la main ci-dessous.</p>';
      return;
    }
    if (my !== seq || !$('#trackResults')) return;
    S.results = res;
    $('#trackResults').innerHTML = res.length ? res.map(resultHtml).join('') : '<p class="sub">Aucun résultat. Essaie avec le titre et l\'artiste, ou ajoute-le à la main.</p>';
  }
  L.inputs = L.inputs || {};
  L.inputs.trackQ = (el) => { clearTimeout(L._tq); L._tq = setTimeout(() => searchNow(el.value), 500); };

  /* cfg : { title, multi, onPick(track) } */
  L.trackPicker = (cfg) => {
    S.pickerCfg = cfg;
    S.results = [];
    openSheet('<h3 class="h3">' + esc(cfg.title || 'Ajouter un morceau') + '</h3>' +
      '<form class="stack-sm" data-form="trackSearch"><input class="input" type="search" name="q" placeholder="Titre, artiste, ou lien Deezer / Apple Music" aria-label="Chercher un morceau" autocomplete="off" enterkeyhint="search" data-oninput="trackQ"><button class="btn btn-primary btn-block" type="submit">Chercher</button></form>' +
      '<div id="trackResults" class="stack-sm" aria-live="polite"><p class="sub">Tape le titre et l\'artiste : la pochette et la bonne version s\'affichent.</p></div>' +
      '<details class="manual"><summary>Je ne le trouve pas</summary><form class="stack-sm" data-form="manualTrack">' + field('Titre', '<input class="input" name="title" required>') + field('Artiste', '<input class="input" name="artist">') + '<button class="btn btn-ghost btn-block" type="submit">Ajouter sans pochette</button></form></details>' +
      '<button class="btn btn-text btn-block" data-act="closeSheet">' + (cfg.multi ? 'Terminé' : 'Fermer') + '</button>');
  };
  F.trackSearch = async (form, d) => { await searchNow(d.q); };
  F.manualTrack = async (form, d) => {
    const cfg = S.pickerCfg;
    if (!cfg) return;
    await cfg.onPick({ title: d.title, artist: d.artist || '', cover: '', apple: '', deezer: '' });
    if (cfg.multi) { form.reset(); toast('Ajouté.'); } else closeSheet();
  };
  A.pickTrack = async (el) => {
    const cfg = S.pickerCfg;
    const r = (S.results || [])[+el.dataset.i];
    if (!cfg || !r) return;
    const st = el.querySelector('.res-state');
    el.disabled = true;
    if (st) st.textContent = 'Ajout…';
    try {
      const t = await completeTrack(r);
      await cfg.onPick(t);
      if (cfg.multi) { if (st) st.textContent = 'Ajouté'; } else closeSheet();
    } catch (e) {
      el.disabled = false;
      if (st) st.textContent = 'Ajouter';
      throw e;
    }
  };
  A.addSong = () => L.trackPicker({ title: 'Ajouter un morceau', multi: false, onPick: async (t) => { await Store.add('song', t); redraw(); toast('Morceau ajouté.'); } });

  /* ---------- Album ---------- */
  async function exifDate(file) {
    try {
      const buf = await file.slice(0, 131072).arrayBuffer();
      const v = new DataView(buf);
      if (v.getUint16(0) !== 0xffd8) return null;
      let off = 2;
      while (off < v.byteLength - 4) {
        const mk = v.getUint16(off), len = v.getUint16(off + 2);
        if (mk === 0xffe1 && v.getUint32(off + 4) === 0x45786966) {
          const t = off + 10;
          const le = v.getUint16(t) === 0x4949;
          const g16 = (o) => v.getUint16(t + o, le);
          const g32 = (o) => v.getUint32(t + o, le);
          const readIfd = (o, want) => { const n = g16(o); for (let i = 0; i < n; i++) { const e = o + 2 + i * 12; if (g16(e) === want) return { count: g32(e + 4), val: g32(e + 8) }; } return null; };
          const ex = readIfd(g32(4), 0x8769);
          if (!ex) return null;
          const dt = readIfd(ex.val, 0x9003) || readIfd(ex.val, 0x9004);
          if (!dt) return null;
          let s = '';
          for (let i = 0; i < dt.count - 1; i++) s += String.fromCharCode(v.getUint8(t + dt.val + i));
          const m = s.match(/^(\d{4}):(\d{2}):(\d{2})/);
          return m ? m[1] + '-' + m[2] + '-' + m[3] : null;
        }
        if ((mk & 0xff00) !== 0xff00) break;
        off += 2 + len;
      }
    } catch (e) { /* pas de date dans la photo */ }
    return null;
  }
  async function processImage(file, maxDim, q) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Image illisible')); i.src = url; });
      const sc = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * sc), h = Math.round(img.naturalHeight * sc);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      return await new Promise((res) => c.toBlob(res, 'image/jpeg', q));
    } finally { URL.revokeObjectURL(url); }
  }

  L.processImage = processImage;
  const momentOptions = (sel, withAuto) => (withAuto ? '<option value=""' + (sel === '' ? ' selected' : '') + '>Automatique, selon la date</option>' : '') +
    '<option value="none"' + (sel === 'none' ? ' selected' : '') + '>Aucun moment</option>' +
    L.momentsList().sort((a, b) => b.s - a.s).map((x) => '<option value="' + x.id + '"' + (sel === x.id ? ' selected' : '') + '>' + esc(x.m.data.place) + ' · ' + fShort(x.s) + '</option>').join('');
  const activityOptions = (momentId, sel) => '<option value="">Aucune activité</option>' + (momentId ? L.activitiesOf(momentId) : []).map((a) => {
    const at = L.assignText(a);
    return '<option value="' + a.id + '"' + (sel === a.id ? ' selected' : '') + '>' + esc(a.data.label) + (at ? ' · ' + esc(at) : '') + '</option>';
  }).join('');

  A.pickPhotos = (el) => { S.uploadMoment = el.dataset.moment || ''; const i = $('#photoInput'); i.value = ''; i.click(); };
  C.upMoment = (sel) => {
    const id = sel.value && sel.value !== 'none' ? sel.value : null;
    const a = $('#upAct');
    if (a) { a.innerHTML = activityOptions(id, ''); a.disabled = !id; }
  };
  function uploadSheet() {
    const pend = S.pending;
    const mid = S.uploadMoment || '';
    openSheet('<h3 class="h3">' + pend.length + ' ' + plural(pend.length, 'photo à ajouter', 'photos à ajouter') + '</h3><form class="stack-sm" data-form="savePhotos">' +
      field('Album', '<select class="input" name="moment" data-onchange="upMoment">' + momentOptions(mid, true) + '</select>') +
      field('Activité de ce moment (facultatif)', '<select class="input" name="activity" id="upAct"' + (mid && mid !== 'none' ? '' : ' disabled') + '>' + activityOptions(mid && mid !== 'none' ? mid : null, '') + '</select>') +
      '<p class="small muted">Choisis un moment précis pour pouvoir assigner une activité. Sinon, la photo rejoint le moment qui correspond à sa date.</p>' +
      pend.map((p, i) => '<div class="pend"><img src="' + p.url + '" alt=""><div class="stack-sm grow">' +
        '<input class="input" type="date" name="date_' + i + '" value="' + p.date + '" aria-label="Date de la photo ' + (i + 1) + '" required>' +
        '<input class="input" name="cap_' + i + '" placeholder="Légende (facultatif)" aria-label="Légende de la photo ' + (i + 1) + '"></div></div>').join('') +
      '<button class="btn btn-primary btn-block" type="submit">Ajouter ' + (pend.length > 1 ? 'les photos' : 'la photo') + '</button></form>');
  }
  F.savePhotos = async (form, d) => {
    const pend = S.pending || [];
    const momentId = d.moment || '';
    const activityId = momentId && momentId !== 'none' ? d.activity || '' : '';
    closeSheet();
    let ok = 0, failed = 0;
    for (let i = 0; i < pend.length; i++) {
      const p = pend[i];
      toast('Envoi de la photo ' + (i + 1) + ' sur ' + pend.length + '…', 0);
      try {
        const full = await processImage(p.file, 1600, 0.82);
        const thumb = await processImage(p.file, 420, 0.78);
        const base = 'photos/' + Store.util.uid();
        await Store.upload(base + '.jpg', full, 'image/jpeg');
        await Store.upload(base + '_t.jpg', thumb, 'image/jpeg');
        await Store.add('photo', { path: base + '.jpg', thumb: base + '_t.jpg', date: d['date_' + i] || p.date, caption: d['cap_' + i] || '', momentId, activityId });
        ok++;
        redraw();
      } catch (e) { console.error(e); failed++; }
    }
    pend.forEach((p) => URL.revokeObjectURL(p.url));
    S.pending = null;
    redraw();
    toast(ok + ' ' + plural(ok, 'photo ajoutée', 'photos ajoutées') + (failed ? ', ' + failed + " n'" + plural(failed, 'a', 'ont') + ' pas pu être envoyée' + (failed > 1 ? 's' : '') : '') + '.', 4500);
  };

  A.openPhoto = (el) => {
    const p = Store.get(el.dataset.id);
    if (!p) return;
    const m = L.effMoment(p);
    const act = p.data.activityId ? Store.get(p.data.activityId) : null;
    const mine = p.author === me();
    openSheet('<div class="lightbox"><img data-path="' + esc(p.data.path) + '" alt="' + esc(p.data.caption || 'Photo') + '"></div><div class="stack-sm"><div class="row between">' + L.who(p.author) + '<span class="muted small">' + fShort(parseDay(p.data.date)) + '</span></div>' +
      (p.data.caption ? '<p class="big">' + esc(p.data.caption) + '</p>' : '') +
      '<p class="sub">' + (m ? 'Album : ' + esc(m.m.data.place) + ' · ' + fShort(m.s) : 'Sans moment associé') + (act ? '<br>Activité : ' + esc(act.data.label) : '') + '</p>' +
      '<div class="row wrap">' + (mine ? '<button class="btn btn-ghost" data-act="editPhoto" data-id="' + p.id + '">Modifier</button><button class="btn btn-danger" data-act="delItem" data-id="' + p.id + '">Supprimer</button>' : '') + '<button class="btn btn-text" data-act="closeSheet">Fermer</button></div></div>');
  };
  C.phMoment = () => {
    const sel = $('#phMoment').value;
    let id = sel;
    if (sel === 'none') id = null;
    else if (sel === '') { const a = L.autoMoment($('#phDate').value); id = a ? a.id : null; }
    const a = $('#phAct');
    if (a) { a.innerHTML = activityOptions(id, ''); a.disabled = !id; }
  };
  A.editPhoto = (el) => {
    const p = Store.get(el.dataset.id);
    if (!p) return;
    const sel = p.data.momentId || '';
    const eff = L.effMoment(p);
    openSheet('<h3 class="h3">Modifier la photo</h3><form class="stack-sm" data-form="savePhoto" data-id="' + p.id + '">' +
      field('Date', '<input class="input" type="date" name="date" id="phDate" data-onchange="phMoment" required value="' + esc(p.data.date) + '">') +
      field('Légende (facultatif)', '<input class="input" name="caption" value="' + esc(p.data.caption || '') + '">') +
      field('Album', '<select class="input" name="moment" id="phMoment" data-onchange="phMoment">' + momentOptions(sel, true) + '</select>') +
      field('Activité de ce moment', '<select class="input" name="activity" id="phAct"' + (eff ? '' : ' disabled') + '>' + activityOptions(eff ? eff.id : null, p.data.activityId || '') + '</select>') +
      '<button class="btn btn-primary btn-block" type="submit">Enregistrer</button></form>');
  };
  F.savePhoto = async (form, d) => {
    const p = Store.get(form.dataset.id);
    const momentId = d.moment || '';
    const probe = { data: { momentId, date: d.date } };
    const eff = L.effMoment(probe);
    const activityId = eff ? d.activity || '' : '';
    await Store.patch(p.id, { date: d.date, caption: d.caption || '', momentId, activityId });
    closeSheet(); redraw();
  };

  /* ---------- Fichiers ---------- */
  A.pickFiles = () => { const i = $('#fileInput'); i.value = ''; i.click(); };
  const safeName = (n) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_');
  async function uploadFiles(files) {
    let ok = 0, failed = 0;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const isAudio = (f.type || '').indexOf('audio/') === 0 || /\.(mp3|m4a|wav|aac|ogg|flac)$/i.test(f.name);
      const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
      const limit = isAudio ? 40 * 1048576 : 20 * 1048576;
      if (f.size > limit) { failed++; toast('« ' + f.name + ' » est trop lourd (max ' + (isAudio ? '40' : '20') + ' Mo).', 4500); await new Promise((r) => setTimeout(r, 1600)); continue; }
      toast('Envoi de ' + f.name + ' (' + (i + 1) + '/' + files.length + ')…', 0);
      try {
        const path = 'files/' + Store.util.uid() + '-' + safeName(f.name);
        await Store.upload(path, f, f.type || 'application/octet-stream');
        await Store.add('file', { name: f.name, path, size: f.size, mime: f.type, type: isAudio ? 'audio' : isPdf ? 'pdf' : 'other', folderId: S.folderId || '' });
        ok++;
        redraw();
      } catch (e) { console.error(e); failed++; }
    }
    redraw();
    toast(ok + ' ' + plural(ok, 'fichier ajouté', 'fichiers ajoutés') + (failed ? ' (' + failed + ' en échec)' : '') + '.', 4000);
  }

  /* ---------- Connexion et démarrage ---------- */
  function gateShow(html) {
    $('#gate').innerHTML = '<div class="gate-card">' + html + '</div>';
    $('#gate').hidden = false;
    $('#app').hidden = true;
  }
  const gateBrand = '<h1 class="brand"><span class="l">Leeamm</span> <span class="x">X</span> <span class="a">Ange</span></h1>';
  function showGate(msg) {
    gateShow(gateBrand + '<p class="sub">Un petit coin rien qu\'à nous deux.</p><form class="stack-sm" data-form="login"><label class="field"><span>Mot de passe</span><input class="input" type="password" name="pw" autocomplete="current-password" required></label>' + (msg ? '<p class="error">' + esc(msg) + '</p>' : '') + '<button class="btn btn-primary btn-block" type="submit">Entrer</button></form>');
  }
  function showWho() {
    gateShow(gateBrand + '<p class="sub">Qui es-tu ?</p><div class="stack-sm">' + NAMES.map((n) => '<button class="btn btn-ghost btn-block who-btn" data-act="pickMe" data-name="' + n + '">Je suis ' + '<b style="color:' + L.col(n) + '">' + n + '</b></button>').join('') + '</div><p class="note">Tu pourras changer plus tard dans les réglages.</p>');
  }
  A.pickMe = (el) => { Store.setMe(el.dataset.name); start(); };
  F.login = async (form, d) => {
    try { await Store.signIn(d.pw); } catch (e) { showGate('Mot de passe incorrect.'); return; }
    await enter();
  };
  let started = false;
  function start() {
    $('#gate').hidden = true;
    $('#app').hidden = false;
    L.renderChrome();
    redraw();
    if (!started) {
      started = true;
      Store.startPolling(() => L.softRender());
      setInterval(() => { if (S.tab === 'home') L.softRender(); }, 30000);
      if (L.afterStart) L.afterStart();
    }
  }
  async function enter() {
    try { await Store.load(); } catch (e) {
      gateShow(gateBrand + '<p class="error">Impossible de charger les données : ' + esc(errMsg(e)) + '</p><button class="btn btn-primary btn-block" data-act="retry">Réessayer</button>');
      return;
    }
    if (!Store.me) return showWho();
    start();
  }
  A.retry = () => enter();

  async function boot() {
    try { await Store.boot(); } catch (e) {
      gateShow(gateBrand + '<p class="error">Impossible de joindre le serveur : ' + esc(errMsg(e)) + '</p><button class="btn btn-primary btn-block" onclick="location.reload()">Réessayer</button>');
      return;
    }
    if (!(await Store.hasSession())) return showGate();
    await enter();
  }

  /* ---------- Branchements ---------- */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const f = A[el.dataset.act];
    if (!f) return;
    if (el.tagName !== 'A') e.preventDefault();
    Promise.resolve()
      .then(() => f(el, e))
      .catch((err) => { console.error(err); toast(errMsg(err)); Store.sig = '!'; Store.load().then(() => redraw()).catch(() => {}); });
  });
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    const f = F[form.dataset.form];
    if (!f) return;
    const btn = form.querySelector('[type=submit]');
    if (btn) btn.disabled = true;
    try { await f(form, fd(form)); } catch (err) { console.error(err); toast(errMsg(err)); Store.sig = '!'; Store.load().then(() => redraw()).catch(() => {}); } finally { if (btn) btn.disabled = false; }
  });
  L.inputs = L.inputs || {};
  document.addEventListener('input', (e) => {
    const k = e.target.dataset && e.target.dataset.draft; if (k) S.drafts[k] = e.target.value;
    const n = e.target.dataset && e.target.dataset.oninput; if (n && L.inputs[n]) L.inputs[n](e.target);
  });
  document.addEventListener('change', (e) => { const n = e.target.dataset && e.target.dataset.onchange; if (n && C[n]) C[n](e.target); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && L.sheetOpen()) closeSheet(); });

  $('#photoInput').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []).filter((f) => (f.type || '').indexOf('image/') === 0);
    if (!files.length) return toast('Choisis des images.');
    const pend = [];
    for (const f of files) {
      const ex = await exifDate(f);
      pend.push({ file: f, date: ex || ymd(new Date(f.lastModified || Date.now())), url: URL.createObjectURL(f) });
    }
    S.pending = pend;
    uploadSheet();
  });
  $('#fileInput').addEventListener('change', (e) => { const files = Array.from(e.target.files || []); if (files.length) uploadFiles(files); });

  /* On démarre une fois tous les scripts chargés (extras.js compris) */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
