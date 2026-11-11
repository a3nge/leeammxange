/* extras.js : dernière connexion, dossiers de fichiers, concerts et ciné, notifications. */
(function () {
  'use strict';
  const { S, $, esc, nl, plural, col, who, other, NAMES, ic, fDT, toast, openSheet, closeSheet, field } = L;
  const A = L.actions, F = L.forms, C = L.changes;
  const CFG = window.APP_CONFIG || {};
  const me = () => Store.me;
  const redraw = () => L.renderMain();

  const head = (t, s, btn) => '<div class="head"><div><h2 class="h2">' + t + '</h2><p class="sub">' + s + '</p></div>' + (btn || '') + '</div>';
  const addBtn = (act, label) => '<button class="btn btn-primary" data-act="' + act + '">' + (label || 'Ajouter') + '</button>';
  const empty = (t) => '<div class="card"><p class="sub">' + t + '</p></div>';
  const menuBtn = (act, id, label) => '<button class="icon-btn" data-act="' + act + '" data-id="' + id + '" aria-label="' + label + '">' + ic.dots + '</button>';
  const idAttr = (id) => 'data-id="' + id + '"';

  /* ---------- Dernière connexion de l'autre ---------- */
  const ONLINE_MIN = 3;
  L.renderPresence = () => {
    const el = $('#presence');
    if (!el || !Store.me) return;
    const o = other(Store.me);
    const p = Store.presence[o];
    const mins = p ? (Date.now() - new Date(p.data.at).getTime()) / 60000 : null;
    const on = mins !== null && mins < ONLINE_MIN;
    const txt = !p ? "aucune connexion pour l'instant" : on ? 'en ligne' : 'dernière connexion ' + L.seen(p.data.at);
    el.innerHTML = '<span class="dot' + (on ? ' on' : '') + '" style="--c:' + col(o) + '"></span><b style="color:' + col(o) + '">' + esc(o) + '</b><span class="muted"> · ' + esc(txt) + '</span>';
  };

  /* ---------- Dossiers de fichiers ---------- */
  A.addFolder = () => openSheet('<h3 class="h3">Nouveau dossier</h3><form class="stack-sm" data-form="saveFolder" data-id="">' + field('Nom du dossier', '<input class="input" name="name" required maxlength="60" placeholder="Enregistrements, voyage à Lisbonne…">') + '<button class="btn btn-primary btn-block" type="submit">Créer</button></form>');
  A.renameFolder = (el) => {
    const f = Store.get(el.dataset.id);
    if (f) openSheet('<h3 class="h3">Renommer le dossier</h3><form class="stack-sm" data-form="saveFolder" data-id="' + f.id + '">' + field('Nom du dossier', '<input class="input" name="name" required maxlength="60" value="' + esc(f.data.name) + '">') + '<button class="btn btn-primary btn-block" type="submit">Enregistrer</button></form>');
  };
  F.saveFolder = async (form, d) => {
    if (form.dataset.id) await Store.patch(form.dataset.id, { name: d.name });
    else await Store.add('folder', { name: d.name, parentId: S.folderId || '' });
    closeSheet(); redraw();
  };
  A.openFolder = (el) => { S.folderId = el.dataset.id || ''; redraw(); window.scrollTo(0, 0); };
  A.folderMenu = (el) => L.menu('', [{ label: 'Renommer', act: 'renameFolder', attrs: idAttr(el.dataset.id) }, { label: 'Supprimer', act: 'delFolder', attrs: idAttr(el.dataset.id), danger: true }]);
  A.delFolder = (el) => {
    const id = el.dataset.id;
    L.confirm("Supprimer ce dossier ? Les fichiers et dossiers qu'il contient ne sont pas supprimés : ils sont déplacés dans le dossier parent.", 'Supprimer le dossier', async () => {
      const f = Store.get(id);
      if (!f) return;
      const parent = f.data.parentId || '';
      const files = Store.items.filter((x) => x.kind === 'file' && x.data.folderId === id);
      const subs = Store.items.filter((x) => x.kind === 'folder' && x.data.parentId === id);
      for (const x of files) await Store.patch(x.id, { folderId: parent });
      for (const x of subs) await Store.patch(x.id, { parentId: parent });
      if (S.folderId === id) S.folderId = parent;
      await Store.del(id);
      redraw(); toast('Dossier supprimé.');
    });
  };
  A.fileMenu = (el) => {
    const f = Store.get(el.dataset.id);
    if (!f) return;
    const items = [{ label: 'Déplacer dans un dossier', act: 'moveFile', attrs: idAttr(f.id) }];
    if (f.author === me()) items.push({ label: 'Supprimer', act: 'delItem', attrs: idAttr(f.id), danger: true });
    L.menu('', items);
  };
  A.moveFile = (el) => {
    const f = Store.get(el.dataset.id);
    if (!f) return;
    const cur = f.data.folderId || '';
    const opts = '<option value="">Fichiers (racine)</option>' + Store.by('folder').map((x) => ({ id: x.id, p: L.folderPath(x.id) })).sort((a, b) => a.p.localeCompare(b.p, 'fr')).map((x) => '<option value="' + x.id + '"' + (x.id === cur ? ' selected' : '') + '>' + esc(x.p) + '</option>').join('');
    openSheet('<h3 class="h3">Déplacer « ' + esc(f.data.name) + ' »</h3><form class="stack-sm" data-form="moveFile" data-id="' + f.id + '">' + field('Dossier', '<select class="input" name="folder">' + opts + '</select>') + '<button class="btn btn-primary btn-block" type="submit">Déplacer</button></form>');
  };
  F.moveFile = async (form, d) => { await Store.patch(form.dataset.id, { folderId: d.folder || '' }); closeSheet(); redraw(); toast('Fichier déplacé.'); };

  /* ---------- Concerts et ciné ---------- */
  const typeLabel = (t) => (t === 'cine' ? 'Ciné' : 'Concert');
  const startOf = (d) => (d.date ? new Date(d.date + 'T' + (d.time || '00:00')) : null);
  function endText(d) {
    if (!d.date || !d.time || !d.duration) return '';
    const e = new Date(startOf(d).getTime() + d.duration * 60000);
    return 'fin vers ' + L.fHour(e) + (L.ymd(e) !== d.date ? ' (' + L.fDay(e) + ')' : '');
  }
  function ticketInfo(d) {
    if (!d.ticketsOpen) return '';
    const days = L.daysUntil(d.ticketsOpen);
    if (days > 0) return 'Ouverture des billets : ' + L.fDateTime(d.ticketsOpen, d.ticketsOpenTime) + ' (dans ' + days + ' ' + plural(days, 'jour', 'jours') + ')';
    if (days === 0) return "Ouverture des billets aujourd'hui" + (d.ticketsOpenTime ? ' à ' + L.clock(d.ticketsOpenTime) : '') + ' !';
    return 'Billets ouverts depuis le ' + L.fDateTime(d.ticketsOpen, '');
  }
  const countHtml = (days) => (days !== null && days > 0 ? '<div class="count sm"><span class="num">' + days + '</span><span class="unit">' + plural(days, 'jour', 'jours') + '</span></div>' : days === 0 ? '<span class="pill-on">Aujourd\'hui</span>' : '');

  function showCard(s) {
    const d = s.data;
    const days = d.date ? L.daysUntil(d.date) : null;
    const tk = ticketInfo(d);
    return '<button class="card show-card" data-act="openShow" data-id="' + s.id + '"><span class="grow"><span class="tagline">' + typeLabel(d.type) + '</span><span class="h3">' + esc(d.title) + '</span><span class="sub">' + esc(L.fDateTime(d.date, d.time)) + (d.venue ? ' · ' + esc(d.venue) : '') + '</span>' + (tk ? '<span class="small warm">' + esc(tk) + '</span>' : '') + '</span>' + countHtml(days) + '</button>';
  }

  function showDetail(s) {
    const d = s.data;
    const isConcert = d.type !== 'cine';
    const days = d.date ? L.daysUntil(d.date) : null;
    const end = endText(d);
    const trip = d.tripId ? Store.get(d.tripId) : null;
    const tk = ticketInfo(d);
    const sl = d.setlist || [];
    const outs = d.outfits || [];

    const top = '<div class="row between"><button class="btn btn-text btn-sm" data-act="backShows">' + ic.back + ' Concerts et ciné</button>' + menuBtn('showMenu', s.id, 'Options') + '</div>';
    const headCard = '<section class="card stack-sm"><span class="tagline">' + typeLabel(d.type) + '</span><h2 class="h2">' + esc(d.title) + '</h2>' +
      (d.venue ? '<div class="place">' + ic.pin + esc(d.venue) + '</div>' : '') +
      '<p class="dates">' + esc(L.fDateTime(d.date, d.time)) + (d.duration ? '<br>Durée : ' + L.dur(d.duration) + (end ? ' · ' + end : '') : '') + '</p>' +
      (days !== null && days > 0 ? '<div class="count"><span class="num">' + days + '</span><span class="unit">' + plural(days, 'jour', 'jours') + '</span></div>' : '') +
      (d.notes ? '<p class="sub2">' + nl(d.notes) + '</p>' : '') + '</section>';
    const tickets = '<section class="card stack-sm"><div class="eyebrow">Billetterie</div>' + (tk ? '<p class="sub2">' + esc(tk) + '</p>' : '<p class="sub">Date d\'ouverture des billets non renseignée.</p>') + '</section>';
    const tripBlock = isConcert ? '<section class="card stack-sm"><div class="eyebrow">Voyage lié</div>' + (trip ? '<button class="exp" data-act="openTrip" data-id="' + trip.id + '"><span class="grow"><span class="exp-label">' + esc(trip.data.name) + '</span><span class="exp-det">' + (trip.data.stage === 'planned' ? 'Planifié' : 'Idée') + (trip.data.start ? ' · ' + esc(L.fShort(L.parseDay(trip.data.start))) : '') + '</span></span></button>' : '<p class="sub">Ce concert n\'est relié à aucun voyage. Tu peux le relier en modifiant la fiche.</p>') + '</section>' : '';
    const setlist = isConcert ? '<section class="card stack-sm"><div class="row between"><div class="eyebrow">Setlist' + (sl.length ? ' · ' + sl.length + ' ' + plural(sl.length, 'morceau', 'morceaux') : '') + '</div><button class="btn btn-text btn-sm" data-act="addSetTrack">+ Morceau</button></div>' +
      (sl.length ? sl.map((t, i) => '<div class="setrow"><span class="setnum">' + (i + 1) + '</span><span class="cover sm">' + L.trackCover(t) + '</span><span class="grow"><b>' + esc(t.title) + '</b><span class="sub block">' + esc(t.artist) + '</span></span><a class="icon-btn" href="' + esc(L.trackUrl(t)) + '" target="_blank" rel="noopener noreferrer" aria-label="Écouter ' + esc(t.title) + ' sur ' + L.platLabel() + '">' + ic.play + '</a><button class="icon-btn" data-act="slMenu" data-i="' + i + '" aria-label="Options du morceau">' + ic.dots + '</button></div>').join('') : '<p class="sub">Pas encore de setlist. Ajoute les morceaux attendus, avec la même bibliothèque que la musique.</p>') + '</section>' : '';
    const outfits = '<section class="card stack-sm"><div class="row between"><div class="eyebrow">Outfits prévus · ' + outs.length + '/3</div>' + (outs.length < 3 ? '<button class="btn btn-text btn-sm" data-act="pickOutfit">+ Photo</button>' : '') + '</div>' +
      (outs.length ? '<div class="grid3">' + outs.map((o, i) => '<div class="tile-wrap"><button class="tile" data-act="openOutfit" data-i="' + i + '" aria-label="Voir la photo ' + (i + 1) + '"><img data-path="' + esc(o.thumb) + '" alt="" loading="lazy"></button><div class="tile-act" style="color:' + col(o.by || 'Ange') + '">' + esc(o.by || '') + '</div></div>').join('') + '</div>' : '<p class="sub">Jusqu\'à 3 photos de vos tenues prévues.</p>') + '</section>';
    return '<div class="stack">' + top + headCard + tickets + tripBlock + setlist + outfits + '</div>';
  }

  L.views.shows = () => {
    const cur = S.showId && Store.get(S.showId);
    if (S.showId && !cur) S.showId = null;
    if (cur) return showDetail(cur);
    const today = L.ymd(new Date());
    const all = Store.by('show').slice().sort(L.byDate);
    const up = all.filter((x) => (x.data.date || '9999') >= today);
    const past = all.filter((x) => (x.data.date || '9999') < today).reverse();
    return '<div class="stack">' + head('Concerts et ciné', 'Les sorties à venir : billets, date, durée, setlist et tenues.', addBtn('addShow')) +
      (up.map(showCard).join('') || empty('Rien de prévu. Ajoute un concert ou une séance de ciné.')) +
      (past.length ? '<button class="btn btn-ghost btn-block" data-act="togglePast">' + (S.showPast ? 'Masquer' : 'Voir') + ' les sorties passées (' + past.length + ')</button>' + (S.showPast ? past.map(showCard).join('') : '') : '') + '</div>';
  };

  function showSheet(s) {
    const d = s ? s.data : { type: 'concert' };
    const trips = Store.by('trip').slice().sort((a, b) => a.data.name.localeCompare(b.data.name, 'fr'));
    openSheet('<h3 class="h3">' + (s ? 'Modifier la fiche' : 'Nouveau concert ou ciné') + '</h3><form class="stack-sm" data-form="saveShow" data-id="' + (s ? s.id : '') + '">' +
      field('Type', '<select class="input" name="type" data-onchange="showType"><option value="concert"' + (d.type !== 'cine' ? ' selected' : '') + '>Concert</option><option value="cine"' + (d.type === 'cine' ? ' selected' : '') + '>Ciné</option></select>') +
      field('Titre', '<input class="input" name="title" required value="' + esc(d.title || '') + '" placeholder="Artiste, film…">') +
      field('Lieu (facultatif)', '<input class="input" name="venue" value="' + esc(d.venue || '') + '" placeholder="Salle, cinéma, ville…">') +
      '<div class="eyebrow">Ouverture des billets</div><div class="grid2">' + field('Date', '<input class="input" type="date" name="ticketsOpen" value="' + esc(d.ticketsOpen || '') + '">') + field('Heure (facultatif)', '<input class="input" type="time" name="ticketsOpenTime" value="' + esc(d.ticketsOpenTime || '') + '">') + '</div>' +
      '<div class="eyebrow">Représentation</div><div class="grid2">' + field('Date', '<input class="input" type="date" name="date" required value="' + esc(d.date || '') + '">') + field('Heure (facultatif)', '<input class="input" type="time" name="time" value="' + esc(d.time || '') + '">') + '</div>' +
      field('Durée en minutes (facultatif)', '<input class="input" type="number" name="duration" min="0" step="5" inputmode="numeric" value="' + (d.duration || '') + '" placeholder="120">') +
      '<label class="field" id="tripField"' + (d.type === 'cine' ? ' hidden' : '') + '><span>Relier à un voyage (facultatif)</span><select class="input" name="tripId"><option value="">Aucun voyage</option>' + trips.map((t) => '<option value="' + t.id + '"' + (d.tripId === t.id ? ' selected' : '') + '>' + esc(t.data.name) + (t.data.stage === 'planned' ? '' : ' (idée)') + '</option>').join('') + '</select></label>' +
      field('Notes (facultatif)', '<textarea class="input" name="notes" rows="3">' + esc(d.notes || '') + '</textarea>') +
      '<button class="btn btn-primary btn-block" type="submit">Enregistrer</button></form>');
  }
  C.showType = (sel) => { const f = $('#tripField'); if (f) f.hidden = sel.value !== 'concert'; };
  F.saveShow = async (form, d) => {
    if (!d.date) return toast('Indique la date de la représentation.');
    const old = form.dataset.id ? Store.get(form.dataset.id) : null;
    const data = Object.assign({ setlist: [], outfits: [] }, old ? old.data : {}, {
      type: d.type === 'cine' ? 'cine' : 'concert', title: d.title, venue: d.venue || '',
      ticketsOpen: d.ticketsOpen || '', ticketsOpenTime: d.ticketsOpen ? d.ticketsOpenTime || '' : '',
      date: d.date, time: d.time || '', duration: d.duration ? Math.max(0, parseInt(d.duration, 10) || 0) : 0,
      notes: d.notes || '', tripId: d.type === 'cine' ? '' : d.tripId || ''
    });
    if (old) await Store.patch(old.id, data);
    else { const r = await Store.add('show', data); S.showId = r.id; }
    closeSheet(); redraw();
  };
  A.addShow = () => showSheet(null);
  A.showMenu = (el) => L.menu('', [{ label: 'Modifier la fiche', act: 'editShow', attrs: idAttr(el.dataset.id) }, { label: 'Supprimer', act: 'delShow', attrs: idAttr(el.dataset.id), danger: true }]);
  A.editShow = (el) => showSheet(Store.get(el.dataset.id));
  A.delShow = (el) => {
    const id = el.dataset.id;
    L.confirm('Supprimer cette fiche, sa setlist et ses photos de tenues ?', 'Supprimer', async () => { S.showId = null; await Store.del(id); redraw(); toast('Fiche supprimée.'); });
  };
  A.openShow = (el) => { S.tab = 'shows'; S.showId = el.dataset.id; S.tripId = null; L.renderChrome(); redraw(); window.scrollTo(0, 0); };
  A.backShows = () => { S.showId = null; redraw(); window.scrollTo(0, 0); };
  A.togglePast = () => { S.showPast = !S.showPast; redraw(); };

  /* Setlist */
  A.addSetTrack = () => {
    const id = S.showId;
    L.trackPicker({ title: 'Ajouter à la setlist', multi: true, onPick: async (t) => {
      const s = Store.get(id);
      if (!s) return;
      await Store.patch(id, { setlist: (s.data.setlist || []).concat([t]) });
      redraw();
    } });
  };
  A.slMenu = (el) => {
    const i = el.dataset.i;
    L.menu('', [{ label: 'Monter', act: 'slUp', attrs: 'data-i="' + i + '"' }, { label: 'Descendre', act: 'slDown', attrs: 'data-i="' + i + '"' }, { label: 'Retirer de la setlist', act: 'slDel', attrs: 'data-i="' + i + '"', danger: true }]);
  };
  async function setlistEdit(fn) {
    const s = Store.get(S.showId);
    if (!s) return;
    const list = (s.data.setlist || []).slice();
    fn(list);
    closeSheet();
    const p = Store.patch(s.id, { setlist: list });
    redraw();
    await p;
  }
  A.slUp = (el) => setlistEdit((l) => { const i = +el.dataset.i; if (i > 0) { const t = l[i]; l[i] = l[i - 1]; l[i - 1] = t; } });
  A.slDown = (el) => setlistEdit((l) => { const i = +el.dataset.i; if (i < l.length - 1) { const t = l[i]; l[i] = l[i + 1]; l[i + 1] = t; } });
  A.slDel = (el) => setlistEdit((l) => { l.splice(+el.dataset.i, 1); });

  /* Outfits (3 photos au plus) */
  A.pickOutfit = () => { const i = $('#outfitInput'); i.value = ''; i.click(); };
  $('#outfitInput').addEventListener('change', async (e) => {
    const s = Store.get(S.showId);
    if (!s) return;
    const room = 3 - (s.data.outfits || []).length;
    const files = Array.from(e.target.files || []).filter((f) => (f.type || '').indexOf('image/') === 0).slice(0, Math.max(0, room));
    if (!files.length) return toast(room <= 0 ? 'Déjà 3 photos.' : 'Choisis une image.');
    let list = (s.data.outfits || []).slice();
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      toast('Envoi de la photo ' + (i + 1) + ' sur ' + files.length + '…', 0);
      try {
        const full = await L.processImage(files[i], 1400, 0.82);
        const thumb = await L.processImage(files[i], 420, 0.78);
        const base = 'outfits/' + Store.util.uid();
        await Store.upload(base + '.jpg', full, 'image/jpeg');
        await Store.upload(base + '_t.jpg', thumb, 'image/jpeg');
        list = list.concat([{ path: base + '.jpg', thumb: base + '_t.jpg', by: me() }]);
        await Store.patch(s.id, { outfits: list });
        ok++;
        redraw();
      } catch (err) { console.error(err); }
    }
    toast(ok ? ok + ' ' + plural(ok, 'photo ajoutée', 'photos ajoutées') + '.' : "L'envoi a échoué.", 3500);
  });
  A.openOutfit = (el) => {
    const s = Store.get(S.showId);
    const o = s && (s.data.outfits || [])[+el.dataset.i];
    if (!o) return;
    const mine = !o.by || o.by === me();
    openSheet('<div class="lightbox"><img data-path="' + esc(o.path) + '" alt="Tenue prévue"></div><div class="row wrap">' + (mine ? '<button class="btn btn-danger" data-act="delOutfit" data-i="' + el.dataset.i + '">Supprimer la photo</button>' : '') + '<button class="btn btn-text" data-act="closeSheet">Fermer</button></div>');
  };
  A.delOutfit = (el) => {
    const i = +el.dataset.i;
    L.confirm('Supprimer cette photo ?', 'Supprimer', async () => {
      const s = Store.get(S.showId);
      if (!s) return;
      const list = (s.data.outfits || []).slice();
      const gone = list.splice(i, 1)[0];
      const p = Store.patch(s.id, { outfits: list });
      redraw();
      await p;
      if (gone) { try { await Store.removeFiles([gone.path, gone.thumb]); } catch (e) { /* tant pis */ } }
    });
  };

  /* ---------- Notifications ---------- */
  const KEY = CFG.VAPID_PUBLIC_KEY || '';
  const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const standalone = () => (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const b64ToU8 = (b64) => {
    const pad = '='.repeat((4 - (b64.length % 4)) % 4);
    const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
  };
  const nstate = { subscribed: false };
  async function currentSub() {
    if (!supported()) return null;
    const reg = await navigator.serviceWorker.getRegistration();
    return reg ? reg.pushManager.getSubscription() : null;
  }
  L.refreshNotif = async () => { try { nstate.subscribed = !!(await currentSub()); } catch (e) { nstate.subscribed = false; } };
  async function subscribePush() {
    const reg = await navigator.serviceWorker.register('sw.js');
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      try { sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(KEY) }); } catch (e) { throw e; }
    }
    await Store.saveSub(Store.me, sub.toJSON());
    nstate.subscribed = true;
  }
  L.syncPush = () => { if (Store.LIVE && KEY && supported() && Notification.permission === 'granted') return subscribePush().catch((e) => console.error(e)); return Promise.resolve(); };

  L.notifBlock = () => {
    const h = '<div class="sep"></div><div class="eyebrow">Notifications</div>';
    if (!Store.LIVE) return h + '<p class="note">Disponibles une fois le site relié à Supabase.</p>';
    if (!KEY) return h + '<p class="note">Pas encore configurées : voir le guide MISE-A-JOUR.md.</p>';
    if (!supported()) return h + '<p class="note">' + (isIOS() && !standalone() ? "Sur iPhone, installe d'abord le site sur l'écran d'accueil (Partager, puis « Sur l'écran d'accueil »), puis rouvre-le depuis cette icône." : 'Ce navigateur ne permet pas les notifications.') + '</p>';
    const perm = Notification.permission;
    if (perm === 'denied') return h + "<p class=\"note\">Les notifications sont bloquées pour ce site. Autorise-les dans les réglages de l'appareil ou du navigateur, puis reviens ici.</p>";
    const who1 = '<b style="color:' + col(me()) + '">' + esc(me()) + '</b>';
    if (perm === 'granted' && nstate.subscribed) return h + '<p class="sub2">Activées sur cet appareil : tu les reçois en tant que ' + who1 + ' pour ce que fait ' + esc(other(me())) + '.</p><div class="row wrap"><button class="btn btn-ghost grow" data-act="notifTest">Tester</button><button class="btn btn-ghost grow" data-act="notifOff">Désactiver</button></div>';
    return h + '<p class="sub">Reçois une notification quand ' + esc(other(me())) + ' ajoute une idée, un questionnement, un moment ou un média, ou répond à quelque chose.</p><p class="small muted">Tu les recevras en tant que ' + who1 + '. Si ce n\'est pas toi, change d\'abord ton nom ci-dessus.</p><button class="btn btn-primary btn-block" data-act="notifOn">Activer les notifications</button>';
  };
  const baseSettings = A.settings;
  A.settings = async () => { await L.refreshNotif(); baseSettings(); };
  const baseSetMe = A.setMe;
  A.setMe = async (el) => { baseSetMe(el); await Store.beat(); await L.syncPush(); };

  A.notifOn = async () => {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { toast('Notifications non autorisées.'); await L.refreshNotif(); A.settings(); return; }
    try { await subscribePush(); toast('Notifications activées.'); } catch (e) { console.error(e); toast("Impossible de les activer : " + (e && e.message ? e.message : 'erreur')); }
    A.settings();
  };
  A.notifOff = async () => {
    const sub = await currentSub();
    if (sub) { try { await Store.removeSub(sub.endpoint); } catch (e) { /* tant pis */ } await sub.unsubscribe(); }
    nstate.subscribed = false;
    toast('Notifications désactivées sur cet appareil.');
    A.settings();
  };
  A.notifTest = async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return toast('Rien à tester pour le moment.');
    await reg.showNotification('Leeamm X Ange', { body: 'Test : les notifications fonctionnent sur cet appareil.', icon: 'icon-192.png' });
  };

  /* ---------- Démarrage ---------- */
  L.afterStart = () => {
    Store.onPresence = L.renderPresence;
    Store.beat();
    setInterval(() => { if (!document.hidden) Store.beat(); }, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) Store.beat(); });
    setInterval(L.renderPresence, 30000);
    if (Store.LIVE && KEY && supported()) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
      L.syncPush();
    }
  };
})();
