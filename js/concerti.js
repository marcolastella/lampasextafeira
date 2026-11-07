// Funzioni condivise tra il sito pubblico e il camerino (admin).

const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

export function splitConcerti(list) {
  const oggi = todayISO();
  const upcoming = list.filter(c => c.data >= oggi).sort((a, b) => a.data.localeCompare(b.data) || (a.ora || '').localeCompare(b.ora || ''));
  const past = list.filter(c => c.data < oggi).sort((a, b) => b.data.localeCompare(a.data));
  return { upcoming, past };
}

export function dateParts(iso) {
  const d = parseDate(iso);
  return { giorno: GIORNI[d.getDay()], num: d.getDate(), mese: MESI[d.getMonth()], anno: d.getFullYear(), venerdi: d.getDay() === 5 };
}

export function shortDate(iso) {
  const p = dateParts(iso);
  return `${p.num} ${p.mese} ${p.anno}`;
}

function mapsUrl(c) {
  const q = [c.luogo, c.indirizzo, c.citta].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

const isTicket = url => /ticket|eventbrite|biglietteria|ticketino|eventfrog|tickets/i.test(url || '');

/** Una riga in stile "tour dates", che si apre per mostrare locandina e dettagli. */
export function showHTML(c, { open = false } = {}) {
  const p = dateParts(c.data);
  const dd = String(p.num).padStart(2, '0');
  const mm = String(parseDate(c.data).getMonth() + 1).padStart(2, '0');
  const badge = c.stato === 'annullato' ? '<span class="badge badge--red">Annullato</span>'
    : c.stato === 'soldout' ? '<span class="badge">Sold out</span>' : '';
  const detailId = `d-${esc(c.id)}`;
  const meta = [c.ora && `Ore ${esc(c.ora)}`, c.prezzo && esc(c.prezzo), c.indirizzo && esc(c.indirizzo)].filter(Boolean).join('. ');
  const links = [
    c.biglietti && `<a class="btn btn--solid" href="${esc(c.biglietti)}" target="_blank" rel="noopener">${isTicket(c.biglietti) ? 'Biglietti' : 'Info evento'}</a>`,
    `<a class="btn" href="${mapsUrl(c)}" target="_blank" rel="noopener">Mappa</a>`,
    c.data >= todayISO() && `<button class="btn" type="button" data-ics="${esc(c.id)}">Aggiungi al calendario</button>`
  ].filter(Boolean).join('');

  return `
  <li class="show${open ? ' is-open' : ''}${c.stato === 'annullato' ? ' is-cancelled' : ''}">
    <button class="show__row" type="button" aria-expanded="${open}" aria-controls="${detailId}">
      <span class="show__date"><time datetime="${c.data}">${dd}.${mm}</time><small>${p.venerdi ? 'Sexta-feira' : p.giorno}</small></span>
      <span class="show__venue">${esc(c.luogo)}${badge}${c.titolo && c.titolo !== c.luogo ? `<small>${esc(c.titolo)}</small>` : ''}</span>
      <span class="show__city">${esc(c.citta)}</span>
      <span class="show__toggle" aria-hidden="true"></span>
    </button>
    <div class="show__detail" id="${detailId}"${open ? '' : ' hidden'}>
      ${c.foto ? `<img src="${esc(c.foto)}" alt="Locandina: ${esc(c.luogo)}, ${esc(c.citta)}" loading="lazy">` : '<span></span>'}
      <div>
        ${c.descrizione ? `<p>${esc(c.descrizione).replace(/\n/g, '<br>')}</p>` : ''}
        ${meta ? `<p class="show__meta">${meta}</p>` : ''}
        <div class="show__links">${links}</div>
      </div>
    </div>
  </li>`;
}

/** Collega l'apertura/chiusura delle righe. */
export function bindShows(root = document) {
  root.addEventListener('click', e => {
    const row = e.target.closest('.show__row');
    if (!row) return;
    const li = row.parentElement;
    const open = !li.classList.contains('is-open');
    li.classList.toggle('is-open', open);
    row.setAttribute('aria-expanded', open);
    li.querySelector('.show__detail').hidden = !open;
  });
}

/** File .ics per aggiungere il concerto al calendario. */
export function icsFor(c) {
  const d = c.data.replace(/-/g, '');
  let start, end;
  if (c.ora && /^\d{1,2}:\d{2}$/.test(c.ora)) {
    const [h, m] = c.ora.split(':').map(Number);
    const s = `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
    const eh = String(Math.min(h + 2, 23)).padStart(2, '0');
    start = `DTSTART;TZID=Europe/Zurich:${d}T${s}`;
    end = `DTEND;TZID=Europe/Zurich:${d}T${eh}${String(m).padStart(2, '0')}00`;
  } else {
    start = `DTSTART;VALUE=DATE:${d}`;
    end = `DTEND;VALUE=DATE:${d}`;
  }
  const clean = s => (s || '').replace(/[,;\\]/g, m => '\\' + m).replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lampa Sexta Feira//IT', 'BEGIN:VEVENT',
    `UID:${c.id}@lampasextafeira.com`, start, end,
    `SUMMARY:${clean('Lampa Sexta Feira live' + (c.titolo ? ' – ' + c.titolo : ''))}`,
    `LOCATION:${clean([c.luogo, c.indirizzo, c.citta].filter(Boolean).join(', '))}`,
    `DESCRIPTION:${clean(c.descrizione)}`,
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
}

/** Dati strutturati per Google (eventi musicali). */
export function jsonLd(list) {
  return list.map(c => ({
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name: 'Lampa Sexta Feira' + (c.titolo ? ` – ${c.titolo}` : ` @ ${c.luogo}`),
    startDate: c.ora ? `${c.data}T${c.ora}` : c.data,
    eventStatus: c.stato === 'annullato' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    location: { '@type': 'Place', name: c.luogo, address: [c.indirizzo, c.citta].filter(Boolean).join(', ') },
    image: c.foto ? [new URL(c.foto, location.href).href] : undefined,
    description: c.descrizione || undefined,
    performer: { '@type': 'MusicGroup', name: 'Lampa Sexta Feira' },
    offers: c.biglietti ? { '@type': 'Offer', url: c.biglietti } : undefined
  }));
}
