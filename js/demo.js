/* Fake backend used only while SITE.apiUrl is empty, so you can preview the flow.
   Demo day: Thursdays, four one-hour slots from 10 AM. Not used once apiUrl is set. */
window.demo = (() => {
  const HOURS = [10, 11, 12, 13];
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const ms = (ds, h) => { const [y, m, d] = ds.split('-').map(Number); return Date.UTC(y, m - 1, d, h) - 330 * 60000; };
  const err = (m, code) => Object.assign(new Error(m), { code });

  const dates = [];
  for (let k = 0; k <= 35; k++) { const d = new Date(Date.now() + k * 864e5); if (d.getDay() === 4) dates.push(ymd(d)); }

  // pretend some slots are taken: 2nd open Thursday has 11 AM booked, 3rd has 1 PM booked
  const booked = {};
  dates.filter(ds => ms(ds, 10) > Date.now() + 24 * 36e5).forEach((ds, n) => {
    if (n === 1) booked[ds] = new Set([1]);
    if (n === 2) booked[ds] = new Set([3]);
  });

  const offers = ds => {
    const taken = booked[ds] || new Set(), earliest = Date.now() + 24 * 36e5;
    const free = HOURS.map((h, i) => ({ i, start: ms(ds, h), end: ms(ds, h + 1) }))
      .filter(s => !taken.has(s.i) && s.start >= earliest);
    return taken.size ? free.filter(s => taken.has(s.i - 1) || taken.has(s.i + 1)) : free;
  };

  return {
    availability() {
      const days = {};
      dates.forEach(ds => { const o = offers(ds); if (o.length) days[ds] = o; });
      return { days, from: ymd(new Date()), until: ymd(new Date(Date.now() + 35 * 864e5)) };
    },
    lookup() { throw err('Cancel links need the live backend.'); },
    post(b) {
      if (b.action === 'book') {
        const o = offers(b.date).find(s => s.i === b.i);
        if (!o) throw err('That time was just taken.', 'taken');
        (booked[b.date] = booked[b.date] || new Set()).add(b.i);
        return { ok: true, id: 'demo|' + b.date + '|' + b.i, token: 'demo', start: o.start, end: o.end,
          title: b.name + ' with Namaste Psychology (LCR)', location: 'Law College Road, Pune' };
      }
      if (b.action === 'cancel') { const [, ds, i] = b.id.split('|'); if (booked[ds]) booked[ds].delete(Number(i)); }
      return { ok: true };
    },
  };
})();
