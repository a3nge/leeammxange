/* views.js : l'affichage de chaque page. */
(function () {
  'use strict';
  const { S, esc, nl, plural, col, who, other, NAMES, ic, euro, round2, fDay, fDayY, fHour, fDT, fShort, parseDay, today0, ago } = L;
  const CFG = window.APP_CONFIG;
  const me = () => Store.me;
  const sumAmt = (a) => a.reduce((s, e) => s + (+e.data.amount || 0), 0);

  const head = (t, s, btn) => '<div class="head"><div><h2 class="h2">' + t + '</h2><p class="sub">' + s + '</p></div>' + (btn || '') + '</div>';
  const addBtn = (act, label, attrs) => '<button class="btn btn-primary" data-act="' + act + '" ' + (attrs || '') + '>' + (label || 'Ajouter') + '</button>';
  const empty = (t) => '<div class="card"><p class="sub">' + t + '</p></div>';
  const menuBtn = (act, id, label) => '<button class="icon-btn" data-act="' + act + '" data-id="' + id + '" aria-label="' + label + '">' + ic.dots + '</button>';

  /* ---------- Outils de données ---------- */
  L.assignText = (a) => {
    const parts = [];
    if (a.data.date) parts.push(fDay(parseDay(a.data.date)));
    if (a.data.place) parts.push(a.data.place);
    return parts.join(' · ');
  };
  L.momentsList = () => Store.by('moment').map((m) => ({ id: m.id, m, s: new Date(m.data.start), e: new Date(m.data.end) }));
  L.autoMoment = (dateStr) => {
    if (!dateStr) return null;
    return L.momentsList().sort((a, b) => a.s - b.s).find((x) => L.ymd(x.s) <= dateStr && dateStr <= L.ymd(x.e)) || null;
  };
  L.effMoment = (p) => {
    const mid = p.data.momentId;
    if (mid === 'none') return null;
    if (mid) { const m = Store.get(mid); if (m) return { id: m.id, m, s: new Date(m.data.start), e: new Date(m.data.end) }; }
    return L.autoMoment(p.data.date);
  };
  L.activitiesOf = (momentId) => Store.by('activity').filter((a) => a.data.momentId === momentId).sort((a, b) => (a.data.date || '9999').localeCompare(b.data.date || '9999'));

  L.budget = (tripId) => {
    const ex = Store.by('expense').filter((e) => e.data.tripId === tripId);
    const sh = ex.filter((e) => e.data.scope === 'both');
    const total = round2(sumAmt(ex));
    const shared = round2(sumAmt(sh));
    const half = round2(shared / 2);
    const adv = { Ange: round2(sumAmt(sh.filter((e) => e.data.paidBy === 'Ange'))), Leeamm: round2(sumAmt(sh.filter((e) => e.data.paidBy === 'Leeamm'))) };
    const solo = { Ange: round2(sumAmt(ex.filter((e) => e.data.scope === 'Ange'))), Leeamm: round2(sumAmt(ex.filter((e) => e.data.scope === 'Leeamm'))) };
    const net = round2(adv.Ange - half);
    let creditor = null, debtor = null, due = 0;
    if (Math.abs(net) >= 0.01) {
      if (net > 0) { creditor = 'Ange'; debtor = 'Leeamm'; } else { creditor = 'Leeamm'; debtor = 'Ange'; }
      due = round2(Math.abs(net));
    }
    const per = { Ange: round2(half + solo.Ange), Leeamm: round2(half + solo.Leeamm) };
    return { ex, total, shared, half, adv, solo, creditor, debtor, due, per };
  };

  /* ---------- Briques ---------- */
  function reactBlock(pid) {
    const rs = Store.by('reaction').filter((r) => r.data.parentId === pid);
    const chips = L.REACTIONS.map((r) => ({ k: r[0], label: r[1], list: rs.filter((x) => x.data.type === r[0]) })).filter((t) => t.list.length).map((t) => {
      const mine = t.list.some((r) => r.author === me());
      const names = Array.from(new Set(t.list.map((r) => r.author)));
      const c = names.length === 2 ? 'var(--text)' : col(names[0]);
      return '<button class="chip' + (mine ? ' mine' : '') + '" style="color:' + c + '" data-act="react" data-id="' + pid + '" data-type="' + t.k + '" aria-label="' + t.label + ' (' + names.join(', ') + ')" aria-pressed="' + mine + '">' + ic[t.k] + '<span>' + t.list.length + '</span></button>';
    }).join('');
    const picker = S.openPicker === pid
      ? '<div class="picker">' + L.REACTIONS.map((r) => '<button class="icon-btn lg" data-act="react" data-id="' + pid + '" data-type="' + r[0] + '" aria-label="' + r[1] + '">' + ic[r[0]] + '</button>').join('') + '</div>'
      : '';
    return '<div class="row wrap">' + chips + '<button class="btn btn-text btn-sm" data-act="togglePicker" data-id="' + pid + '">Réagir</button></div>' + picker;
  }

  function commentsBlock(pid, form) {
    const cs = Store.by('comment').filter((c) => c.data.parentId === pid);
    const list = cs.map((c) => '<div class="comment"><div class="row between small">' + who(c.author) + '<span class="row"><span class="muted">' + ago(c.created_at) + '</span>' + (c.author === me() ? menuBtn('itemMenu', c.id, 'Options du commentaire') : '') + '</span></div><p class="big">' + nl(c.data.text) + '</p></div>').join('');
    const f = form === false ? '' : '<form class="comment-form" data-form="comment" data-parent="' + pid + '"><input class="input" name="t" placeholder="Ton commentaire…" aria-label="Ton commentaire" autocomplete="off" data-draft="c' + pid + '" value="' + esc(S.drafts['c' + pid] || '') + '" required><button class="btn btn-primary" type="submit">Commenter</button></form>';
    return (list || f) ? '<div class="thread">' + list + f + '</div>' : '';
  }

  /* ---------- Accueil ---------- */
  L.views = {};
  L.views.home = () => {
    const now = new Date();
    const moms = L.momentsList().filter((x) => x.e >= now).sort((a, b) => a.s - b.s);
    const n = moms[0];
    let hero;
    if (!n) {
      hero = '<section class="card hero"><div class="eyebrow">Prochaine fois ensemble</div><p class="big">Pas encore de rencontre prévue.</p><button class="btn btn-primary" data-act="tab" data-tab="moments">Ajouter un moment ensemble</button></section>';
    } else {
      const acts = L.activitiesOf(n.id).length;
      let big;
      if (n.s <= now) {
        big = '<div class="eyebrow">En ce moment ensemble</div><p class="big">Jusqu\'au ' + fDay(n.e) + ' à ' + fHour(n.e) + '.</p>';
      } else {
        const ms = n.s - now;
        const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), mi = Math.floor((ms % 36e5) / 6e4);
        big = '<div class="eyebrow">Prochaine fois ensemble</div>' + (d >= 1
          ? '<div class="count"><span class="num">' + d + '</span><span class="unit">' + plural(d, 'jour', 'jours') + '</span></div><p class="sub">et ' + h + ' h ' + L.pad(mi) + ' min avant de se retrouver</p>'
          : '<div class="count"><span class="num">' + h + '</span><span class="unit">h</span><span class="num">' + mi + '</span><span class="unit">min</span></div><p class="sub">avant de se retrouver</p>');
      }
      hero = '<section class="card hero">' + big + '<div class="sep"></div><div class="place">' + ic.pin + esc(n.m.data.place) + '</div><p class="dates">Du ' + fDay(n.s) + ', ' + fHour(n.s) + '<br>au ' + fDay(n.e) + ', ' + fHour(n.e) + '</p>' + (acts ? '<p class="sub">' + acts + ' ' + plural(acts, "idée d'activité", "idées d'activités") + '</p>' : '') + '</section>';
    }

    const kd = Object.keys(CFG.KEY_DATES).map((k) => {
      const x = CFG.KEY_DATES[k];
      const base = parseDay(x.date);
      const a = L.anniv(base);
      return '<div class="card keydate"><div class="eyebrow">' + esc(x.concept) + '</div><div class="ref">' + esc(x.ref) + '</div><div class="sub">' + fShort(base) + ' · ' + L.since(base) + '</div><div class="sep"></div><div class="sub">Prochain anniversaire' + (a.years ? ' (' + a.years + ' ' + plural(a.years, 'an', 'ans') + ')' : '') + '</div>' +
        (a.days === 0 ? '<div class="count sm"><span class="unit">Aujourd\'hui !</span></div>' : '<div class="count sm"><span class="num">' + a.days + '</span><span class="unit">' + plural(a.days, 'jour', 'jours') + '</span></div>') + '</div>';
    }).join('');

    const trips = Store.by('trip').filter((t) => t.data.stage === 'planned').sort((a, b) => (a.data.start || '9999').localeCompare(b.data.start || '9999'));
    const tripCards = trips.map((t) => {
      const days = t.data.start ? L.daysUntil(t.data.start) : null;
      const right = days !== null && days > 0 ? '<div class="count sm"><span class="num">' + days + '</span><span class="unit">' + plural(days, 'jour', 'jours') + '</span></div>'
        : days !== null && t.data.end && L.daysUntil(t.data.end) >= 0 ? '<span class="pill-on">En cours</span>' : '';
      return '<button class="card trip-mini" data-act="openTrip" data-id="' + t.id + '"><span class="grow"><span class="h3">' + esc(t.data.name) + '</span><span class="sub block">' + (t.data.start ? fShort(parseDay(t.data.start)) : 'Dates à fixer') + '</span></span>' + right + '</button>';
    }).join('');

    return '<div class="stack">' + hero +
      '<section class="stack"><h3 class="h3">Dates à retenir</h3><div class="grid2">' + kd + '</div></section>' +
      '<section class="stack"><h3 class="h3">Voyages planifiés</h3>' + (tripCards || '<div class="card"><p class="sub">Aucun voyage planifié pour l\'instant.</p></div>') + '</section></div>';
  };

  /* ---------- Moments ensemble ---------- */
  function momentCard(x) {
    const m = x.m;
    const rows = L.activitiesOf(m.id).map((a) => {
      const at = L.assignText(a);
      return '<div class="act"><div class="grow"><div class="act-label">' + esc(a.data.label) + '</div>' + (at ? '<div class="act-assign">' + esc(at) + '</div>' : '<div class="small muted">Libre, sans date ni lieu</div>') + '</div><button class="btn btn-text btn-sm" data-act="editActivity" data-id="' + a.id + '">' + (at ? 'Modifier' : 'Assigner') + '</button></div>';
    }).join('');
    return '<article class="card stack-sm"><div class="row between"><div class="place">' + ic.pin + esc(m.data.place) + '</div>' + menuBtn('momentMenu', m.id, 'Options du moment') + '</div>' +
      '<div class="kv"><span>Début</span><span>' + fDT(x.s) + '</span><span>Fin</span><span>' + fDT(x.e) + '</span></div><div class="sep"></div>' +
      '<div class="eyebrow">Idées d\'activités</div>' + (rows || '<p class="sub">Pas encore d\'idée pour ce moment.</p>') +
      '<button class="btn btn-dashed btn-block" data-act="addActivity" data-moment="' + m.id + '">+ Idée d\'activité</button></article>';
  }
  L.views.moments = () => {
    const now = new Date();
    const all = L.momentsList();
    const up = all.filter((x) => x.e >= now).sort((a, b) => a.s - b.s);
    const past = all.length - up.length;
    return '<div class="stack">' + head('Moments ensemble', "Quand et où on se retrouve, et ce qu'on a envie d'y faire.", addBtn('addMoment')) +
      (up.map(momentCard).join('') || empty('Aucun moment à venir. Ajoute votre prochaine rencontre.')) +
      (past ? '<button class="btn btn-text" data-act="tab" data-tab="album">' + past + ' ' + plural(past, 'moment passé est', 'moments passés sont') + " dans l'Album</button>" : "<p class=\"note\">Une fois passé, un moment rejoint l'Album et devient un dossier de photos.</p>") + '</div>';
  };

  /* ---------- Idées ---------- */
  function ideaCard(it) {
    const mine = it.author === me();
    return '<article class="card stack-sm"><div class="row between small">' + who(it.author) + '<span class="row"><span class="muted">' + ago(it.created_at) + '</span>' + (mine ? menuBtn('itemMenu', it.id, "Options de l'idée") : '') + '</span></div>' +
      L.longText(it.id, it.data.text) + reactBlock(it.id) + commentsBlock(it.id) + '</article>';
  }
  L.views.ideas = () => {
    const list = Store.by('idea').slice().reverse();
    const compose = '<form class="card stack-sm" data-form="postIdea"><textarea class="input" name="t" rows="3" placeholder="Une idée pour ' + esc(other(me())) + '…" aria-label="Écrire une idée" data-draft="idea" required>' + esc(S.drafts.idea || '') + '</textarea><button class="btn btn-primary self-end" type="submit">Publier</button></form>';
    return '<div class="stack">' + head('Idées', "Des phrases à partager, que l'autre peut commenter.") + compose + (list.map(ideaCard).join('') || empty('Pas encore d\'idée. Écris la première.')) + '</div>';
  };

  /* ---------- Questionnements ---------- */
  function closedCard(q) {
    const d = q.data;
    const open = !!S.expanded['q' + q.id];
    const label = who(q.author) + '<span class="muted"> → </span>' + who(d.to);
    return '<article class="card alt stack-sm"><div class="row between"><span class="eyebrow">Clos</span><span class="row small">' + label + '</span></div>' +
      '<p class="big' + (open ? '' : ' clamp2') + '">' + nl(d.text) + '</p>' + (open ? commentsBlock(q.id, false) : '') +
      '<div class="row wrap"><button class="btn btn-ghost btn-sm" data-act="toggleQ" data-id="q' + q.id + '">' + (open ? 'Masquer la conversation' : 'Voir la conversation') + '</button><button class="btn btn-text btn-sm" data-act="qReopen" data-id="' + q.id + '">Rouvrir</button>' + (q.author === me() ? menuBtn('itemMenu', q.id, 'Options du questionnement') : '') + '</div></article>';
  }
  function questionCard(q) {
    if (q.data.closed) return closedCard(q);
    const d = q.data, to = d.to, st = d.status || 'open', mine = q.author === me(), iAmTo = me() === to;
    const answering = !!S.answering[q.id];
    const btn = (act, label, cls) => '<button class="btn ' + cls + '" data-act="' + act + '" data-id="' + q.id + '">' + label + '</button>';
    let body = '';
    if (iAmTo) {
      if (st === 'answered') {
        body = commentsBlock(q.id, true) + '<div class="row wrap">' + btn('qPause', "J'ai besoin de temps", 'btn-text btn-sm') + '</div>';
      } else if (st === 'paused') {
        body = commentsBlock(q.id, false) + '<p class="sub2">Tu as annoncé avoir besoin de temps. La conversation attend, sans pression.</p>' + btn('qResume', 'Reprendre la conversation', 'btn-primary btn-block');
      } else if (answering) {
        body = commentsBlock(q.id, true) + btn('qCancel', 'Pas maintenant', 'btn-text btn-sm');
      } else if (st === 'think') {
        body = '<p class="sub2">Tu réfléchis. La question reste là, sans compteur ni rappel.</p><div class="stack-sm">' + btn('qNow', 'Répondre maintenant', 'btn-primary btn-block') + btn('qDecline', 'Je préfère ne pas répondre', 'btn-ghost btn-block') + '</div>';
      } else if (st === 'decline') {
        body = '<p class="sub2">Tu as préféré ne pas répondre. C\'est entendu, tu peux reprendre la question quand tu veux.</p><div class="stack-sm">' + btn('qThink', 'Finalement, je réfléchis', 'btn-ghost btn-block') + btn('qNow', 'Répondre maintenant', 'btn-ghost btn-block') + '</div>';
      } else {
        body = '<div class="stack-sm">' + btn('qNow', 'Répondre maintenant', 'btn-primary btn-block') + btn('qThink', 'Je réfléchis', 'btn-ghost btn-block') + btn('qDecline', 'Je préfère ne pas répondre', 'btn-ghost btn-block') + '<p class="note">Aucune pression, tu peux changer d\'avis à tout moment.</p></div>';
      }
    } else {
      if (st === 'answered') body = commentsBlock(q.id, true);
      else if (st === 'paused') body = commentsBlock(q.id, false) + '<p class="sub2">' + esc(to) + ' a besoin de temps. La conversation reprendra quand ' + esc(to) + ' le voudra.</p>';
      else if (st === 'think') body = '<p class="sub2">' + esc(to) + ' réfléchit. La question reste là, sans pression.</p>';
      else if (st === 'decline') body = '<p class="sub2">' + esc(to) + ' a préféré ne pas répondre. C\'est tout à fait OK.</p>';
      else body = '<p class="sub2">La question est posée. ' + esc(to) + ' y répondra à son rythme.</p>';
    }
    const label = iAmTo ? who(q.author) + '<span class="muted"> te demande</span>' : '<span class="muted">Tu as demandé à </span>' + who(to);
    return '<article class="card alt stack-sm"><div class="row between"><span class="eyebrow warm">Questionnement</span><span class="row small">' + label + (mine ? menuBtn('itemMenu', q.id, 'Options du questionnement') : '') + '</span></div>' +
      L.longText(q.id, d.text) + body + '<button class="btn btn-text btn-sm self-start" data-act="qClose" data-id="' + q.id + '">Clore ce questionnement</button></article>';
  }
  L.views.questions = () => {
    const all = Store.by('question').slice().reverse();
    const list = all.filter((q) => !q.data.closed);
    const closed = all.filter((q) => q.data.closed);
    const compose = '<form class="card stack-sm" data-form="postQuestion"><textarea class="input" name="t" rows="3" placeholder="Un questionnement pour ' + esc(other(me())) + '…" aria-label="Poser un questionnement" data-draft="question" required>' + esc(S.drafts.question || '') + '</textarea><button class="btn btn-primary self-end" type="submit">Poser</button></form>';
    return '<div class="stack">' + head('Questionnements', "Des questions plus intimes, posées à l'autre. Sans pression, à son rythme.") + compose + (list.map(questionCard).join('') || empty(closed.length ? 'Aucun questionnement en cours.' : 'Aucun questionnement pour l\'instant.')) +
      (closed.length ? '<button class="btn btn-ghost btn-block" data-act="toggleClosed">' + (S.showClosed ? 'Masquer' : 'Voir') + ' les questionnements clos (' + closed.length + ')</button>' + (S.showClosed ? closed.map(closedCard).join('') : '') : '') + '</div>';
  };

  /* ---------- Voyages ---------- */
  const stageTrack = (planned) => planned
    ? '<div class="track"><span class="stage">Idée</span><span class="line on"></span><span class="stage on">Planifié</span></div>'
    : '<div class="track"><span class="stage on-light">Idée</span><span class="line"></span><span class="stage">Planifié</span></div>';
  const tripDates = (d) => d.start ? fShort(parseDay(d.start)) + (d.end ? ' → ' + fShort(parseDay(d.end)) : '') : 'Dates à fixer';

  function tripCard(t) {
    const d = t.data, planned = d.stage === 'planned';
    const b = L.budget(t.id);
    const days = planned && d.start ? L.daysUntil(d.start) : null;
    return '<article class="card ' + (planned ? '' : 'dashed') + ' stack-sm">' + stageTrack(planned) +
      '<div class="row between"><div class="grow"><div class="h3">' + esc(d.name) + '</div><div class="sub">' + tripDates(d) + '</div>' + (b.total ? '<div class="sub">' + (planned ? 'Budget' : 'Budget estimé') + ' : ' + euro(b.total) + '</div>' : '') + (!planned && d.notes ? '<div class="sub2">' + esc(d.notes) + '</div>' : '') + '</div>' +
      (days !== null && days > 0 ? '<div class="count sm"><span class="num">' + days + '</span><span class="unit">' + plural(days, 'jour', 'jours') + '</span></div>' : '') + '</div>' +
      '<div class="row wrap">' + (planned ? '' : '<button class="btn btn-primary" data-act="ready" data-id="' + t.id + '">On est prêts, on planifie</button>') + '<button class="btn btn-ghost" data-act="openTrip" data-id="' + t.id + '">Ouvrir</button></div></article>';
  }
  function tripList() {
    const all = Store.by('trip');
    const planned = all.filter((t) => t.data.stage === 'planned').sort((a, b) => (a.data.start || '9999').localeCompare(b.data.start || '9999'));
    const ideas = all.filter((t) => t.data.stage !== 'planned');
    return '<div class="stack">' + head('Voyages', "Une idée se précise peu à peu, jusqu'au jour où elle devient un voyage planifié.", addBtn('addTrip')) +
      '<section class="stack"><div class="eyebrow">Planifiés</div>' + (planned.map(tripCard).join('') || '<p class="sub">Aucun voyage planifié pour l\'instant.</p>') + '</section>' +
      '<section class="stack"><div class="eyebrow">Idées</div>' + (ideas.map(tripCard).join('') || '<p class="sub">Aucune idée de voyage pour l\'instant.</p>') + '</section></div>';
  }

  const bar = (label, val, max, color) => '<div class="bar-row"><div class="row between"><span style="color:' + color + '">' + label + '</span><b>' + euro(val) + '</b></div><div class="bar"><i style="width:' + Math.max(0, Math.min(100, Math.round((val / max) * 100))) + '%;background:' + color + '"></i></div></div>';

  function expenseRow(e) {
    const d = e.data;
    const det = L.detailLine(d);
    const dt = d.date ? L.fDateTime(d.date, d.time) : '';
    return '<button class="exp" data-act="editExpense" data-id="' + e.id + '"><span class="grow"><span class="exp-label">' + esc(d.label) + '</span>' + (dt ? '<span class="exp-date">' + esc(dt) + '</span>' : '') + (det ? '<span class="exp-det">' + esc(det) + '</span>' : '') +
      '<span class="exp-tags"><span style="color:' + col(d.paidBy) + '">Payé par ' + esc(d.paidBy) + '</span><span class="tag">' + (d.scope === 'both' ? 'Nous deux' : 'Rien que pour ' + esc(d.scope)) + '</span></span></span><span class="exp-amt">' + euro(d.amount) + '</span></button>';
  }

  function settleBlock(t, b) {
    if (!b.shared) return '';
    if (!b.creditor) return '<section class="card stack-sm"><div class="eyebrow">Se rembourser</div><p class="sub">Tout est équilibré, personne ne doit rien à l\'autre.</p></section>';
    const marks = (t.data.paid || []).filter((p) => p.by === b.debtor);
    const paidSum = round2(marks.reduce((s, p) => s + p.amount, 0));
    const remaining = round2(b.due - paidSum);
    const link = t.data.payLink && t.data.payLink.by === b.creditor ? t.data.payLink.url : '';
    const iAmDebtor = me() === b.debtor;
    let h = '<div class="eyebrow">Se rembourser</div><p class="h3">' + esc(b.debtor) + ' doit ' + euro(b.due) + ' à ' + esc(b.creditor) + '</p>';
    if (remaining <= 0 && marks.length) {
      h += '<div class="okline">' + ic.check + '<span>' + esc(b.debtor) + ' a indiqué avoir payé ' + euro(paidSum) + '. C\'est réglé.</span></div>';
      if (iAmDebtor) h += '<button class="btn btn-text btn-sm" data-act="unmarkPaid" data-id="' + t.id + '">Annuler</button>';
    } else {
      if (paidSum > 0) h += '<div class="okline">' + ic.check + '<span>' + esc(b.debtor) + ' a déjà indiqué avoir payé ' + euro(paidSum) + '. Reste ' + euro(remaining) + '.</span></div>';
      if (iAmDebtor) {
        h += link ? '<a class="btn btn-primary btn-block" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">Payer ' + esc(b.creditor) + '</a>' : '<p class="sub">' + esc(b.creditor) + " n'a pas encore ajouté de lien de paiement.</p>";
        h += '<button class="btn btn-ghost btn-block" data-act="markPaid" data-id="' + t.id + '">J\'ai payé ' + euro(remaining) + '</button>';
        if (paidSum > 0) h += '<button class="btn btn-text btn-sm" data-act="unmarkPaid" data-id="' + t.id + '">Annuler</button>';
      } else {
        h += '<form class="stack-sm" data-form="payLink" data-id="' + t.id + '" data-by="' + esc(b.creditor) + '"><label class="field"><span>Ton lien de paiement</span><input class="input" type="url" name="url" placeholder="https://…" value="' + esc(link) + '" inputmode="url"></label><button class="btn btn-ghost btn-block" type="submit">Enregistrer le lien</button></form>' +
          '<p class="small muted">' + esc(b.debtor) + ' le verra ici et pourra indiquer « J\'ai payé ».</p>';
      }
    }
    if (paidSum > 0 && !iAmDebtor && link) h += '';
    return '<section class="card stack-sm">' + h + '</section>';
  }

  function budgetBlock(t, planned) {
    const b = L.budget(t.id);
    const cats = L.CATS.map((c) => {
      const rows = b.ex.filter((e) => e.data.category === c.k).sort(L.byDate);
      const sub = round2(sumAmt(rows));
      return '<div class="cat"><div class="row between"><h4 class="cat-title">' + c.label + (rows.length ? ' <span class="muted">· ' + euro(sub) + '</span>' : '') + '</h4><button class="btn btn-text btn-sm" data-act="addExpense" data-trip="' + t.id + '" data-cat="' + c.k + '">+ Ajouter</button></div>' + rows.map(expenseRow).join('') + '</div>';
    }).join('');
    let summary = '<div><div class="eyebrow warm">' + (planned ? 'Budget global' : 'Budget estimé') + '</div><p class="total">' + euro(b.total) + '</p></div>';
    if (b.total) {
      const lines = [];
      if (b.shared) lines.push('Dépenses pour nous deux : ' + euro(b.shared) + ', soit ' + euro(b.half) + ' chacun.');
      NAMES.forEach((n) => { if (b.solo[n]) lines.push('Rien que pour ' + n + ' : ' + euro(b.solo[n]) + ' (hors remboursement).'); });
      summary += '<p class="sub">' + lines.join('<br>') + '</p>';
      const maxPer = Math.max(b.per.Ange, b.per.Leeamm, 1);
      summary += '<div class="stack-sm"><div class="eyebrow">Ce que chacun paie au total</div>' + NAMES.map((n) => bar(esc(n), b.per[n], maxPer, col(n))).join('') + '</div>';
      if (b.shared) {
        const maxAdv = Math.max(b.adv.Ange, b.adv.Leeamm, b.half, 1);
        summary += '<div class="stack-sm"><div class="eyebrow">Avancé sur les dépenses partagées</div>' + NAMES.map((n) => bar(esc(n) + ' a avancé', b.adv[n], maxAdv, col(n))).join('') + bar('Part de chacun', b.half, maxAdv, 'var(--orange-text)') + '</div>';
      }
    } else {
      summary += '<p class="sub">Ajoute les dépenses prévues pour voir ce que chacun paie.</p>';
    }
    return '<section class="card stack">' + summary + '<div class="sep"></div>' + cats + '<p class="small muted">Une dépense « rien que pour » une personne compte dans le budget global, mais pas dans ce que l\'un demande à l\'autre.</p></section>';
  }

  function tripDetail(t) {
    const d = t.data, planned = d.stage === 'planned';
    const b = L.budget(t.id);
    const days = planned && d.start ? L.daysUntil(d.start) : null;
    const missing = [];
    if (!d.start) missing.push('dates');
    if (!b.ex.some((e) => e.data.category === 'transport')) missing.push('transports');
    if (!b.ex.some((e) => e.data.category === 'lodging')) missing.push('hébergement');
    const top = '<div class="row between"><button class="btn btn-text btn-sm" data-act="backTrips">' + ic.back + ' Voyages</button>' + menuBtn('tripMenu', t.id, 'Options du voyage') + '</div>';
    const headCard = '<section class="card stack-sm">' + stageTrack(planned) + '<h2 class="h2">' + esc(d.name) + '</h2><div class="sub">' + tripDates(d) + '</div>' +
      (days !== null && days > 0 ? '<div class="count"><span class="num">' + days + '</span><span class="unit">' + plural(days, 'jour', 'jours') + '</span></div>' : '') +
      (d.notes ? '<p class="sub2">' + nl(d.notes) + '</p>' : '') +
      (planned ? '' : '<p class="small muted">Tant que vous n\'avez pas cliqué « On est prêts », ça reste une idée : tu peux déjà ajouter dates, notes et dépenses estimées.</p><button class="btn btn-primary btn-block" data-act="ready" data-id="' + t.id + '">On est prêts, on planifie</button>') + '</section>';
    const synth = planned
      ? '<section class="card stack-sm"><div class="eyebrow">Synthèse</div><p class="sub">Un PDF qui rassemble dates, réservations, budget et remboursements, pour rester organisés pendant le voyage.</p>' + (missing.length ? '<p class="small muted">Il manque encore : ' + missing.join(', ') + '.</p>' : '') + '<button class="btn btn-primary btn-block" data-act="synth" data-id="' + t.id + '">Créer la synthèse PDF</button></section>'
      : '<p class="note">La synthèse PDF et le remboursement seront disponibles une fois le voyage planifié.</p>';
    const shows = Store.by('show').filter((s) => s.data.tripId === t.id).sort(L.byDate);
    const linked = shows.length ? '<section class="card stack-sm"><div class="eyebrow">Concerts liés</div>' + shows.map((s) => '<button class="exp" data-act="openShow" data-id="' + s.id + '"><span class="grow"><span class="exp-label">' + esc(s.data.title) + '</span><span class="exp-det">' + esc(L.fDateTime(s.data.date, s.data.time)) + (s.data.venue ? ' · ' + esc(s.data.venue) : '') + '</span></span></button>').join('') + '</section>' : '';
    return '<div class="stack">' + top + headCard + budgetBlock(t, planned) + (planned ? settleBlock(t, b) : '') + linked + synth + '</div>';
  }
  L.views.trips = () => {
    const t = S.tripId && Store.get(S.tripId);
    if (S.tripId && !t) S.tripId = null;
    return t ? tripDetail(t) : tripList();
  };

  /* Document de synthèse (PDF) */
  L.synthHtml = (t) => {
    const d = t.data, b = L.budget(t.id);
    const secs = L.CATS.map((c) => {
      const rows = b.ex.filter((e) => e.data.category === c.k).sort(L.byDate);
      if (!rows.length) return '';
      const trs = rows.map((e) => {
        const det = e.data.details || {};
        const lines = c.fields.filter((f) => det[f.k]).map((f) => {
          let v = det[f.k];
          if (f.type === 'datetime-local') { const dd = new Date(v); if (!isNaN(dd)) v = fDT(dd); }
          return esc(f.l) + ' : ' + esc(v);
        }).join('<br>');
        return '<tr><td><b>' + esc(e.data.label) + '</b>' + (lines ? '<div class="s-det">' + lines + '</div>' : '') + '</td><td>' + (e.data.date ? esc(L.fDateTime(e.data.date, e.data.time)) : '') + '</td><td>' + esc(e.data.paidBy) + '</td><td>' + (e.data.scope === 'both' ? 'Nous deux' : 'Rien que ' + esc(e.data.scope)) + '</td><td class="r">' + euro(e.data.amount) + '</td></tr>';
      }).join('');
      return '<h3>' + c.label + '</h3><table><thead><tr><th>Détail</th><th>Date</th><th>Payé par</th><th>Pour</th><th class="r">Montant</th></tr></thead><tbody>' + trs + '</tbody></table>';
    }).join('');
    const agenda = b.ex.filter((e) => e.data.details && e.data.details.when).map((e) => ({ when: new Date(e.data.details.when), e })).filter((x) => !isNaN(x.when)).sort((a, c) => a.when - c.when)
      .map((x) => '<li><b>' + fDT(x.when) + '</b> : ' + esc(x.e.data.label) + (L.detailLine(x.e.data) ? ' (' + esc(L.detailLine(x.e.data)) + ')' : '') + '</li>').join('');
    let settle = '';
    if (b.shared) {
      if (!b.creditor) settle = '<p>Tout est équilibré : personne ne doit rien à l\'autre.</p>';
      else {
        const marks = (t.data.paid || []).filter((p) => p.by === b.debtor);
        const paidSum = round2(marks.reduce((s, p) => s + p.amount, 0));
        const link = t.data.payLink && t.data.payLink.by === b.creditor ? t.data.payLink.url : '';
        settle = '<p><b>' + esc(b.debtor) + ' doit ' + euro(b.due) + ' à ' + esc(b.creditor) + '.</b> ' + (paidSum >= b.due ? 'Réglé.' : paidSum > 0 ? 'Déjà indiqué comme payé : ' + euro(paidSum) + '.' : 'Pas encore réglé.') + '</p>' + (link ? '<p>Lien de paiement : ' + esc(link) + '</p>' : '');
      }
    }
    return '<div class="paper"><div class="s-top"><div class="s-brand">Leeamm X Ange</div><div class="s-date">Généré le ' + fDayY(new Date()) + '</div></div>' +
      '<h1>' + esc(d.name) + '</h1><p class="s-dates">' + esc(tripDates(d)) + '</p>' + (d.notes ? '<p>' + nl(d.notes) + '</p>' : '') +
      (agenda ? '<h3>Calendrier</h3><ul>' + agenda + '</ul>' : '') + secs +
      '<h3>Budget</h3><table><tbody><tr><td>Budget global</td><td class="r"><b>' + euro(b.total) + '</b></td></tr>' + (b.shared ? '<tr><td>Dépenses pour nous deux</td><td class="r">' + euro(b.shared) + ' (' + euro(b.half) + ' chacun)</td></tr>' : '') +
      NAMES.map((n) => b.solo[n] ? '<tr><td>Rien que pour ' + n + '</td><td class="r">' + euro(b.solo[n]) + '</td></tr>' : '').join('') +
      '<tr><td>Total pour Ange</td><td class="r">' + euro(b.per.Ange) + '</td></tr><tr><td>Total pour Leeamm</td><td class="r">' + euro(b.per.Leeamm) + '</td></tr></tbody></table>' + settle + '</div>';
  };

  /* ---------- Musique ---------- */
  function songCard(s) {
    const d = s.data;
    return '<article class="card stack-sm"><div class="row song"><div class="cover">' + L.trackCover(d) + '</div><div class="grow"><div class="h3">' + esc(d.title) + '</div><div class="sub">' + esc(d.artist) + '</div><div class="small">' + who(s.author) + ' <span class="muted">· ' + ago(s.created_at) + '</span></div></div>' + (s.author === me() ? menuBtn('itemMenu', s.id, 'Options du morceau') : '') + '</div>' +
      '<a class="btn btn-primary btn-block" href="' + esc(L.trackUrl(d)) + '" target="_blank" rel="noopener noreferrer">' + ic.play + ' Écouter sur ' + L.platLabel() + '</a></article>';
  }
  L.views.music = () => {
    const list = Store.by('song').slice().reverse();
    return '<div class="stack">' + head('Musique', "Cherche un morceau : chacun l'écoute sur sa plateforme.", addBtn('addSong')) + (list.map(songCard).join('') || empty('Aucun morceau pour l\'instant.')) + '</div>';
  };

  /* ---------- Album ---------- */
  function tile(p) {
    const act = p.data.activityId ? Store.get(p.data.activityId) : null;
    const date = fShort(parseDay(p.data.date));
    return '<div class="tile-wrap"><button class="tile" data-act="openPhoto" data-id="' + p.id + '" aria-label="Ouvrir la photo du ' + date + '"><img data-path="' + esc(p.data.thumb) + '" alt="" loading="lazy"></button><div class="tile-date">' + date + '</div>' +
      (p.data.caption ? '<div class="tile-cap">' + esc(p.data.caption) + '</div>' : '') + (act ? '<div class="tile-act">' + esc(act.data.label) + '</div>' : '') + '</div>';
  }
  L.views.album = () => {
    const now = new Date();
    const moments = L.momentsList();
    const byZone = {};
    const none = [];
    Store.by('photo').forEach((p) => {
      const m = L.effMoment(p);
      if (m) (byZone[m.id] = byZone[m.id] || []).push(p); else none.push(p);
    });
    const sortP = (a) => a.slice().sort((x, y) => x.data.date.localeCompare(y.data.date));
    const zones = moments.filter((x) => x.e < now || byZone[x.id]).sort((a, b) => b.s - a.s).map((x) => {
      const ps = sortP(byZone[x.id] || []);
      return '<section class="stack-sm"><div class="row between"><div class="grow"><div class="zone-title">' + esc(x.m.data.place) + '</div><div class="sub">' + fShort(x.s) + (L.ymd(x.s) !== L.ymd(x.e) ? ' – ' + fShort(x.e) : '') + ' · ' + ps.length + ' ' + plural(ps.length, 'photo', 'photos') + '</div></div><button class="btn btn-ghost btn-sm" data-act="pickPhotos" data-moment="' + x.id + '">+ Photos</button></div>' +
        (ps.length ? '<div class="grid3">' + ps.map(tile).join('') + '</div>' : '<p class="sub">Aucune photo pour l\'instant. Glisse-en ici.</p>') + '</section>';
    }).join('');
    const orphan = none.length ? '<section class="stack-sm"><div class="grow"><div class="zone-title">Sans moment associé</div><div class="sub">Photos dont la date ne correspond à aucune rencontre</div></div><div class="grid3">' + sortP(none).map(tile).join('') + '</div></section>' : '';
    return '<div class="stack">' + head('Album', 'Nos souvenirs, rangés automatiquement par moment selon la date.', addBtn('pickPhotos', 'Ajouter', 'data-moment=""')) + (zones + orphan || empty('Pas encore de photo. Les moments passés apparaîtront ici comme des albums.')) + '</div>';
  };

  /* ---------- Fichiers ---------- */
  L.folderPath = (id) => {
    const names = [];
    let cur = id ? Store.get(id) : null, guard = 0;
    while (cur && guard++ < 20) { names.unshift(cur.data.name); cur = cur.data.parentId ? Store.get(cur.data.parentId) : null; }
    return names.join(' / ');
  };
  function fileCard(f) {
    const d = f.data;
    const meta = '<div class="small">' + who(f.author) + ' <span class="muted">· ' + L.fileSize(d.size || 0) + ' · ' + ago(f.created_at) + '</span></div>';
    const menu = menuBtn('fileMenu', f.id, 'Options du fichier');
    if (d.type === 'audio') return '<article class="card stack-sm"><div class="row between"><div class="grow"><div class="h3">' + esc(d.name) + '</div>' + meta + '</div>' + menu + '</div><audio controls preload="none" data-path="' + esc(d.path) + '"></audio></article>';
    return '<article class="card"><div class="row"><div class="fileic">' + ic.file + '</div><div class="grow"><div class="h3">' + esc(d.name) + '</div>' + meta + '</div>' + menu + '</div><div class="row" style="margin-top:12px"><a class="btn btn-ghost btn-block" href="#" target="_blank" rel="noopener noreferrer" data-path="' + esc(d.path) + '">' + (d.type === 'pdf' ? 'Ouvrir le PDF' : 'Ouvrir / télécharger') + '</a></div></article>';
  }
  L.views.files = () => {
    let fid = S.folderId || '';
    const cur = fid ? Store.get(fid) : null;
    if (fid && !cur) { S.folderId = ''; fid = ''; }
    const here = (x) => (x.data.folderId || '') === fid;
    const folders = Store.by('folder').filter((f) => (f.data.parentId || '') === fid).sort((a, b) => a.data.name.localeCompare(b.data.name, 'fr'));
    const fs = Store.by('file').filter(here).slice().reverse();
    const au = fs.filter((f) => f.data.type === 'audio');
    const rest = fs.filter((f) => f.data.type !== 'audio');

    const chain = [];
    let c = cur, guard = 0;
    while (c && guard++ < 20) { chain.unshift(c); c = c.data.parentId ? Store.get(c.data.parentId) : null; }
    const crumbs = cur ? '<nav class="crumbs" aria-label="Chemin"><button data-act="openFolder" data-id="">Fichiers</button>' + chain.map((x, i) => '<span aria-hidden="true">›</span>' + (i === chain.length - 1 ? '<b>' + esc(x.data.name) + '</b>' : '<button data-act="openFolder" data-id="' + x.id + '">' + esc(x.data.name) + '</button>')).join('') + '</nav>' : '';

    const folderRows = folders.map((f) => {
      const n = Store.by('file').filter((x) => x.data.folderId === f.id).length + Store.by('folder').filter((x) => x.data.parentId === f.id).length;
      return '<div class="row"><button class="folder grow" data-act="openFolder" data-id="' + f.id + '">' + ic.folder + '<span class="grow"><b>' + esc(f.data.name) + '</b><span class="sub block">' + n + ' ' + plural(n, 'élément', 'éléments') + '</span></span></button>' + menuBtn('folderMenu', f.id, 'Options du dossier') + '</div>';
    }).join('');

    const btns = '<div class="row wrap end"><button class="btn btn-ghost" data-act="addFolder">Nouveau dossier</button>' + addBtn('pickFiles') + '</div>';
    return '<div class="stack">' + head(cur ? esc(cur.data.name) : 'Fichiers', cur ? 'Un dossier de ' + esc(cur.author) + '.' : "Enregistrements, documents utiles, et tout ce qu'on veut se transmettre.", '') + crumbs + btns +
      (folderRows ? '<div class="stack-sm">' + folderRows + '</div>' : '') +
      (au.length ? '<div class="eyebrow">Enregistrements</div>' + au.map(fileCard).join('') : '') +
      (rest.length ? '<div class="eyebrow">Documents</div>' + rest.map(fileCard).join('') : '') +
      (!folders.length && !fs.length ? empty(cur ? 'Ce dossier est vide.' : 'Aucun fichier pour l\'instant.') : '') + '</div>';
  };
})();
