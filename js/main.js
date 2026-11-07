import { esc, splitConcerti, showHTML, bindShows, dateParts, icsFor, jsonLd } from './concerti.js';

const $ = id => document.getElementById(id);

/* ---------- logo dell'hero: inline per animare i livelli di colore ---------- */
async function liveLogo() {
  const box = $('hero-logo');
  try {
    const svg = await (await fetch('assets/logo.svg')).text();
    box.innerHTML = svg;
    const el = box.querySelector('svg');
    el.setAttribute('aria-hidden', 'true');
    el.removeAttribute('role');
    requestAnimationFrame(() => box.classList.add('is-live'));
  } catch { /* resta l'immagine */ }
}

/* ---------- barra in alto: diventa piena dopo l'hero ---------- */
function topBar() {
  const bar = $('top-bar');
  const onScroll = () => bar.classList.toggle('is-solid', scrollY > innerHeight * 0.6);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ---------- concerti ---------- */
async function loadConcerti() {
  // Il parametro evita la cache: i nuovi concerti compaiono appena GitHub Pages ha pubblicato.
  const res = await fetch(`data/concerti.json?v=${Date.now()}`);
  if (!res.ok) throw new Error('concerti.json non trovato');
  return res.json();
}

function renderUpcoming(upcoming) {
  if (!upcoming.length) return;
  $('upcoming').innerHTML = `<ul class="shows upcoming">${upcoming.map((c, i) => showHTML(c, { open: i === 0 })).join('')}</ul>`;
  const next = upcoming.find(c => c.stato !== 'annullato');
  if (next) {
    const p = dateParts(next.data);
    const el = $('next-show');
    el.innerHTML = `Prossimo live: <a href="#live">${p.venerdi ? 'Sexta-feira' : p.giorno} ${p.num} ${p.mese}, ${esc(next.luogo)}, ${esc(next.citta)}</a>`;
    el.hidden = false;
  }
}

function renderArchive(past) {
  const perAnno = {};
  past.forEach(c => (perAnno[c.data.slice(0, 4)] ??= []).push(c));
  $('archive').innerHTML = Object.keys(perAnno).sort((a, b) => b - a).map(anno => `
    <div class="year">
      <h4>${anno}</h4>
      <ul class="shows">${perAnno[anno].map(c => showHTML(c)).join('')}</ul>
    </div>`).join('');
  const prima = past.at(-1)?.data.slice(0, 4);
  $('live-count').textContent = `${past.length} palchi dal ${prima}, dal Ticino a Milano e Zurigo. Apri una data per vedere locandina e dettagli.`;
}

function bindIcs(list) {
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-ics]');
    if (!btn) return;
    const c = list.find(x => x.id === btn.dataset.ics);
    if (!c) return;
    const blob = new Blob([icsFor(c)], { type: 'text/calendar' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `lampa-sexta-feira-${c.data}.ics` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
}

liveLogo();
topBar();
bindShows();
loadConcerti().then(list => {
  const { upcoming, past } = splitConcerti(list);
  renderUpcoming(upcoming);
  renderArchive(past);
  bindIcs(list);
  if (upcoming.length) {
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(jsonLd(upcoming));
    document.head.appendChild(s);
  }
}).catch(err => console.error(err));
