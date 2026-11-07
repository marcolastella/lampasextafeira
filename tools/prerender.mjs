// Scrive nell'HTML una versione statica dell'archivio concerti, per i motori di ricerca e le AI
// che non eseguono JavaScript. Il sito poi la sostituisce con i dati sempre aggiornati.
// Uso: node tools/prerender.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { splitConcerti, showHTML } from '../js/concerti.js';

const list = JSON.parse(readFileSync(new URL('../data/concerti.json', import.meta.url)));
const { past } = splitConcerti(list);
const perAnno = {};
past.forEach(c => (perAnno[c.data.slice(0, 4)] ??= []).push(c));
const html = Object.keys(perAnno).sort((a, b) => b - a).map(anno => `
          <div class="year">
            <h4>${anno}</h4>
            <ul class="shows">${perAnno[anno].map(c => showHTML(c)).join('')}</ul>
          </div>`).join('');

const file = new URL('../index.html', import.meta.url);
const page = readFileSync(file, 'utf8');
const out = page.replace(/(<div id="archive" class="archive">)[\s\S]*?(<\/div>\s*<\/div>\s*<\/section>)/, `$1${html}\n        </div>\n      </div>\n    </section>`);
if (out === page) throw new Error('Segnaposto dell\'archivio non trovato');
writeFileSync(file, out);
console.log(`Archivio statico: ${past.length} concerti`);
