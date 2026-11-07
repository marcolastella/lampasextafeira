import { esc, splitConcerti, posterHTML, dateParts, shortDate, icsFor, jsonLd } from './concerti.js';

async function load() {
  // Il parametro evita la cache: i nuovi concerti compaiono appena GitHub Pages ha pubblicato.
  const res = await fetch(`data/concerti.json?v=${Date.now()}`);
  if (!res.ok) throw new Error('concerti.json non trovato');
  return res.json();
}

function renderNext(next) {
  const info = document.getElementById('next-show-info');
  if (!next) return;
  const p = dateParts(next.data);
  info.textContent = `${p.venerdi ? 'Sexta-feira' : p.giorno} ${p.num} ${p.mese}, ${next.luogo}, ${next.citta}`;
}

function renderArchive(past) {
  const box = document.getElementById('archive');
  document.getElementById('archive-count').textContent = past.length ? `${past.length} date` : '';
  if (!past.length) { document.getElementById('archive-box').hidden = true; return; }
  const perAnno = {};
  past.forEach(c => (perAnno[c.data.slice(0, 4)] ??= []).push(c));
  box.innerHTML = Object.keys(perAnno).sort((a, b) => b - a).map(anno => `
    <div class="archive__year">
      <h3>${anno}</h3>
      <ul>${perAnno[anno].map(c => `
        <li><time datetime="${c.data}">${shortDate(c.data).replace(/ \d{4}$/, '')}</time>
          <span>${esc(c.titolo ? c.titolo + ', ' + c.luogo : c.luogo)}</span>
          <span class="archive__city">${esc(c.citta)}</span></li>`).join('')}
      </ul>
    </div>`).join('');
}

function renderGallery(list) {
  const conFoto = list.filter(c => c.foto).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 12);
  if (!conFoto.length) return;
  document.getElementById('galleria').hidden = false;
  document.getElementById('gallery').innerHTML = conFoto.map(c => `
    <figure><img src="${esc(c.foto)}" alt="Lampa Sexta Feira a ${esc(c.luogo)}, ${esc(c.citta)}" loading="lazy">
    <figcaption>${esc(c.luogo)}, ${shortDate(c.data)}</figcaption></figure>`).join('');
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

load().then(list => {
  const { upcoming, past } = splitConcerti(list);
  if (upcoming.length) document.getElementById('upcoming').innerHTML = upcoming.map(posterHTML).join('');
  renderNext(upcoming.find(c => c.stato !== 'annullato'));
  renderArchive(past);
  renderGallery(list);
  bindIcs(list);
  if (upcoming.length) {
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(jsonLd(upcoming));
    document.head.appendChild(s);
  }
}).catch(err => console.error(err));
