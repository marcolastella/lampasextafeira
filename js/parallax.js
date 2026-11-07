// Parallax "dub delay": ogni livello arriva con il suo ritardo, come le ripetizioni di un'eco.
// data-parallax="0.2" → l'elemento si sposta del 20% della sua distanza dal centro dello schermo.
// data-max="110" → spostamento massimo in pixel.
// data-fade → sfuma mentre si scorre via dall'hero.

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const layers = [...document.querySelectorAll('[data-parallax]')];
const fades = [...document.querySelectorAll('[data-fade]')];
let ticking = false;

function update() {
  ticking = false;
  const vh = innerHeight;
  const scale = innerWidth < 720 ? 0.6 : 1; // movimento più contenuto sui telefoni
  for (const el of layers) {
    const box = el.parentElement.getBoundingClientRect();
    if (box.bottom < -vh * 0.5 || box.top > vh * 1.5) continue; // fuori schermo: niente lavoro
    const fromCenter = box.top + box.height / 2 - vh / 2;
    let y = -fromCenter * parseFloat(el.dataset.parallax) * scale;
    const max = parseFloat(el.dataset.max); // tetto allo spostamento (le eco non si allontanano troppo)
    if (max) y = Math.max(-max * scale, Math.min(max * scale, y));
    el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
  }
  for (const el of fades) {
    const p = Math.min(1, Math.max(0, scrollY / (vh * 0.65)));
    el.style.opacity = (1 - p).toFixed(3);
    el.style.transform = `translate3d(0, ${(-p * 60).toFixed(1)}px, 0)`;
  }
}

function onScroll() {
  if (!ticking) { ticking = true; requestAnimationFrame(update); }
}

function start() {
  if (reduce.matches) {
    [...layers, ...fades].forEach(el => { el.style.transform = ''; el.style.opacity = ''; });
    removeEventListener('scroll', onScroll);
    removeEventListener('resize', onScroll);
    return;
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  update();
}

reduce.addEventListener?.('change', start);
start();
