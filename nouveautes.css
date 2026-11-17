/* nouveautes.js : onglets Dépenses et Activités, adresses Google Maps, couleurs de dossiers,
   dates facultatives, tarif des places de concert / ciné. À charger APRÈS extras.js. */
(function () {
  'use strict';
  const { S, $, esc, ic, toast, openSheet, closeSheet, field, NAMES, euro, round2, plural } = L;
  const A = L.actions, F = L.forms, C = L.changes;
  const CFG = window.APP_CONFIG || {};
  const KEY = CFG.GOOGLE_MAPS_API_KEY || '';
  const me = () => Store.me;
  const redraw = () => L.renderMain();
  const uid = () => Store.util.uid();
  const pad = (n) => String(n).padStart(2, '0');
  const num = (v) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return n > 0 ? round2(n) : 0; };
  const presets = () => CFG.PLACE_PRESETS || [];
  L.VERSION = '17 nov. 2026 · 4';
  L.inputs = L.inputs || {};

  /* ================= Adresses reliées à Google Maps ================= */
  L.mapUrl = (label, id) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(label) + (id ? '&query_place_id=' + encodeURIComponent(id) : '');
  const isPreset = (label, id) => !id && presets().indexOf(label) >= 0;
  L.placeLink = (label, id) => {
    if (!label) return '';
    if (isPreset(label, id)) return '<span class="place-t">' + ic.pin + esc(label) + '</span>';
    return '<a class="maplink" href="' + esc(L.mapUrl(label, id)) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(label) + ' : ouvrir dans Google Maps">' + ic.pin + esc(label) + '</a>';
  };
  const stateText = (v, id) => (id ? '✓ Adresse reliée à Google Maps' : '');
  L.placeField = (o) => {
    const chips = o.presets ? presets().map((p) => '<button type="button" class="chip" data-act="pickPlace" data-label="' + esc(p) + '" data-pid="">' + esc(p) + '</button>').join('') : '';
    return '<div class="field placefield"><span>' + o.label + '</span>' +
      '<input class="input" name="' + o.name + '" value="' + esc(o.value || '') + '" placeholder="' + esc(o.ph || 'Nom du lieu ou adresse…') + '" autocomplete="off" data-oninput="placeAc">' +
      '<input type="hidden" name="' + o.name + 'Id" value="' + esc(o.id || '') + '" data-pid>' +
      '<div class="pf-res"></div>' + (chips ? '<div class="row wrap">' + chips + '</div>' : '') +
      '<p class="small muted pf-state">' + stateText(o.value, o.id) + '</p></div>';
  };
  async function suggest(q, tok) {
    const r = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text' },
      body: JSON.stringify({ input: q, languageCode: 'fr', sessionToken: tok })
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    return (j.suggestions || []).filter((s) => s.placePrediction).map((s) => ({ label: s.placePrediction.text.text, id: s.placePrediction.placeId }));
  }
  L.inputs.placeAc = (el) => {
    const w = el.closest('.field');
    if (!w) return;
    const hid = w.querySelector('[data-pid]');
    if (hid) hid.value = '';
    const res = w.querySelector('.pf-res'), st = w.querySelector('.pf-state');
    const q = el.value.trim();
    if (!KEY) { if (st) st.textContent = q ? 'Cliquable vers Google Maps.' : ''; return; }
    clearTimeout(w._t);
    if (q.length < 3) { if (res) res.innerHTML = ''; if (st) st.textContent = ''; return; }
    const seq = (w._seq = (w._seq || 0) + 1);
    w._tok = w._tok || uid();
    w._t = setTimeout(async () => {
      let items;
      try { items = await suggest(q, w._tok); } catch (e) {
        console.warn('Google Places', e);
        if (seq === w._seq && st) { st.textContent = 'Suggestions indisponibles (' + (e && e.message ? e.message : 'erreur') + ') : ce texte restera cliquable vers Google Maps.'; if (res) res.innerHTML = ''; }
        return;
      }
      if (seq !== w._seq || !document.body.contains(w)) return;
      if (res) res.innerHTML = items.slice(0, 5).map((it) => '<button type="button" class="pf-opt" data-act="pickPlace" data-label="' + esc(it.label) + '" data-pid="' + esc(it.id) + '">' + ic.pin + '<span>' + esc(it.label) + '</span></button>').join('');
      if (st) st.textContent = items.length ? 'Choisis une suggestion pour relier à Google Maps :' : 'Aucune suggestion : ce texte restera cliquable vers Google Maps.';
    }, 350);
  };
  A.pickPlace = (el) => {
    const w = el.closest('.field');
    if (!w) return;
    const inp = w.querySelector('[data-oninput="placeAc"]');
    if (inp) inp.value = el.dataset.label;
    const hid = w.querySelector('[data-pid]');
    if (hid) hid.value = el.dataset.pid || '';
    w._seq = (w._seq || 0) + 1; w._tok = null;
    const res = w.querySelector('.pf-res'), st = w.querySelector('.pf-state');
    if (res) res.innerHTML = '';
    if (st) st.textContent = stateText(el.dataset.label, el.dataset.pid);
  };

  /* Les champs « lieu » des anciens formulaires (moment, dépense, ancienne activité) reçoivent aussi la recherche */
  const OLD = 'input[name="custom"],input[name="d_address"],input[name="d_place"],input[name="place"][list]';
  function upgradeSheet() {
    const root = $('#sheet-root');
    if (!root) return;
    root.querySelectorAll(OLD).forEach((inp) => {
      if (inp.dataset.pfx) return;
      inp.dataset.pfx = '1';
      inp.setAttribute('data-oninput', 'placeAc');
      inp.setAttribute('autocomplete', 'off');
      inp.removeAttribute('list');
      const w = inp.closest('.field');
      if (!w) return;
      const r = document.createElement('div'); r.className = 'pf-res';
      const p = document.createElement('p'); p.className = 'small muted pf-state';
      inp.after(r, p);
    });
    // dates facultatives : la dépense n'oblige plus à indiquer une date
    root.querySelectorAll('form[data-form="saveExpense"] input[type="date"][required]').forEach((i) => i.removeAttribute('required'));
  }
  new MutationObserver(upgradeSheet).observe($('#sheet-root'), { childList: true, subtree: true });

  // Lieux cliquables dans les pages existantes (moments, concerts)
  function linkPlaces(html) {
    const ids = {};
    Store.by('moment').forEach((m) => { if (m.data.place) ids[m.data.place] = ''; });
    Store.by('show').forEach((s) => { if (s.data.venue) ids[s.data.venue] = s.data.venueId || ''; });
    Object.keys(ids).forEach((p) => {
      if (isPreset(p, ids[p])) return;
      const from = '<div class="place">' + ic.pin + esc(p) + '</div>';
      if (html.indexOf(from) >= 0) html = html.split(from).join('<div class="place">' + L.placeLink(p, ids[p]) + '</div>');
    });
    return html;
  }
  ['home', 'moments'].forEach((k) => { const o = L.views[k]; L.views[k] = () => linkPlaces(o()); });
  { const o = L.views.home; L.views.home = () => o().split('data-tab="moments"').join('data-tab="activities"'); }

  // Lieux d'un voyage (hébergement, activités, concerts liés) en bas de sa page
  { const o = L.views.trips;
    L.views.trips = () => {
      let h = o();
      const t = S.tripId && Store.get(S.tripId);
      if (!t) return h;
      const rows = [];
      Store.by('expense').filter((e) => e.data.tripId === t.id).forEach((e) => {
        const det = e.data.details || {};
        const p = det.address || det.place;
        if (p) rows.push('<div class="place-row">' + L.placeLink(p, '') + '<span class="small muted">' + esc(e.data.label) + '</span></div>');
      });
      Store.by('show').filter((s) => s.data.tripId === t.id && s.data.venue).forEach((s) => rows.push('<div class="place-row">' + L.placeLink(s.data.venue, s.data.venueId) + '<span class="small muted">' + esc(s.data.title) + '</span></div>'));
      if (!rows.length) return h;
      const i = h.lastIndexOf('</div>');
      return h.slice(0, i) + '<section class="card stack-sm"><div class="eyebrow">Lieux du voyage</div>' + rows.join('') + '</section>' + h.slice(i);
    };
  }

  /* ================= Concerts et ciné : tarif, lieu, dates facultatives ================= */
  function showSheet(s) {
    const d = s ? s.data : { type: 'concert' };
    const trips = Store.by('trip').slice().sort((a, b) => a.data.name.localeCompare(b.data.name, 'fr'));
    openSheet('<h3 class="h3">' + (s ? 'Modifier la fiche' : 'Nouveau concert ou ciné') + '</h3><form class="stack-sm" data-form="saveShow" data-id="' + (s ? s.id : '') + '">' +
      field('Type', '<select class="input" name="type"><option value="concert"' + (d.type !== 'cine' ? ' selected' : '') + '>Concert</option><option value="cine"' + (d.type === 'cine' ? ' selected' : '') + '>Ciné</option></select>') +
      field('Titre', '<input class="input" name="title" required value="' + esc(d.title || '') + '" placeholder="Artiste, film…">') +
      L.placeField({ label: 'Lieu (facultatif)', name: 'venue', value: d.venue, id: d.venueId, ph: 'Salle, cinéma, adresse…' }) +
      '<div class="eyebrow">Ouverture des billets (facultatif)</div><div class="grid2">' + field('Date', '<input class="input" type="date" name="ticketsOpen" value="' + esc(d.ticketsOpen || '') + '">') + field('Heure', '<input class="input" type="time" name="ticketsOpenTime" value="' + esc(d.ticketsOpenTime || '') + '">') + '</div>' +
      '<div class="eyebrow">Représentation (facultatif)</div><div class="grid2">' + field('Date', '<input class="input" type="date" name="date" value="' + esc(d.date || '') + '">') + field('Heure', '<input class="input" type="time" name="time" value="' + esc(d.time || '') + '">') + '</div>' +
      field('Durée en minutes (facultatif)', '<input class="input" type="number" name="duration" min="0" step="5" inputmode="numeric" value="' + (d.duration || '') + '" placeholder="120">') +
      '<div class="eyebrow">Tarif (facultatif)</div><div class="grid2">' + field("Prix d'une place (€)", '<input class="input" name="price" inputmode="decimal" value="' + (d.price || '') + '" placeholder="35">') + field('Nombre de places', '<input class="input" type="number" name="qty" min="1" max="20" step="1" inputmode="numeric" value="' + (d.qty || 2) + '">') + '</div>' +
      '<div class="grid2">' + field('Payé par', '<select class="input" name="paidBy">' + NAMES.map((n) => '<option' + ((d.paidBy || me()) === n ? ' selected' : '') + '>' + n + '</option>').join('') + '</select>') +
      field('Pour', '<select class="input" name="priceScope"><option value="both"' + (!d.priceScope || d.priceScope === 'both' ? ' selected' : '') + '>Nous deux</option>' + NAMES.map((n) => '<option value="' + n + '"' + (d.priceScope === n ? ' selected' : '') + '>Rien que ' + n + '</option>').join('') + '</select>') + '</div>' +
      field('Relier à un voyage (facultatif)', '<select class="input" name="tripId"><option value="">Aucun voyage</option>' + trips.map((t) => '<option value="' + t.id + '"' + (d.tripId === t.id ? ' selected' : '') + '>' + esc(t.data.name) + (t.data.stage === 'planned' ? '' : ' (idée)') + '</option>').join('') + '</select>') +
      '<p class="small muted">Si un tarif est indiqué et le voyage relié, le prix est compté dans le budget de ce voyage.</p>' +
      field('Notes (facultatif)', '<textarea class="input" name="notes" rows="3">' + esc(d.notes || '') + '</textarea>') +
      '<button class="btn btn-primary btn-block" type="submit">Enregistrer</button></form>');
  }
  C.showType = () => {};
  A.addShow = () => showSheet(null);
  A.editShow = (el) => showSheet(Store.get(el.dataset.id));
  F.saveShow = async (form, d) => {
    const old = form.dataset.id ? Store.get(form.dataset.id) : null;
    const data = Object.assign({ setlist: [], outfits: [] }, old ? old.data : {}, {
      type: d.type === 'cine' ? 'cine' : 'concert', title: d.title, venue: d.venue || '', venueId: d.venue ? d.venueId || '' : '',
      ticketsOpen: d.ticketsOpen || '', ticketsOpenTime: d.ticketsOpen ? d.ticketsOpenTime || '' : '',
      date: d.date || '', time: d.date ? d.time || '' : '', duration: d.duration ? Math.max(0, parseInt(d.duration, 10) || 0) : 0,
      price: num(d.price), qty: Math.max(1, Math.min(20, parseInt(d.qty, 10) || 1)), paidBy: d.paidBy || me(), priceScope: d.priceScope || 'both',
      notes: d.notes || '', tripId: d.tripId || ''
    });
    if (old) await Store.patch(old.id, data);
    else { const r = await Store.add('show', data); S.showId = r.id; }
    closeSheet(); redraw();
  };
  function priceCard(s) {
    const d = s.data;
    const qty = Math.max(1, parseInt(d.qty, 10) || 1);
    const trip = d.tripId ? Store.get(d.tripId) : null;
    const has = +d.price > 0;
    return '<section class="card stack-sm"><div class="eyebrow">Tarif</div>' + (has
      ? '<p class="h3">' + euro(d.price) + (qty > 1 ? ' × ' + qty + ' = ' + euro(round2(d.price * qty)) : '') + '</p><p class="sub">Payé par ' + esc(d.paidBy || '-') + ' · ' + (d.priceScope && d.priceScope !== 'both' ? 'Rien que pour ' + esc(d.priceScope) : 'Nous deux') + '</p>'
      : '<p class="sub">Tarif non renseigné. Modifie la fiche pour l\'ajouter.</p>') +
      (trip ? '<p class="sub2">' + (has ? 'Compté dans le budget de ' : 'Voyage lié : ') + '« ' + esc(trip.data.name) + ' ».</p>' : has ? '<p class="small muted">Relie la fiche à un voyage pour compter ce prix dans son budget.</p>' : '') + '</section>';
  }
  { const o = L.views.shows;
    L.views.shows = () => {
      let h = o();
      const s = S.showId && Store.get(S.showId);
      if (s) h = h.replace('</section>', '</section>' + priceCard(s));
      return linkPlaces(h);
    };
  }
  // Les places comptent dans le budget du voyage relié
  L.showExpenses = (tripId) => Store.by('show').filter((s) => s.data.tripId === tripId && +s.data.price > 0).map((s) => {
    const d = s.data;
    const qty = Math.max(1, parseInt(d.qty, 10) || 1);
    return { id: 'show-' + s.id, kind: 'expense', author: s.author, created_at: s.created_at,
      data: { tripId, category: 'activities', label: (d.type === 'cine' ? 'Ciné : ' : 'Concert : ') + d.title + (qty > 1 ? ' (' + qty + ' places)' : ''), amount: round2(d.price * qty), paidBy: d.paidBy || s.author || NAMES[0], scope: d.priceScope || 'both', date: d.date || '', time: d.time || '', details: {} } };
  });
  const sumAmt = (a) => a.reduce((s, e) => s + (+e.data.amount || 0), 0);
  L.budget = (tripId) => {
    const ex = Store.by('expense').filter((e) => e.data.tripId === tripId).concat(L.showExpenses(tripId));
    const sh = ex.filter((e) => e.data.scope === 'both');
    const total = round2(sumAmt(ex)), shared = round2(sumAmt(sh)), half = round2(shared / 2);
    const adv = { Ange: round2(sumAmt(sh.filter((e) => e.data.paidBy === 'Ange'))), Leeamm: round2(sumAmt(sh.filter((e) => e.data.paidBy === 'Leeamm'))) };
    const solo = { Ange: round2(sumAmt(ex.filter((e) => e.data.scope === 'Ange'))), Leeamm: round2(sumAmt(ex.filter((e) => e.data.scope === 'Leeamm'))) };
    const net = round2(adv.Ange - half);
    let creditor = null, debtor = null, due = 0;
    if (Math.abs(net) >= 0.01) { if (net > 0) { creditor = 'Ange'; debtor = 'Leeamm'; } else { creditor = 'Leeamm'; debtor = 'Ange'; } due = round2(Math.abs(net)); }
    const per = { Ange: round2(half + solo.Ange), Leeamm: round2(half + solo.Leeamm) };
    return { ex, total, shared, half, adv, solo, creditor, debtor, due, per };
  };
  { const base = A.editExpense;
    A.editExpense = (el) => {
      if (String(el.dataset.id).indexOf('show-') === 0) return A.openShow({ dataset: { id: el.dataset.id.slice(5) } });
      return base(el);
    };
  }

  /* ================= Couleurs des dossiers de fichiers ================= */
  const COLORS = [['#E8935A', 'Orange'], ['#E8A0B4', 'Rose'], ['#8FC28A', 'Vert'], ['#C2566B', 'Bordeaux'], ['#E0B05A', 'Doré'], ['#7FA8D6', 'Bleu'], ['#B496D9', 'Violet'], ['#B8B0A8', 'Gris']];
  const swatches = (cur) => '<fieldset class="field swatch-set"><span>Couleur</span><div class="swatches">' + COLORS.map((c, i) =>
    '<label class="swatch"><input type="radio" name="color" value="' + c[0] + '"' + ((cur ? cur === c[0] : i === 0) ? ' checked' : '') + ' aria-label="' + c[1] + '"><span style="background:' + c[0] + '"></span></label>').join('') + '</div></fieldset>';
  A.addFolder = () => openSheet('<h3 class="h3">Nouveau dossier</h3><form class="stack-sm" data-form="saveFolder" data-id="">' + field('Nom du dossier', '<input class="input" name="name" required maxlength="60" placeholder="Enregistrements, voyage à Lisbonne…">') + swatches('') + '<button class="btn btn-primary btn-block" type="submit">Créer</button></form>');
  A.renameFolder = (el) => {
    const f = Store.get(el.dataset.id);
    if (f) openSheet('<h3 class="h3">Modifier le dossier</h3><form class="stack-sm" data-form="saveFolder" data-id="' + f.id + '">' + field('Nom du dossier', '<input class="input" name="name" required maxlength="60" value="' + esc(f.data.name) + '">') + swatches(f.data.color || '') + '<button class="btn btn-primary btn-block" type="submit">Enregistrer</button></form>');
  };
  F.saveFolder = async (form, d) => {
    const color = /^#[0-9A-Fa-f]{6}$/.test(d.color || '') ? d.color : '';
    if (form.dataset.id) await Store.patch(form.dataset.id, { name: d.name, color });
    else await Store.add('folder', { name: d.name, color, parentId: S.folderId || '' });
    closeSheet(); redraw();
  };
  A.folderMenu = (el) => L.menu('', [{ label: 'Renommer / changer la couleur', act: 'renameFolder', attrs: 'data-id="' + el.dataset.id + '"' }, { label: 'Supprimer', act: 'delFolder', attrs: 'data-id="' + el.dataset.id + '"', danger: true }]);
  { const o = L.views.files;
    L.views.files = () => {
      let h = o();
      Store.by('folder').forEach((f) => {
        if (!f.data.color) return;
        h = h.split('class="folder grow" data-act="openFolder" data-id="' + f.id + '"').join('class="folder grow" data-act="openFolder" data-id="' + f.id + '" style="--fc:' + f.data.color + '"');
      });
      return h;
    };
  }

  /* ================= Dépenses et Activités ================= */
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const mLabel = (ym) => { const p = ym.split('-'); return MONTHS[+p[1] - 1] + ' ' + p[0]; };
  const TY = {
    spend: { title: 'Dépenses', sub: "Ce qu'on a envie d'acheter, à court, moyen ou long terme.", add: 'Ajouter un achat', one: 'Nouvel achat', edit: "Modifier l'achat", done: 'Acheté', undo: 'Remettre à acheter', todo: 'À acheter', gone: 'Déjà acheté', plural: ['article', 'articles'], delMsg: 'Supprimer cet achat ?' },
    act: { title: 'Activités', sub: "Ce qu'on a envie de faire, avec ou sans date.", add: 'Ajouter une activité', one: 'Nouvelle activité', edit: "Modifier l'activité", done: 'Fait', undo: 'Remettre à faire', todo: 'À faire', gone: 'Déjà fait', plural: ['activité', 'activités'], delMsg: 'Supprimer cette activité ?' }
  };
  S.pl = S.pl || { spend: { v: 'month', f: '', w: '' }, act: { v: 'month', f: '', w: '' } };
  const items = (t) => Store.by('wish').filter((w) => w.data.t === t);
  const folders = (t) => Store.by('wishfolder').filter((f) => f.data.t === t).slice().sort((a, b) => a.data.name.localeCompare(b.data.name, 'fr'));
  const sortWhen = (a, b) => ((a.data.date || a.data.month || '') + (a.data.time || '') + a.data.name).localeCompare((b.data.date || b.data.month || '') + (b.data.time || '') + b.data.name, 'fr');
  const whoTag = (w) => (w === 'both' ? '<span class="tag">Nous deux</span>' : w ? '<span class="tag" style="color:' + L.col(w) + '">' + esc(w) + '</span>' : '');

  function card(w, t) {
    const d = w.data, f = d.folderId ? Store.get(d.folderId) : null;
    const when = d.date ? L.fDateTime(d.date, d.time) : d.month ? mLabel(d.month) : '';
    const photo = d.photo && d.photo.thumb ? '<img class="wish-img" data-path="' + esc(d.photo.thumb) + '" alt="" loading="lazy">' : '';
    const meta = [whoTag(d.who), when ? '<span class="tag">' + esc(when) + '</span>' : '', f ? '<span class="tag fold" style="--fc:' + esc(f.data.color || '#B8B0A8') + '"><i></i>' + esc(f.data.name) + '</span>' : ''].filter(Boolean).join('');
    const acts = (d.link ? '<a class="btn btn-ghost btn-sm" href="' + esc(d.link) + '" target="_blank" rel="noopener noreferrer">Voir le lien</a>' : '') +
      (d.done ? '<button class="btn btn-text btn-sm" data-act="plUndo" data-id="' + w.id + '">' + TY[t].undo + '</button>' : '<button class="btn btn-primary btn-sm" data-act="plDone" data-id="' + w.id + '">' + ic.check + ' ' + TY[t].done + '</button>');
    return '<article class="card wish' + (d.done ? ' is-done' : '') + '" style="--fc:' + esc(f && f.data.color ? f.data.color : 'var(--line3)') + '"><button class="wish-main" data-act="plEdit" data-id="' + w.id + '">' + photo +
      '<span class="grow"><span class="h3">' + esc(d.name) + '</span>' + (meta ? '<span class="wish-meta">' + meta + '</span>' : '') + '</span>' + (d.price ? '<span class="wish-price">' + euro(d.price) + '</span>' : '') + '</button>' +
      (d.place ? '<div class="wish-place">' + L.placeLink(d.place, d.placeId) + '</div>' : '') + '<div class="row wrap wish-act">' + acts + '</div></article>';
  }
  const chip = (act, attrs, label, on, color) => '<button class="pl-chip' + (on ? ' on' : '') + '" data-act="' + act + '" ' + attrs + (color ? ' style="--fc:' + color + '"' : '') + '>' + (color ? '<i></i>' : '') + label + '</button>';

  function planView(t) {
    const T = TY[t], st = S.pl[t];
    const all = items(t);
    const fl = folders(t);
    if (st.f && st.f !== '__none' && !Store.get(st.f)) st.f = '';
    let list = all;
    if (st.f === '__none') list = list.filter((w) => !w.data.folderId || !Store.get(w.data.folderId));
    else if (st.f) list = list.filter((w) => w.data.folderId === st.f);
    if (st.w) list = list.filter((w) => w.data.who === st.w || w.data.who === 'both');
    const todo = list.filter((w) => !w.data.done), done = list.filter((w) => w.data.done);
    const planned = todo.filter((w) => w.data.month).sort(sortWhen);
    const loose = todo.filter((w) => !w.data.month).slice().reverse();
    const sum = (a) => round2(a.reduce((s, w) => s + (+w.data.price || 0), 0));
    const cnt = (n) => n + ' ' + plural(n, T.plural[0], T.plural[1]);

    const summary = '<section class="card stack-sm"><div class="row between"><div><div class="eyebrow warm">' + T.todo + '</div><p class="total">' + (sum(todo) ? euro(sum(todo)) : cnt(todo.length)) + '</p></div>' + (done.length ? '<div class="right"><div class="eyebrow">' + T.gone + '</div><p class="h3">' + (sum(done) ? euro(sum(done)) : cnt(done.length)) + '</p></div>' : '') + '</div>' +
      (sum(todo) ? '<p class="sub">' + cnt(todo.length) + (list.some((w) => !w.data.price && !w.data.done) ? ', certains sans prix' : '') + '</p>' : '') + '</section>';

    const filters = '<div class="pl-chips">' + chip('plFolder', 'data-t="' + t + '" data-f=""', 'Tout', !st.f) + fl.map((f) => chip('plFolder', 'data-t="' + t + '" data-f="' + f.id + '"', esc(f.data.name), st.f === f.id, f.data.color || '#B8B0A8')).join('') +
      (fl.length ? chip('plFolder', 'data-t="' + t + '" data-f="__none"', 'Sans dossier', st.f === '__none') : '') + '<button class="pl-chip ghost" data-act="wfManage" data-t="' + t + '">' + ic.folder + ' Dossiers</button></div>' +
      '<div class="pl-chips">' + chip('plWho', 'data-t="' + t + '" data-w=""', 'Pour tous', !st.w) + NAMES.map((n) => chip('plWho', 'data-t="' + t + '" data-w="' + n + '"', n, st.w === n)).join('') + '</div>';
    const seg = '<div class="seg" role="tablist">' + [['month', 'Par mois (' + planned.length + ')'], ['loose', 'Non planifiés (' + loose.length + ')'], ['done', T.gone + ' (' + done.length + ')']].map((x) => '<button class="' + (st.v === x[0] ? 'on' : '') + '" data-act="plView" data-t="' + t + '" data-v="' + x[0] + '" role="tab" aria-selected="' + (st.v === x[0]) + '">' + x[1] + '</button>').join('') + '</div>';

    let body = '';
    if (st.v === 'month') {
      const groups = {};
      planned.forEach((w) => { (groups[w.data.month] = groups[w.data.month] || []).push(w); });
      body = Object.keys(groups).sort().map((m) => '<section class="stack"><div class="eyebrow warm">' + esc(mLabel(m)) + (sum(groups[m]) ? ' · ' + euro(sum(groups[m])) : '') + '</div>' + groups[m].map((w) => card(w, t)).join('') + '</section>').join('') ||
        '<div class="card"><p class="sub">Rien de planifié sur un mois précis. Ajoute un mois et une année en créant ou en modifiant un élément.</p></div>';
    } else if (st.v === 'loose') {
      body = loose.map((w) => card(w, t)).join('') || '<div class="card"><p class="sub">Tout est planifié, ou la liste est vide.</p></div>';
    } else {
      body = done.slice().sort((a, b) => (b.data.doneAt || '').localeCompare(a.data.doneAt || '')).map((w) => card(w, t)).join('') || '<div class="card"><p class="sub">Rien de validé pour l\'instant.</p></div>';
    }
    return '<div class="stack"><div class="head"><div><h2 class="h2">' + T.title + '</h2><p class="sub">' + T.sub + '</p></div><button class="btn btn-primary" data-act="plAdd" data-t="' + t + '">' + T.add.split(' ')[0] + '</button></div>' + summary + filters + seg + body + '</div>';
  }
  L.views.spend = () => planView('spend');
  { const moments = L.views.moments;
    L.views.activities = () => '<div class="stack">' + planView('act') + '<div class="sep"></div>' + linkPlaces(moments()) + '</div>';
  }
  A.plView = (el) => { S.pl[el.dataset.t].v = el.dataset.v; redraw(); };
  A.plFolder = (el) => { S.pl[el.dataset.t].f = el.dataset.f; redraw(); };
  A.plWho = (el) => { S.pl[el.dataset.t].w = el.dataset.w; redraw(); };
  A.plDone = async (el) => { const p = Store.patch(el.dataset.id, { done: true, doneAt: new Date().toISOString() }); redraw(); toast('Validé !'); await p; };
  A.plUndo = async (el) => { const p = Store.patch(el.dataset.id, { done: false, doneAt: '' }); redraw(); await p; };

  function planSheet(t, w) {
    const T = TY[t], d = w ? w.data : {};
    const cy = new Date().getFullYear();
    const parts = d.month ? d.month.split('-') : ['', ''];
    const years = [];
    for (let y = cy - 1; y <= cy + 10; y++) years.push(y);
    if (parts[0] && years.indexOf(+parts[0]) < 0) years.push(+parts[0]);
    const mm = '<select class="input" name="mm"><option value="">-</option>' + MONTHS.map((m, i) => '<option value="' + pad(i + 1) + '"' + (parts[1] === pad(i + 1) ? ' selected' : '') + '>' + m + '</option>').join('') + '</select>';
    const yy = '<select class="input" name="yy"><option value="">-</option>' + years.map((y) => '<option' + (parts[0] === String(y) ? ' selected' : '') + '>' + y + '</option>').join('') + '</select>';
    const fl = folders(t);
    openSheet('<h3 class="h3">' + (w ? T.edit : T.one) + '</h3><form class="stack-sm" data-form="plSave" data-t="' + t + '" data-id="' + (w ? w.id : '') + '">' +
      field('Nom', '<input class="input" name="name" required maxlength="120" value="' + esc(d.name || '') + '">') +
      field('Photo (facultatif)', '<input class="input" type="file" name="photo" accept="image/*">') +
      (d.photo ? '<label class="check"><input type="checkbox" name="rmphoto" value="1"> Retirer la photo actuelle</label>' : '') +
      field('Lien (facultatif)', '<input class="input" name="link" inputmode="url" autocapitalize="off" placeholder="https://…" value="' + esc(d.link || '') + '">') +
      field('Prix en € (facultatif)', '<input class="input" name="price" inputmode="decimal" value="' + (d.price || '') + '">') +
      field('Pour (facultatif)', '<select class="input" name="who"><option value="">Personne en particulier</option>' + NAMES.map((n) => '<option value="' + n + '"' + (d.who === n ? ' selected' : '') + '>' + n + '</option>').join('') + '<option value="both"' + (d.who === 'both' ? ' selected' : '') + '>Nous deux</option></select>') +
      '<div class="eyebrow">Quand (facultatif)</div>' +
      (t === 'act' ? '<div class="grid2">' + field('Jour précis', '<input class="input" type="date" name="date" value="' + esc(d.date || '') + '">') + field('Heure', '<input class="input" type="time" name="time" value="' + esc(d.time || '') + '">') + '</div><p class="small muted">Ou seulement un mois (ignoré si un jour précis est choisi) :</p>' : '') +
      '<div class="grid2">' + field('Mois', mm) + field('Année', yy) + '</div>' +
      (t === 'act' ? L.placeField({ label: 'Lieu (facultatif)', name: 'place', value: d.place, id: d.placeId, presets: true }) : '') +
      field('Dossier (facultatif)', '<select class="input" name="folder"><option value="">Aucun dossier</option>' + fl.map((f) => '<option value="' + f.id + '"' + (d.folderId === f.id ? ' selected' : '') + '>' + esc(f.data.name) + '</option>').join('') + '</select>') +
      '<button class="btn btn-primary btn-block" type="submit">Enregistrer</button>' +
      (w ? '<button class="btn btn-danger btn-block" type="button" data-act="plDel" data-id="' + w.id + '">Supprimer</button>' : '') + '</form>');
  }
  A.plAdd = (el) => planSheet(el.dataset.t, null);
  A.plEdit = (el) => { const w = Store.get(el.dataset.id); if (w) planSheet(w.data.t, w); };
  F.plSave = async (form, d) => {
    const t = form.dataset.t;
    const old = form.dataset.id ? Store.get(form.dataset.id) : null;
    if (!d.name) return toast('Indique un nom.');
    let link = d.link || '';
    if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link;
    let month = '', date = '', time = '';
    if (t === 'act' && d.date) { date = d.date; time = d.time || ''; month = date.slice(0, 7); } else if (d.mm && d.yy) month = d.yy + '-' + d.mm;
    let photo = old && old.data.photo ? old.data.photo : null;
    const file = d.photo;
    const hasNew = file && typeof file !== 'string' && file.size > 0 && (file.type || '').indexOf('image/') === 0;
    if (photo && (d.rmphoto || hasNew)) { try { await Store.removeFiles([photo.path, photo.thumb]); } catch (e) { /* tant pis */ } photo = null; }
    if (hasNew) {
      toast('Envoi de la photo…', 0);
      const full = await L.processImage(file, 1400, 0.82), thumb = await L.processImage(file, 420, 0.78);
      const base = 'wishes/' + uid();
      await Store.upload(base + '.jpg', full, 'image/jpeg');
      await Store.upload(base + '_t.jpg', thumb, 'image/jpeg');
      photo = { path: base + '.jpg', thumb: base + '_t.jpg' };
      L.hideToast();
    }
    const data = { t, name: d.name, link, price: num(d.price), who: d.who || '', month, date, time, place: t === 'act' ? d.place || '' : '', placeId: t === 'act' && d.place ? d.placeId || '' : '', folderId: d.folder || '', photo, done: old ? !!old.data.done : false, doneAt: old ? old.data.doneAt || '' : '' };
    if (old) await Store.patch(old.id, data); else await Store.add('wish', data);
    closeSheet(); redraw();
  };
  A.plDel = (el) => {
    const id = el.dataset.id, w = Store.get(id);
    if (!w) return;
    L.confirm(TY[w.data.t].delMsg, 'Supprimer', async () => {
      if (w.data.photo) { try { await Store.removeFiles([w.data.photo.path, w.data.photo.thumb]); } catch (e) { /* tant pis */ } }
      await Store.del(id); redraw(); toast('Supprimé.');
    });
  };

  // Dossiers d'achats / d'activités
  function manageSheet(t) {
    const fl = folders(t);
    openSheet('<h3 class="h3">Dossiers · ' + TY[t].title + '</h3><div class="stack-sm">' + (fl.map((f) => {
      const n = items(t).filter((w) => w.data.folderId === f.id).length;
      return '<div class="row wf-row"><span class="dot" style="background:' + esc(f.data.color || '#B8B0A8') + '"></span><span class="grow"><b>' + esc(f.data.name) + '</b><span class="sub block">' + n + ' ' + plural(n, 'élément', 'éléments') + '</span></span><button class="btn btn-text btn-sm" data-act="wfEdit" data-id="' + f.id + '">Modifier</button><button class="btn btn-text btn-sm" data-act="wfDel" data-id="' + f.id + '">Supprimer</button></div>';
    }).join('') || '<p class="sub">Aucun dossier pour l\'instant.</p>') + '<button class="btn btn-dashed btn-block" data-act="wfAdd" data-t="' + t + '">+ Nouveau dossier</button><button class="btn btn-text btn-block" data-act="closeSheet">Fermer</button></div>');
  }
  function wfForm(t, f) {
    openSheet('<h3 class="h3">' + (f ? 'Modifier le dossier' : 'Nouveau dossier') + '</h3><form class="stack-sm" data-form="wfSave" data-t="' + t + '" data-id="' + (f ? f.id : '') + '">' + field('Nom', '<input class="input" name="name" required maxlength="60" value="' + esc(f ? f.data.name : '') + '">') + swatches(f ? f.data.color || '' : '') + '<button class="btn btn-primary btn-block" type="submit">Enregistrer</button></form>');
  }
  A.wfManage = (el) => manageSheet(el.dataset.t);
  A.wfAdd = (el) => wfForm(el.dataset.t, null);
  A.wfEdit = (el) => { const f = Store.get(el.dataset.id); if (f) wfForm(f.data.t, f); };
  F.wfSave = async (form, d) => {
    const t = form.dataset.t;
    const color = /^#[0-9A-Fa-f]{6}$/.test(d.color || '') ? d.color : COLORS[0][0];
    if (form.dataset.id) await Store.patch(form.dataset.id, { name: d.name, color }); else await Store.add('wishfolder', { t, name: d.name, color });
    manageSheet(t); redraw();
  };
  A.wfDel = (el) => {
    const id = el.dataset.id, f = Store.get(id);
    if (!f) return;
    L.confirm('Supprimer ce dossier ? Les éléments qu\'il contient ne sont pas supprimés : ils n\'ont simplement plus de dossier.', 'Supprimer le dossier', async () => {
      for (const w of items(f.data.t).filter((x) => x.data.folderId === id)) await Store.patch(w.id, { folderId: '' });
      const pl = S.pl[f.data.t]; if (pl.f === id) pl.f = '';
      await Store.del(id); redraw(); toast('Dossier supprimé.');
    });
  };

  /* ================= Onglets ================= */
  const TABS = [['home', 'Accueil'], ['activities', 'Activités'], ['spend', 'Dépenses'], ['ideas', 'Idées'], ['questions', 'Questionnements'], ['trips', 'Voyages'], ['shows', 'Concerts et ciné'], ['music', 'Musique'], ['album', 'Album'], ['files', 'Fichiers']];
  L.renderChrome = () => {
    $('#top').innerHTML = '<h1 class="brand"><span class="l">Leeamm</span> <span class="x">X</span> <span class="a">Ange</span></h1><button class="me-chip" data-act="settings" aria-label="Réglages">' + L.who(me()) + '</button>';
    $('#tabs').innerHTML = TABS.map((t) => '<button class="tab' + (S.tab === t[0] ? ' on' : '') + '" data-act="tab" data-tab="' + t[0] + '">' + t[1] + '</button>').join('');
    const on = $('#tabs .tab.on');
    if (on && on.scrollIntoView) { try { on.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) { /* ok */ } }
    if (L.renderPresence) L.renderPresence();
  };
})();
