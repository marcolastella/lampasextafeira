import { esc, splitConcerti, showHTML, bindShows, shortDate } from '../js/concerti.js';

// Repository dove vive il sito. Il sito si aggiorna da solo ad ogni salvataggio (GitHub Pages).
const REPO = { owner: 'marcolastella', name: 'lampasextafeira', branch: 'main' };
const DATA_PATH = 'data/concerti.json';
const PHOTO_DIR = 'assets/concerti';
const TOKEN_KEY = 'lsf-camarim-token';
const API = `https://api.github.com/repos/${REPO.owner}/${REPO.name}/contents/`;

const $ = id => document.getElementById(id);
const views = ['login', 'list-view', 'form-view'];
const show = id => views.forEach(v => ($(v).hidden = v !== id));

let token = '';
try { token = localStorage.getItem(TOKEN_KEY) || ''; } catch {}
let concerti = [];
let dataSha = null;
let editing = null;        // concerto in modifica (null = nuovo)
let newPhoto = null;       // { base64, dataUrl } della foto appena scelta
let removePhoto = false;

/* ---------- GitHub ---------- */
async function gh(path, opts = {}) {
  const res = await fetch(API + path + (opts.method ? '' : `?ref=${REPO.branch}&t=${Date.now()}`), {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opts.headers || {}) }
  });
  if (!res.ok) {
    const err = new Error(`GitHub ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

const toB64 = str => btoa(unescape(encodeURIComponent(str)));
const fromB64 = b64 => decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))));

async function loadData() {
  const file = await gh(DATA_PATH);
  dataSha = file.sha;
  concerti = JSON.parse(fromB64(file.content));
}

async function saveData(message, mutate) {
  // Rilegge sempre il file prima di scrivere, così non si sovrascrivono modifiche fatte da un altro membro.
  for (let tentativo = 0; tentativo < 2; tentativo++) {
    await loadData();
    const next = mutate(structuredClone(concerti));
    next.sort((a, b) => b.data.localeCompare(a.data));
    try {
      const body = JSON.stringify({ message, content: toB64(JSON.stringify(next, null, 2) + '\n'), sha: dataSha, branch: REPO.branch });
      const r = await gh(DATA_PATH, { method: 'PUT', body });
      dataSha = r.content.sha;
      concerti = next;
      return;
    } catch (e) {
      if (e.status !== 409 || tentativo === 1) throw e;
    }
  }
}

async function uploadPhoto(id, base64) {
  const path = `${PHOTO_DIR}/${id}-${Date.now().toString(36)}.jpg`;
  await gh(path, { method: 'PUT', body: JSON.stringify({ message: `Foto concerto ${id}`, content: base64, branch: REPO.branch }) });
  return path;
}

async function deletePhoto(path) {
  if (!path || !path.startsWith(PHOTO_DIR)) return;
  try {
    const f = await gh(path);
    await gh(path, { method: 'DELETE', body: JSON.stringify({ message: `Rimuovi foto ${path}`, sha: f.sha, branch: REPO.branch }) });
  } catch { /* se la foto non c'è più va bene così */ }
}

/* ---------- immagini ---------- */
function resizeImage(file, max = 1600, quality = 0.84) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = Object.assign(document.createElement('canvas'), { width: Math.round(img.width * scale), height: Math.round(img.height * scale) });
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      URL.revokeObjectURL(img.src);
      resolve({ dataUrl, base64: dataUrl.split(',')[1] });
    };
    img.onerror = () => reject(new Error('Questa immagine non si apre. Prova con un JPG o PNG.'));
    img.src = URL.createObjectURL(file);
  });
}

/* ---------- interfaccia ---------- */
function toast(msg, isError = false) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.toggle('is-error', isError);
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.hidden = true), isError ? 7000 : 5000);
}

function errorMessage(e) {
  if (e.status === 401) return 'La chiave di accesso non è valida o è scaduta. Esci e incollane una nuova.';
  if (e.status === 403 || e.status === 404) return 'La chiave non ha il permesso di scrivere su lampasextafeira. Controlla che Contents sia “Read and write”.';
  if (e.status === 422) return 'GitHub ha rifiutato il file. Riprova con una foto più piccola.';
  if (e instanceof TypeError) return 'Connessione assente. Controlla internet e riprova.';
  return e.message || 'Salvataggio non riuscito. Riprova.';
}

function renderList() {
  const { upcoming, past } = splitConcerti(concerti);
  const row = c => `
    <li><time datetime="${c.data}">${shortDate(c.data)}</time>
      <span><b>${esc(c.luogo)}</b>, ${esc(c.citta)}${c.titolo && c.titolo !== c.luogo ? `, ${esc(c.titolo)}` : ''}${c.stato && c.stato !== 'confermato' ? `<span class="a-badge">${c.stato === 'soldout' ? 'Sold out' : 'Annullato'}</span>` : ''}</span>
      <button class="a-link" type="button" data-edit="${esc(c.id)}">Modifica</button></li>`;
  $('list-upcoming').innerHTML = upcoming.length ? upcoming.map(row).join('') : '<li><span class="a-empty">Nessun concerto in programma. Aggiungine uno.</span></li>';
  $('list-past').innerHTML = past.map(row).join('') || '<li><span class="a-empty">Ancora nessuno.</span></li>';
  $('logout').hidden = false;
  show('list-view');
}

const FIELDS = ['data', 'ora', 'luogo', 'citta', 'indirizzo', 'titolo', 'descrizione', 'prezzo', 'stato', 'biglietti'];

function formValues() {
  const v = {};
  FIELDS.forEach(f => (v[f] = $(`f-${f}`).value.trim()));
  return v;
}

function currentPhoto() {
  if (newPhoto) return newPhoto.dataUrl;
  if (removePhoto) return '';
  return editing?.foto ? `../${editing.foto}` : '';
}

function renderPreview() {
  const v = formValues();
  const c = { id: 'anteprima', ...v, data: v.data || new Date().toISOString().slice(0, 10), luogo: v.luogo || 'Nome del locale', citta: v.citta || 'Città', foto: currentPhoto() };
  $('preview').innerHTML = `<ul class="shows upcoming">${showHTML(c, { open: true })}</ul>`;
  const img = $('photo-preview');
  img.src = currentPhoto();
  img.hidden = !img.src || !currentPhoto();
  $('photo-remove').hidden = !currentPhoto();
}

function openForm(c = null) {
  editing = c;
  newPhoto = null;
  removePhoto = false;
  $('event-form').reset();
  $('form-error').textContent = '';
  FIELDS.forEach(f => ($(`f-${f}`).value = c?.[f] ?? (f === 'stato' ? 'confermato' : '')));
  $('form-title').textContent = c ? 'Modifica concerto' : 'Nuovo concerto';
  $('save-btn').textContent = c ? 'Salva modifiche' : 'Pubblica concerto';
  $('delete-btn').hidden = !c;
  renderPreview();
  show('form-view');
  window.scrollTo(0, 0);
  $('f-data').focus();
}

const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

async function onSave(e) {
  e.preventDefault();
  const v = formValues();
  const missing = [['data', 'la data'], ['luogo', 'il locale'], ['citta', 'la città']].filter(([f]) => !v[f]).map(([, n]) => n);
  if (missing.length) { $('form-error').textContent = `Manca ${missing.join(', ')}.`; return; }
  if (v.biglietti && !/^https?:\/\//.test(v.biglietti)) { $('form-error').textContent = 'Il link dei biglietti deve iniziare con https://'; return; }

  const btn = $('save-btn');
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Pubblico…';
  $('form-error').textContent = '';
  try {
    const id = editing?.id || `${v.data}-${slug(v.luogo)}-${Math.random().toString(36).slice(2, 6)}`;
    let foto = editing?.foto || '';
    if (newPhoto) foto = await uploadPhoto(id, newPhoto.base64);
    else if (removePhoto) foto = '';
    const record = { id, ...v, foto };

    await saveData(editing ? `Aggiorna concerto: ${v.luogo} ${v.data}` : `Nuovo concerto: ${v.luogo} ${v.data}`, list => {
      const i = list.findIndex(x => x.id === id);
      if (i >= 0) list[i] = record; else list.push(record);
      return list;
    });
    if (editing?.foto && editing.foto !== foto) deletePhoto(editing.foto);

    toast(editing ? 'Modifiche salvate. Sul sito tra un minuto circa.' : 'Concerto pubblicato. Sul sito tra un minuto circa.');
    renderList();
  } catch (err) {
    $('form-error').textContent = errorMessage(err);
  } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
}

async function onDelete() {
  if (!editing) return;
  // conferma inline: il pulsante chiede un secondo clic
  const btn = $('delete-btn');
  if (btn.dataset.confirm !== '1') {
    btn.dataset.confirm = '1';
    btn.textContent = 'Clicca di nuovo per eliminare';
    setTimeout(() => { btn.dataset.confirm = ''; btn.textContent = 'Elimina concerto'; }, 4000);
    return;
  }
  btn.disabled = true;
  try {
    const target = editing;
    await saveData(`Elimina concerto: ${target.luogo} ${target.data}`, list => list.filter(x => x.id !== target.id));
    if (target.foto) deletePhoto(target.foto);
    toast('Concerto eliminato.');
    renderList();
  } catch (err) {
    $('form-error').textContent = errorMessage(err);
  } finally {
    btn.disabled = false;
    btn.dataset.confirm = '';
    btn.textContent = 'Elimina concerto';
  }
}

async function start() {
  if (!token) { show('login'); return; }
  try {
    await loadData();
    renderList();
  } catch (err) {
    show('login');
    $('login-error').textContent = errorMessage(err);
  }
}

/* ---------- eventi ---------- */
$('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  token = $('token').value.trim();
  $('login-error').textContent = '';
  try {
    await loadData();
    try { localStorage.setItem(TOKEN_KEY, token); } catch {}
    $('token').value = '';
    renderList();
  } catch (err) {
    $('login-error').textContent = errorMessage(err);
  }
});
$('logout').addEventListener('click', () => {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
  token = '';
  $('logout').hidden = true;
  show('login');
});
$('new-btn').addEventListener('click', () => openForm());
$('cancel-btn').addEventListener('click', renderList);
document.addEventListener('click', e => {
  const b = e.target.closest('[data-edit]');
  if (b) openForm(concerti.find(c => c.id === b.dataset.edit));
});
$('event-form').addEventListener('input', () => { $('form-error').textContent = ''; renderPreview(); });
$('event-form').addEventListener('submit', onSave);
$('delete-btn').addEventListener('click', onDelete);
$('f-foto').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    newPhoto = await resizeImage(file);
    removePhoto = false;
    renderPreview();
  } catch (err) { $('form-error').textContent = err.message; }
});
$('photo-remove').addEventListener('click', () => {
  newPhoto = null;
  removePhoto = true;
  $('f-foto').value = '';
  renderPreview();
});

bindShows(document.getElementById('preview'));
start();
