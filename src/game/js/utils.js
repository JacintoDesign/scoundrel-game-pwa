// Utility helpers: RNG, shuffle, DOM, storage

export function makeRNG(seed = Date.now()) {
  // Mulberry32 PRNG for deterministic shuffles
  // https://stackoverflow.com/a/47593316
  let t = seed >>> 0;
  const rng = () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  rng.seed = seed;
  return rng;
}

export function shuffle(array, rng = Math.random) {
  // Fisher–Yates
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function el(tag, opts = {}) {
  const e = document.createElement(tag);
  if (opts.class) e.className = opts.class;
  if (opts.text) e.textContent = opts.text;
  if (opts.html) e.innerHTML = opts.html;
  if (opts.attrs) Object.entries(opts.attrs).forEach(([k, v]) => e.setAttribute(k, v));
  return e;
}

export function save(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

export function load(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

export function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

export function sum(arr) { return arr.reduce((a, b) => a + b, 0); }

export function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
