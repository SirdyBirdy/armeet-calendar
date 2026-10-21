/* Booking flow logic. Wording and clinic details live in config.js. */
(() => {
  'use strict';
  const SITE = window.SITE, T = SITE.text, TZ = 'Asia/Kolkata';
  const $ = q => document.querySelector(q), $$ = q => [...document.querySelectorAll(q)];

  /* ---------- helpers ---------- */
  const pad = n => String(n).padStart(2, '0');
  const fromKey = ds => new Date(ds + 'T00:00:00Z');
  const dayLong = ds => fromKey(ds).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const dayShort = ds => fromKey(ds).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const fmtT = ms => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ }).replace(/\u202f/g, ' ');
  const fmtBy = ms => new Date(ms).toLocaleString('en', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: TZ }).replace(/\u202f/g, ' ');
  const istDate = ms => new Date(ms + 19800000).toISOString().slice(0, 10);
  const policyHtml = () => `<ul>${T.policy.items.map(t => `<li>${t}</li>`).join('')}</ul><p>${T.policy.closing}</p>`;
  const qrSvg = text => { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0 }); };
  const payee = (c, ds) => ({ ...c.payment, ...(c.payment.byDay && c.payment.byDay[fromKey(ds).getUTCDay() || 7]) });

  /* ---------- API (falls back to demo data while apiUrl is empty) ---------- */
  const api = {
    async call(url, opts) {
      let r;
      try { r = await (await fetch(url, opts)).json(); } catch (e) { throw new Error(T.errorNetwork); }
      if (r.error) throw Object.assign(new Error(r.error), { code: r.code });
      return r;
    },
    availability: (id, mv) => SITE.apiUrl
      ? api.call(`${SITE.apiUrl}?action=availability&clinic=${encodeURIComponent(id)}` + (mv ? `&id=${encodeURIComponent(mv.id)}&t=${encodeURIComponent(mv.token)}` : ''))
      : demo.availability(id, mv),
    lookup: (id, t) => SITE.apiUrl ? api.call(`${SITE.apiUrl}?action=lookup&id=${encodeURIComponent(id)}&t=${encodeURIComponent(t)}`) : demo.lookup(),
    post: body => SITE.apiUrl
      ? api.call(SITE.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      : demo.post(body),
  };

  /* ---------- state ---------- */
  const SINGLE = SITE.clinics.length === 1;
  const IDS = SINGLE ? [1, 2, 3, 4] : [0, 1, 2, 3, 4];
  const S = { s: 1, clinic: null, avail: null, date: null, slot: null, month: null, booking: null, notice: '', moving: null };
  let busy = false;
  const head = s => ({ 0: T.headings.clinic, 1: SINGLE ? T.headings.timeFirst : T.headings.time, 2: T.headings.details, 3: T.headings.pay, 5: T.headings.cancel })[s];
  const formOk = () => $('#fn').value.trim() && /\S+@\S+\.\S+/.test($('#fe').value) && $('#fp').value.replace(/\D/g, '').length >= 10 && $('#fc').checked;

  /* ---------- render ---------- */
  function renderClinics() {
    $('#clinics').innerHTML = SITE.clinics.map((c, i) =>
      `<button class="card" data-i="${i}"><h3>${c.label}</h3><p>${c.address}</p><div class="meta">${c.daysLabel}</div></button>`).join('');
    $$('.card').forEach(b => b.onclick = () => {
      S.clinic = SITE.clinics[b.dataset.i]; S.date = S.slot = null;
      $$('.card').forEach(x => x.classList.toggle('sel', x === b)); upd();
    });
  }

  function setMonth() {
    const ds = S.date || Object.keys(S.avail.days).sort()[0] || S.avail.from;
    S.month = { y: +ds.slice(0, 4), m: +ds.slice(5, 7) - 1 };
  }

  function renderCal() {
    const box = $('#cal');
    if (!S.avail || S.avail.error) {
      $('#prev').disabled = $('#nextm').disabled = true; $('#month').textContent = '';
      box.innerHTML = `<p class="hint wide">${S.avail ? T.errorLoad : 'Loading times...'}</p>`;
      return;
    }
    const { y, m } = S.month, first = new Date(Date.UTC(y, m, 1)).getUTCDay(), n = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    $('#month').textContent = new Date(Date.UTC(y, m, 1)).toLocaleString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    let h = 'SMTWTFS'.split('').map(d => `<b>${d}</b>`).join('') + '<span></span>'.repeat(first);
    for (let d = 1; d <= n; d++) {
      const ds = `${y}-${pad(m + 1)}-${pad(d)}`;
      h += S.avail.days[ds]
        ? `<button class="${S.date === ds ? 'sel' : ''}" data-d="${ds}" aria-label="${dayLong(ds)}">${d}</button>`
        : `<span class="off">${d}</span>`;
    }
    box.innerHTML = h;
    $$('#cal button').forEach(b => b.onclick = () => { S.date = b.dataset.d; S.slot = null; S.notice = ''; renderCal(); renderSlots(); upd(); });
    const mi = y * 12 + m, f = S.avail.from, u = S.avail.until;
    $('#prev').disabled = mi <= +f.slice(0, 4) * 12 + +f.slice(5, 7) - 1;
    $('#nextm').disabled = mi >= +u.slice(0, 4) * 12 + +u.slice(5, 7) - 1;
  }

  function renderSlots() {
    const box = $('#slots');
    if (!S.date) {
      $('#dayLabel').textContent = 'Select a date';
      box.innerHTML = S.avail && !S.avail.error && !Object.keys(S.avail.days).length ? `<p class="hint">${T.noTimes}</p>` : '';
      return;
    }
    $('#dayLabel').textContent = dayLong(S.date);
    const list = S.avail.days[S.date] || [];
    box.innerHTML = list.map((s, n) =>
      `<button class="slot${S.slot && S.slot.i === s.i ? ' sel' : ''}" data-n="${n}">${fmtT(s.start)}<small>to ${fmtT(s.end)}</small></button>`).join('');
    $$('.slot').forEach(b => b.onclick = () => { S.slot = list[b.dataset.n]; S.notice = ''; renderSlots(); upd(); });
  }

  async function loadAvail() {
    S.avail = null; renderCal(); renderSlots(); upd();
    try { S.avail = await api.availability(S.clinic.id, S.moving); } catch (e) { S.avail = { error: e.message, days: {} }; }
    if (!S.avail.error) {
      const offered = S.date && S.avail.days[S.date];
      if (!offered) S.date = S.slot = null;
      else if (S.slot) S.slot = offered.find(s => s.i === S.slot.i) || null;
      setMonth();
    }
    renderCal(); renderSlots(); upd();
  }

  function upd() {
    $$('.step').forEach(e => e.classList.toggle('on', +e.dataset.s === S.s));
    $$('#steps i').forEach((e, k) => e.classList.toggle('on', IDS[k] <= S.s));
    $('#steps').hidden = S.s === 5 || !!S.moving;
    const mv = !!S.moving && S.s === 1;
    const last = S.s === 4;
    $('#title').style.display = $('#lead').style.display = last ? 'none' : '';
    const h = mv ? T.headings.reschedule : head(S.s); if (h) { $('#title').textContent = h[0]; $('#lead').textContent = h[1]; }
    if (S.clinic) {
      $('#sum1').textContent = `${(S.avail && S.avail.daysLabel) || S.clinic.daysLabel} \u00B7 ${S.clinic.address}`;
      if (S.slot) $('#sum2').textContent = `${dayShort(S.date)} at ${fmtT(S.slot.start)} \u00B7 ${S.clinic.address}`;
    }
    $('#notice').textContent = S.s === 1 ? S.notice : '';
    const early = S.s <= 2;
    $('#bar').style.display = early ? 'flex' : 'none';
    $('#back').style.visibility = (S.s > IDS[0] && early) || mv ? 'visible' : 'hidden';
    $('#next').textContent = busy ? (S.moving ? 'Moving...' : 'Booking...') : mv ? 'Move session' : S.s === 2 ? 'Continue to Payment' : 'Continue';
    $('#next').disabled = busy || (S.s === 0 && !S.clinic) || (S.s === 1 && !S.slot) || (S.s === 2 && !formOk());
  }

  function goto(n) {
    S.s = n;
    if (n === 1) loadAvail();
    if (n === 3) renderPay();
    if (n === 4) renderDone();
    upd(); scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- booking ---------- */
  async function confirmBooking() {
    busy = true; $('#err').textContent = ''; upd();
    try {
      const r = await api.post({
        action: 'book', clinic: S.clinic.id, date: S.date, i: S.slot.i,
        name: $('#fn').value.trim(), email: $('#fe').value.trim(), phone: $('#fp').value.trim(), notes: $('#fm').value.trim(), website: $('#hp').value,
      });
      S.booking = { ...r, date: S.date, clinic: S.clinic };
      busy = false; goto(3);
    } catch (e) {
      busy = false;
      if (e.code === 'taken') { S.notice = T.taken; S.slot = null; goto(1); }
      else { $('#err').textContent = e.message; upd(); }
    }
  }

  function renderPay() {
    const b = S.booking, p = payee(b.clinic, b.date);
    $('#sum3').textContent = `${dayShort(b.date)} \u00B7 ${fmtT(b.start)} to ${fmtT(b.end)} \u00B7 ${b.clinic.address}`;
    const link = p.link || `upi://pay?pa=${p.vpa}&pn=${encodeURIComponent(p.name)}&cu=INR`;
    $('#pay').innerHTML = `<div class="qr">${p.qrImage ? `<img id="qrimg" src="${p.qrImage}" alt="UPI QR code">` : qrSvg(link)}</div>
      ${p.caption ? `<p class="cap">${p.caption}</p>` : ''}
      ${p.vpa ? `<div class="vpa"><span>${p.vpa}</span><button id="copy">Copy</button></div>` : ''}
      <a class="btn" href="${link}">Pay with UPI</a>
      <p class="small">${T.payNote}</p>`;
    $('#held').textContent = b.payBy ? T.heldNote.replace('{deadline}', fmtBy(b.payBy)) : T.heldNoteOpen;
    const img = $('#qrimg'); if (img) img.onerror = () => { $('.qr').innerHTML = qrSvg(link); }; // image missing: generate from the link
    if (p.vpa) $('#copy').onclick = async e => { try { await navigator.clipboard.writeText(p.vpa); e.target.textContent = 'Copied'; } catch { e.target.textContent = 'Select and copy'; } };
  }

  function renderDone() {
    const b = S.booking, z = ms => new Date(ms).toISOString().replace(/[-:]|\.\d+/g, '');
    $('#nexttitle').parentNode.hidden = false;
    $('#thanks').textContent = T.thanks.title;
    $('#sum4').textContent = `${dayLong(b.date)}, ${fmtT(b.start)} to ${fmtT(b.end)}. ${b.clinic.address}.`;
    $('#thanksbody').textContent = T.thanks.body;
    $('#nexttitle').textContent = T.thanks.nextTitle;
    $('#nextstep').textContent = T.payNote;
    $('#pol2').innerHTML = policyHtml();
    const esc = s => s.replace(/[\\;,]/g, '\\$&');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Booking//EN', 'BEGIN:VEVENT', 'UID:' + b.id + '@booking',
      'DTSTAMP:' + z(Date.now()), 'DTSTART:' + z(b.start), 'DTEND:' + z(b.end),
      'SUMMARY:' + esc(b.title), 'LOCATION:' + esc(b.location), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    $('#ics').href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    $('#ics').download = 'session.ics';
  }

  async function markPaid(btn) {
    btn.disabled = true; $('#payerr').textContent = '';
    try { await api.post({ action: 'paid', id: S.booking.id, token: S.booking.token }); goto(4); }
    catch (e) { btn.disabled = false; $('#payerr').textContent = e.message; }
  }

  async function release(btn, errBox) { // frees the held slot (and, after paying, cancels the booking)
    btn.disabled = true; $(errBox).textContent = '';
    try { await api.post({ action: 'cancel', id: S.booking.id, token: S.booking.token }); S.booking = S.date = S.slot = null; btn.disabled = false; goto(1); }
    catch (e) { btn.disabled = false; $(errBox).textContent = e.message; }
  }

  /* ---------- reschedule: move the same booking to another slot ---------- */
  function startMove(returnTo) {
    S.moving = { id: S.booking.id, token: S.booking.token, returnTo };
    S.clinic = S.booking.clinic; S.date = S.slot = null; S.notice = '';
    goto(1);
  }
  function stopMove() { const to = S.moving.returnTo; S.moving = null; S.date = S.slot = null; goto(to); }
  async function confirmMove() {
    busy = true; upd();
    try {
      const r = await api.post({ action: 'reschedule', id: S.moving.id, token: S.moving.token, date: S.date, i: S.slot.i });
      S.booking = { ...S.booking, id: r.id || S.booking.id, start: r.start, end: r.end, title: r.title, location: r.location, date: S.date, payBy: r.payBy, paid: r.paid };
      S.moving = null; busy = false;
      if (r.paid) { goto(4); $('#thanks').textContent = T.moved.title; $('#thanksbody').textContent = T.moved.body; $('#nexttitle').parentNode.hidden = true; }
      else goto(3);
    } catch (e) {
      busy = false;
      if (e.code === 'taken') { S.notice = T.taken; S.slot = null; goto(1); } else { S.notice = e.message; upd(); }
    }
  }

  /* ---------- cancel page (link from the confirmation email) ---------- */
  async function cancelView(id, t) {
    S.s = 5; upd();
    $('#cx-info').textContent = 'Loading...';
    try {
      const r = await api.lookup(id, t);
      const hrs = Math.round(r.hoursLeft);
      $('#cx-info').textContent = `${dayLong(istDate(r.start))}, ${fmtT(r.start)} to ${fmtT(r.end)}. ${r.address}. ` +
        (r.hoursLeft > 0 ? `That is about ${hrs} ${hrs === 1 ? 'hour' : 'hours'} from now.` : 'This session has already started.');
      S.booking = { id, token: t, start: r.start, end: r.end, title: r.title, location: r.address, date: istDate(r.start), payBy: r.payBy, paid: r.paid,
        clinic: SITE.clinics.find(c => c.id === r.clinic) || SITE.clinics[0] };
      $('#cx-move').hidden = !r.canReschedule; $('#cx-note').hidden = r.canReschedule; $('#cx-note').textContent = T.rescheduleLate;
      $('#cx-btn').disabled = false;
    } catch (e) { $('#cx-info').textContent = e.message; }
    $('#cx-btn').onclick = async e => {
      e.target.disabled = true; $('#cx-err').textContent = '';
      try {
        await api.post({ action: 'cancel', id, token: t });
        $('#title').textContent = T.cancelled[0]; $('#lead').textContent = T.cancelled[1];
        $('#cx-info').textContent = ''; e.target.hidden = true; $('#cx-move').hidden = true; $('#cx-note').hidden = true;
        const l = $('#cx-link'); l.hidden = false; l.href = location.pathname;
      } catch (err) { e.target.disabled = false; $('#cx-err').textContent = err.message; }
    };
  }

  /* ---------- pay page (link from the confirmation email) ---------- */
  async function payView(id, t) {
    try {
      const r = await api.lookup(id, t);
      const clinic = SITE.clinics.find(c => c.id === r.clinic) || SITE.clinics[0];
      S.clinic = clinic;
      S.booking = { id, token: t, start: r.start, end: r.end, title: r.title, location: r.address, date: istDate(r.start), clinic, payBy: r.payBy };
      if (r.paid) { goto(4); $('#thanksbody').textContent = T.alreadyPaid; $('#nexttitle').parentNode.hidden = true; }
      else goto(3);
    } catch (e) {
      S.s = 5; upd();
      $('#title').textContent = T.payLinkInvalid[0]; $('#lead').textContent = e.code === 'invalid' ? T.payLinkInvalid[1] : e.message;
      $('#cx-info').textContent = ''; $('#cx-btn').hidden = true; $('#pol3').parentNode.hidden = true;
      const l = $('#cx-link'); l.hidden = false; l.href = location.pathname;
    }
  }

  /* ---------- wiring ---------- */
  $('#brand').textContent = SITE.brand;
  $('#footnote').textContent = T.footnote;
  $('#consent').textContent = T.consent;
  $('#phonehint').textContent = T.whatsappHint;
  $$('.poltitle').forEach(e => e.textContent = T.policy.title);
  $('#pol1').innerHTML = $('#pol3').innerHTML = policyHtml();
  $('#steps').innerHTML = IDS.map(() => '<i></i>').join('');
  $('#next').onclick = () => S.moving && S.s === 1 ? confirmMove() : S.s === 2 ? confirmBooking() : goto(S.s + 1);
  $('#back').onclick = () => S.moving && S.s === 1 ? stopMove() : goto(S.s - 1);
  $('#prev').onclick = () => { S.month.m--; if (S.month.m < 0) S.month = { y: S.month.y - 1, m: 11 }; renderCal(); };
  $('#nextm').onclick = () => { S.month.m++; if (S.month.m > 11) S.month = { y: S.month.y + 1, m: 0 }; renderCal(); };
  $('#form').addEventListener('input', upd);
  $('#paid').onclick = e => markPaid(e.target);
  $('#other').onclick = e => release(e.target, '#payerr');
  $('#resched').onclick = () => startMove(4);
  $('#cx-move').onclick = () => startMove(5);
  if (!SITE.apiUrl) { const d = document.createElement('div'); d.className = 'demo'; d.textContent = 'Demo data. Set apiUrl in js/config.js.'; document.body.append(d); }

  const qs = new URLSearchParams(location.search);
  if (qs.get('cancel')) cancelView(qs.get('cancel'), qs.get('t') || '');
  else if (qs.get('pay')) payView(qs.get('pay'), qs.get('t') || '');
  else if (SINGLE) { S.clinic = SITE.clinics[0]; goto(1); }
  else { S.s = 0; renderClinics(); upd(); }
})();
