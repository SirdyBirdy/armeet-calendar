/* Fake backend used only while SITE.apiUrl is empty, so you can preview the flow.
   Demo days: Thursdays at Prabhat Road (four one-hour slots from 10 AM), Mondays at NIBM (five 50-minute slots from 11 AM)
   and one evening a week online.
   Not used once apiUrl is set. */
window.demo = (() => {
  const PLACES = {
    pr:   { dow: 4, address: 'Prabhat Road, Pune', label: 'Thursdays', tag: 'PR',   slots: [[600, 660], [660, 720], [720, 780], [780, 840]] },
    nibm: { dow: 1, address: 'NIBM, Pune',         label: 'Mondays',   tag: 'NIBM', slots: [[660, 710], [725, 775], [790, 840], [870, 920], [935, 985]] },
    online: { dow: 3, address: 'Online (video link sent by email)', label: 'Wednesdays', tag: 'Online', slots: [[1080, 1140], [1155, 1215]] },
  };
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const ms = (ds, min) => { const [y, m, d] = ds.split('-').map(Number); return Date.UTC(y, m - 1, d, 0, min) - 330 * 60000; };
  const err = (m, code) => Object.assign(new Error(m), { code });
  const place = id => PLACES[id] || PLACES.pr;
  const nameOf = id => ({ pr: 'Prabhat Road', nibm: 'NIBM', online: 'Online' })[id];

  const dates = {};
  Object.keys(PLACES).forEach(id => {
    dates[id] = [];
    for (let k = 0; k <= 35; k++) { const d = new Date(Date.now() + k * 864e5); if (d.getDay() === PLACES[id].dow) dates[id].push(ymd(d)); }
  });

  // pretend some slots are taken: the 2nd open day has its 2nd slot booked, the 3rd has its last slot booked
  // booked[clinic|date] = Set of slot start minutes
  const booked = {};
  Object.keys(PLACES).forEach(id => {
    const p = PLACES[id];
    dates[id].filter(ds => ms(ds, p.slots[0][0]) > Date.now() + 24 * 36e5).forEach((ds, n) => {
      if (n === 1) booked[id + '|' + ds] = new Set([p.slots[1][0]]);
      if (n === 2) booked[id + '|' + ds] = new Set([p.slots[p.slots.length - 1][0]]);
    });
  });

  const paid = new Set();   // booking ids the demo client has marked as paid

  const offers = (id, ds) => {
    const p = place(id), taken = booked[id + '|' + ds] || new Set(), earliest = Date.now() + 24 * 36e5;
    const busy = p.slots.map(s => taken.has(s[0]));
    const free = p.slots.map((s, n) => ({ n, i: s[0], start: ms(ds, s[0]), end: ms(ds, s[1]) }))
      .filter(s => !busy[s.n] && s.start >= earliest);
    return (busy.some(Boolean) ? free.filter(s => busy[s.n - 1] || busy[s.n + 1]) : free).map(s => ({ i: s.i, start: s.start, end: s.end }));
  };

  const idOf = name => Object.keys(PLACES).find(k => nameOf(k) === name) || 'pr';
  const parse = id => { const [, clinic, ds, i] = String(id).split('|'); return { clinic, ds, i: Number(i) }; };

  return {
    availability(mv) {
      const days = {}, places = {};
      let restore;   // when moving a booking, its own slot counts as free
      let only = null;
      if (mv && String(mv.id).indexOf('demo|') === 0) {
        const o = parse(mv.id), set = booked[o.clinic + '|' + o.ds];
        only = o.clinic;
        if (set && set.delete(o.i)) restore = () => set.add(o.i);
      }
      Object.keys(PLACES).filter(id => !only || id === only).forEach(id => {
        (dates[id] || []).forEach(ds => {
          const o = offers(id, ds);
          if (!o.length) return;
          (days[ds] = days[ds] || []).push(...o.map(s => ({ ...s, clinic: nameOf(id) })));
          places[nameOf(id)] = { label: nameOf(id), short: PLACES[id].tag, address: PLACES[id].address, when: PLACES[id].label };
        });
      });
      Object.keys(days).forEach(ds => days[ds].sort((a, b) => a.start - b.start));
      if (restore) restore();
      return { days, places, from: ymd(new Date()), until: ymd(new Date(Date.now() + 35 * 864e5)) };
    },
    lookup() { throw err('Cancel links need the live backend.'); },
    post(b) {
      if (b.action === 'book') {
        const cid = idOf(b.clinic), o = offers(cid, b.date).find(s => s.i === b.i), p = place(cid);
        if (!o) throw err('That time was just taken.', 'taken');
        (booked[cid + '|' + b.date] = booked[cid + '|' + b.date] || new Set()).add(b.i);
        return { ok: true, id: 'demo|' + cid + '|' + b.date + '|' + b.i, token: 'demo', start: o.start, end: o.end,
          title: b.name + ' (' + p.tag + ')', location: p.address, payBy: Date.now() + 24 * 36e5 };
      }
      if (b.action === 'reschedule') {
        const old = parse(b.id), set = booked[old.clinic + '|' + old.ds], p = place(old.clinic);
        if (set) set.delete(old.i);
        const o = offers(old.clinic, b.date).find(s => s.i === b.i);
        if (!o) { if (set) set.add(old.i); throw err('That time was just taken.', 'taken'); }
        (booked[old.clinic + '|' + b.date] = booked[old.clinic + '|' + b.date] || new Set()).add(b.i);
        const nid = 'demo|' + old.clinic + '|' + b.date + '|' + b.i, wasPaid = paid.delete(b.id);
        if (wasPaid) paid.add(nid);
        return { ok: true, id: nid, start: o.start, end: o.end, title: 'Demo session', location: p.address, paid: wasPaid, payBy: wasPaid ? null : Date.now() + 24 * 36e5 };
      }
      if (b.action === 'paid') paid.add(b.id);
      if (b.action === 'cancel') { const o = parse(b.id); if (booked[o.clinic + '|' + o.ds]) booked[o.clinic + '|' + o.ds].delete(o.i); }
      return { ok: true };
    },
  };
})();
