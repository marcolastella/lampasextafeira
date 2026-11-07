// Funzioni condivise tra il sito pubblico e il camerino (admin).

const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const COLORI = ['red', 'blue', 'green', 'yellow'];

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

/** Manifesto lambe-lambe per un concerto in arrivo. */
export function posterHTML(c, i = 0) {
  const p = dateParts(c.data);
  const colore = COLORI[i % COLORI.length];
  const stato = c.stato && c.stato !== 'confermato'
    ? `<span class="poster__stamp">${c.stato === 'annullato' ? 'Annullato' : c.stato === 'soldout' ? 'Sold out' : esc(c.stato)}</span>` : '';
  const foto = c.foto
    ? `<div class="poster__photo"><img src="${esc(c.foto)}" alt="" loading="lazy"></div>` : '';
  const titolo = c.titolo ? `<p class="poster__title">${esc(c.titolo)}</p>` : '';
  const desc = c.descrizione ? `<p class="poster__desc">${esc(c.descrizione).replace(/\n/g, '<br>')}</p>` : '';
  const meta = [c.ora && `Ore ${esc(c.ora)}`, c.prezzo && esc(c.prezzo)].filter(Boolean).join('<br>');
  const azioni = [
    c.biglietti && `<a class="poster__btn" href="${esc(c.biglietti)}" target="_blank" rel="noopener">Biglietti</a>`,
    `<a class="poster__link" href="${mapsUrl(c)}" target="_blank" rel="noopener">Mappa</a>`,
    `<button class="poster__link" type="button" data-ics="${esc(c.id)}">Aggiungi al calendario</button>`
  ].filter(Boolean).join('');

  return `
  <article class="poster poster--${colore}${c.stato === 'annullato' ? ' is-cancelled' : ''}" style="--tilt:${[-1.6, 1.2, -0.8, 1.8][i % 4]}deg">
    ${stato}
    <header class="poster__date">
      <span class="poster__day">${p.venerdi ? 'Sexta-feira' : p.giorno}</span>
      <span class="poster__num">${p.num}</span>
      <span class="poster__month">${p.mese} ${p.anno}</span>
    </header>
    ${foto}
    <div class="poster__body">
      ${titolo}
      <h3 class="poster__venue">${esc(c.luogo)}</h3>
      <p class="poster__city">${esc(c.citta)}${c.indirizzo ? `<br><small>${esc(c.indirizzo)}</small>` : ''}</p>
      ${meta ? `<p class="poster__meta">${meta}</p>` : ''}
      ${desc}
      <div class="poster__actions">${azioni}</div>
    </div>
  </article>`;
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
