/* core.js : petits outils partagés (dates, icônes, fenêtres, messages). */
(function () {
  'use strict';
  const L = (window.L = {});

  L.S = { tab: 'home', tripId: null, showId: null, folderId: '', openPicker: null, answering: {}, expanded: {}, showClosed: false, showPast: false, drafts: {}, dirty: false };

  L.$ = (s, r) => (r || document).querySelector(s);
  L.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  L.nl = (s) => L.esc(s).replace(/\n/g, '<br>');
  L.plural = (n, s, p) => (n >= 2 ? p : s);

  L.VERSION = '11 nov. 2026 · 3';
  L.NAMES = ['Ange', 'Leeamm'];
  L.other = (n) => (n === 'Ange' ? 'Leeamm' : 'Ange');
  L.col = (n) => (n === 'Ange' ? 'var(--ange)' : 'var(--leeamm)');
  L.who = (n) => '<span class="who" style="color:' + L.col(n) + '"><i style="background:' + L.col(n) + '"></i>' + L.esc(n) + '</span>';

  /* ---------- Dates ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const WD = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const MO = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  L.pad = pad;
  L.ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  L.parseDay = (s) => { const p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  L.fDay = (d) => WD[d.getDay()] + ' ' + d.getDate() + ' ' + MO[d.getMonth()];
  L.fDayY = (d) => L.fDay(d) + ' ' + d.getFullYear();
  L.fHour = (d) => d.getHours() + ' h ' + pad(d.getMinutes());
  L.fDT = (d) => L.fDayY(d) + ' · ' + L.fHour(d);
  L.fShort = (d) => d.getDate() + ' ' + MO[d.getMonth()] + ' ' + d.getFullYear();
  L.today0 = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  L.daysUntil = (dayStr) => Math.round((L.parseDay(dayStr) - L.today0()) / 864e5);
  L.anniv = (base) => {
    const t = L.today0();
    let c = new Date(t.getFullYear(), base.getMonth(), base.getDate());
    if (c < t) c = new Date(t.getFullYear() + 1, base.getMonth(), base.getDate());
    return { days: Math.round((c - t) / 864e5), years: c.getFullYear() - base.getFullYear() };
  };
  L.since = (base) => {
    const n = Math.round((L.today0() - base) / 864e5);
    return n <= 0 ? "aujourd'hui" : n === 1 ? 'hier' : 'il y a ' + n + ' jours';
  };
  L.ago = (iso) => {
    const d = new Date(iso);
    const m = (Date.now() - d.getTime()) / 60000;
    if (m < 1) return "à l'instant";
    if (m < 60) return 'il y a ' + Math.floor(m) + ' min';
    if (m < 1440) return 'il y a ' + Math.floor(m / 60) + ' h';
    return L.fDay(d) + ', ' + L.fHour(d);
  };

  L.clock = (t) => { const m = String(t || '').match(/^(\d{1,2}):(\d{2})/); return m ? (+m[1]) + ' h ' + m[2] : ''; };
  L.fDateTime = (dayStr, time) => (dayStr ? fDayFull(dayStr) : '') + (time ? ' · ' + L.clock(time) : '');
  function fDayFull(s) { const d = L.parseDay(s); return L.fDay(d) + ' ' + d.getFullYear(); }
  L.byDate = (a, b) => ((a.data.date || '9999') + (a.data.time || '00:00')).localeCompare((b.data.date || '9999') + (b.data.time || '00:00'));
  L.dur = (m) => (m >= 60 ? Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + pad(m % 60) : '') : m + ' min');
  L.seen = (iso) => {
    const d = new Date(iso);
    const mins = (Date.now() - d.getTime()) / 60000;
    if (mins < 60) return 'il y a ' + Math.max(1, Math.floor(mins)) + ' min';
    const t0 = L.today0();
    if (d >= t0) return "aujourd'hui, " + L.fHour(d);
    if (d >= new Date(t0.getTime() - 864e5)) return 'hier, ' + L.fHour(d);
    return L.fDay(d) + ', ' + L.fHour(d);
  };

  /* Texte long : réduit avec « Lire la suite » */
  L.longText = (id, text, cls) => {
    const long = String(text).length > 260 || String(text).split('\n').length > 5;
    const open = !!L.S.expanded[id];
    const p = '<p class="big' + (long && !open ? ' clamp' : '') + (cls ? ' ' + cls : '') + '">' + L.nl(text) + '</p>';
    return long ? p + '<button class="btn btn-text btn-sm self-start" data-act="expand" data-id="' + id + '">' + (open ? 'Réduire' : 'Lire la suite') + '</button>' : p;
  };

  /* Morceaux : un seul bouton, selon la plateforme de la personne connectée */
  L.platLabel = () => (Store.platform() === 'apple' ? 'Apple Music' : 'Deezer');
  L.trackUrl = (t) => {
    const q = encodeURIComponent(((t.title || '') + ' ' + (t.artist || '')).trim());
    return Store.platform() === 'apple' ? t.apple || 'https://music.apple.com/fr/search?term=' + q : t.deezer || 'https://www.deezer.com/search/' + q;
  };
  L.trackCover = (t) => (t.cover ? '<img src="' + L.esc(t.cover) + '" alt="" referrerpolicy="no-referrer" loading="lazy">' : L.ic.note);

  L.round2 = (n) => Math.round((+n || 0) * 100) / 100;
  L.euro = (n) => {
    n = L.round2(n);
    const s = n.toLocaleString('fr-FR', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
    return s.replace(/[  ]/g, ' ') + ' €';
  };

  /* ---------- Icônes ---------- */
  const svg = (inner) => '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
  L.ic = {
    pin: svg('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
    heart: svg('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
    laugh: svg('<circle cx="12" cy="12" r="9"/><path d="M8.5 10h0.01M15.5 10h0.01M7.5 13.5h9a4.5 4.5 0 0 1-9 0z"/>'),
    confused: svg('<circle cx="12" cy="12" r="9"/><path d="M9 11h0.01M15 11h0.01M7.5 8l3-1M13.5 7l3 1M8.5 16c1.2-1 2.3-1 3.5 0s2.3 1 3.5 0"/>'),
    cute: svg('<circle cx="12" cy="12" r="9"/><path d="M7.5 11c0.7-1 1.8-1 2.5 0M14 11c0.7-1 1.8-1 2.5 0M10 15c1 1 3 1 4 0"/><circle cx="7" cy="14" r="1" fill="currentColor"/><circle cx="17" cy="14" r="1" fill="currentColor"/>'),
    judge: svg('<circle cx="12" cy="12" r="9"/><path d="M9 11h0.01M15 11h0.01M7.5 8.5l3 1M16.5 8.5l-3 1M9 16h6"/>'),
    note: svg('<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'),
    image: svg('<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="11" r="1.8"/><path d="M4 17l5-4 4 3 3-2 4 3"/>'),
    file: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>'),
    play: '<svg class="ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    dots: svg('<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>'),
    check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    back: svg('<path d="M15 5l-7 7 7 7"/>'),
    folder: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    ticket: svg('<path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12" stroke-dasharray="2 3"/>'),
    up: svg('<path d="M6 14l6-6 6 6"/>'),
    down: svg('<path d="M6 10l6 6 6-6"/>'),
    x: svg('<path d="M6 6l12 12M18 6L6 18"/>')
  };
  L.REACTIONS = [['heart', 'Cœur'], ['laugh', 'Rire'], ['confused', 'Incompréhension'], ['cute', 'Mignon'], ['judge', 'Jugement']];

  /* ---------- Catégories de dépenses et détails ---------- */
  L.CATS = [
    { k: 'transport', label: 'Transports', fields: [
      { k: 'mode', l: 'Moyen de transport', opts: ['Train', 'Avion', 'Voiture', 'Bus', 'Covoiturage', 'Bateau', 'Autre'] },
      { k: 'company', l: 'Société de transport', ph: 'SNCF, Ouigo, Air France…' },
      { k: 'route', l: 'Trajet', ph: 'Rennes → Lyon' },
      { k: 'when', l: 'Date et heure', type: 'datetime-local' },
      { k: 'ref', l: 'Référence de réservation' }] },
    { k: 'lodging', label: 'Hébergement', fields: [
      { k: 'type', l: "Type d'hébergement", opts: ['Hôtel', 'Appartement', "Chambre d'hôtes", 'Camping', 'Chez des proches', 'Autre'] },
      { k: 'name', l: 'Nom du lieu' },
      { k: 'address', l: 'Adresse' },
      { k: 'nights', l: 'Nombre de nuits', type: 'number' },
      { k: 'ref', l: 'Référence de réservation' }] },
    { k: 'groceries', label: 'Courses', fields: [
      { k: 'store', l: 'Enseigne', ph: 'Carrefour, marché…' },
      { k: 'note', l: 'Précisions' }] },
    { k: 'activities', label: 'Activités', fields: [
      { k: 'place', l: 'Lieu ou prestataire' },
      { k: 'when', l: 'Date et heure', type: 'datetime-local' },
      { k: 'ref', l: 'Référence de réservation' }] },
    { k: 'other', label: 'Autre', fields: [{ k: 'note', l: 'Précisions' }] }
  ];
  L.cat = (k) => L.CATS.find((c) => c.k === k) || L.CATS[L.CATS.length - 1];
  L.detailLine = (e) => {
    const c = L.cat(e.category);
    const det = e.details || {};
    return c.fields.filter((f) => det[f.k] && f.k !== 'ref').map((f) => {
      const v = det[f.k];
      if (f.type === 'datetime-local') { const d = new Date(v); return isNaN(d) ? v : L.fDT(d); }
      if (f.k === 'nights') return v + (+v >= 2 ? ' nuits' : ' nuit');
      return v;
    }).join(' · ');
  };

  /* ---------- Messages et fenêtres ---------- */
  L.toast = (m, ms) => {
    const t = L.$('#toast');
    t.textContent = m;
    t.classList.add('show');
    clearTimeout(L._tt);
    if (ms !== 0) L._tt = setTimeout(() => t.classList.remove('show'), ms || 2800);
  };
  L.hideToast = () => L.$('#toast').classList.remove('show');

  L.openSheet = (html, opts) => {
    const r = L.$('#sheet-root');
    r.innerHTML = '<div class="overlay" data-act="closeSheet"></div><div class="sheet" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.classList.add('noscroll');
    L.hydrate(r);
    if (opts && opts.onMount) opts.onMount(r);
  };
  L.closeSheet = () => { L.$('#sheet-root').innerHTML = ''; document.body.classList.remove('noscroll'); };
  L.sheetOpen = () => !!L.$('#sheet-root').firstChild;

  L.confirm = (msg, yes, cb) => {
    L._confirm = cb;
    L.openSheet('<p class="big">' + L.esc(msg) + '</p><div class="stack-sm"><button class="btn btn-danger btn-block" data-act="confirmYes">' + L.esc(yes || 'Supprimer') + '</button><button class="btn btn-ghost btn-block" data-act="closeSheet">Annuler</button></div>');
  };
  L.menu = (title, items) => {
    L.openSheet((title ? '<h3 class="h3">' + L.esc(title) + '</h3>' : '') + '<div class="stack-sm">' + items.map((i) => '<button class="btn ' + (i.danger ? 'btn-danger' : 'btn-ghost') + ' btn-block" data-act="' + i.act + '" ' + (i.attrs || '') + '>' + L.esc(i.label) + '</button>').join('') + '<button class="btn btn-text btn-block" data-act="closeSheet">Fermer</button></div>');
  };
  L.field = (label, input, extra) => '<label class="field"' + (extra ? ' ' + extra : '') + '><span>' + label + '</span>' + input + '</label>';
  L.fd = (form) => { const o = {}; new FormData(form).forEach((v, k) => { o[k] = typeof v === 'string' ? v.trim() : v; }); return o; };

  /* Charge les images / audios / liens de fichiers (adresses temporaires) */
  L.hydrate = async (root) => {
    const els = Array.from((root || document).querySelectorAll('[data-path]'));
    const need = Array.from(new Set(els.map((e) => e.dataset.path)));
    if (!need.length) return;
    const map = await Store.fileUrls(need);
    els.forEach((e) => {
      const u = map[e.dataset.path];
      if (!u) return;
      if (e.tagName === 'A') e.href = u;
      else if (e.getAttribute('src') !== u) e.src = u;
    });
  };

  L.fileSize = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' Mo' : Math.max(1, Math.round(n / 1024)) + ' Ko');
})();
