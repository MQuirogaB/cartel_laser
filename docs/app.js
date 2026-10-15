import opentype from "opentype.js";

import { DEFAULTS, construirCartel, envolverSVG, primerEmoji } from "./svg.js?v=1";
import { CATEGORIAS } from "./emojis.js?v=1";

const el = (id) => document.getElementById(id);

// Si algo falla al arrancar (por ejemplo, archivos antiguos en la caché), que se vea.
window.addEventListener("error", (e) => {
  const s = el("status");
  if (s) { s.textContent = "Error: " + (e.message || "no se pudo iniciar") + ". Prueba a recargar con Ctrl+Shift+R."; s.classList.add("error"); }
});

const statusEl = el("status");
const downloadBtn = el("download-btn");
const holder = el("svg-holder");

// ---------------------------------------------------------------------
// Tipografías (todas incluidas en la carpeta fonts/)
// ---------------------------------------------------------------------

const FONTS = [
  { id: "atkinson", nombre: "Atkinson Hyperlegible", archivo: "atkinson-hyperlegible", pesos: [400, 700] },
  { id: "lexend", nombre: "Lexend", archivo: "lexend", pesos: [400, 700] },
  { id: "nunito", nombre: "Nunito", archivo: "nunito", pesos: [400, 700] },
  { id: "fredoka", nombre: "Fredoka (redondeada)", archivo: "fredoka", pesos: [400, 700] },
  { id: "comic", nombre: "Comic Neue", archivo: "comic-neue", pesos: [400, 700] },
  { id: "montserrat", nombre: "Montserrat", archivo: "montserrat", pesos: [400, 700] },
  { id: "oswald", nombre: "Oswald (estrecha)", archivo: "oswald", pesos: [400, 700] },
  { id: "bebas", nombre: "Bebas Neue (mayúsculas)", archivo: "bebas-neue", pesos: [400] },
  { id: "playfair", nombre: "Playfair Display (elegante)", archivo: "playfair-display", pesos: [400, 700] },
  { id: "slab", nombre: "Roboto Slab (con serifa)", archivo: "roboto-slab", pesos: [400, 700] },
  { id: "dejavu", nombre: "DejaVu Sans", archivo: "dejavu-sans", pesos: [400, 700], ext: "ttf" },
  { id: "serif", nombre: "DejaVu Serif", archivo: "dejavu-serif", pesos: [400, 700], ext: "ttf" },
  { id: "caveat", nombre: "Caveat (a mano)", archivo: "caveat", pesos: [400, 700] },
  { id: "marker", nombre: "Permanent Marker (rotulador)", archivo: "permanent-marker", pesos: [400] },
  { id: "pacifico", nombre: "Pacifico (cursiva)", archivo: "pacifico", pesos: [400] },
  { id: "lobster", nombre: "Lobster (cursiva)", archivo: "lobster", pesos: [400] },
];
const FONT_DEFAULT = "atkinson";
const cacheFuentes = {};

async function cargarFuente(archivo, peso, ext = "woff") {
  const clave = `${archivo}-${peso}`;
  if (!cacheFuentes[clave]) {
    const res = await fetch(`./fonts/${clave}.${ext}`);
    if (!res.ok) throw new Error("no se pudo cargar la letra");
    cacheFuentes[clave] = opentype.parse(await res.arrayBuffer());
  }
  return cacheFuentes[clave];
}

function fuenteElegida() { return FONTS.find((f) => f.id === el("fontFamily").value) || FONTS[0]; }

function rellenarFuentes() {
  const sel = el("fontFamily");
  for (const f of FONTS) {
    const o = document.createElement("option");
    o.value = f.id;
    o.textContent = f.nombre;
    sel.append(o);
  }
}

// ---------------------------------------------------------------------
// Estado y parámetros
// ---------------------------------------------------------------------

const NUM_FIELDS = ["textSize", "emojiSize", "holeDiameter", "holeInset", "margin", "gap", "cornerRadius", "lineSpacing", "anchoFijo", "altoFijo"];
let lastSVG = null;
let lastName = "cartel";
let categoriaActual = 0;

function applyDefaultsToUI() {
  for (const k of NUM_FIELDS) el(k).value = DEFAULTS[k];
  el("fontFamily").value = FONT_DEFAULT;
  el("fontBold").checked = true;
  el("holes").value = DEFAULTS.holes;
  el("color").value = DEFAULTS.color;
  el("colorCorte").value = DEFAULTS.colorCorte;
  el("cutOther").checked = true;
  el("emojiWeight").value = "400";
  syncUI();
}

function syncUI() {
  const f = fuenteElegida();
  const tieneNegrita = f.pesos.includes(700);
  el("fontBold").disabled = !tieneNegrita;
  el("emoji-panel").hidden = !el("emojiOn").checked;
  const hay = el("holes").value !== "none";
  el("holeDiameter").disabled = !hay;
  el("holeInset").disabled = !hay;
  el("cutColorRow").hidden = !el("cutOther").checked;
}

const posEmoji = () => document.querySelector('input[name="emojiPos"]:checked')?.value || "top";

function readParams() {
  const p = { ...DEFAULTS };
  for (const k of NUM_FIELDS) {
    const raw = el(k).value;
    const v = Number(raw);
    p[k] = raw !== "" && Number.isFinite(v) ? v : DEFAULTS[k];
  }
  p.holes = el("holes").value;
  p.emoji = el("emojiOn").checked ? primerEmoji(el("emoji").value) : "";
  p.emojiPos = posEmoji();
  p.color = el("color").value || DEFAULTS.color;
  p.colorCorte = el("cutOther").checked ? el("colorCorte").value : null;
  return p;
}

// ---------------------------------------------------------------------
// Selector de emoji
// ---------------------------------------------------------------------

function pintarCategorias() {
  const tabs = el("cat-tabs");
  tabs.replaceChildren();
  CATEGORIAS.forEach((c, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = c.nombre;
    b.className = i === categoriaActual ? "active" : "";
    b.addEventListener("click", () => { categoriaActual = i; pintarCategorias(); });
    tabs.append(b);
  });
  const grid = el("emoji-grid");
  grid.replaceChildren();
  const actual = primerEmoji(el("emoji").value);
  for (const em of CATEGORIAS[categoriaActual].emojis) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = em;
    b.title = em;
    if (em === actual) b.className = "sel";
    b.addEventListener("click", () => { fijarEmoji(em); });
    grid.append(b);
  }
}

function fijarEmoji(em) {
  el("emoji").value = em;
  el("emojiOn").checked = true;
  refrescarEmoji();
  pintarCategorias();
  scheduleGenerate();
}

function refrescarEmoji() {
  el("emoji-big").textContent = primerEmoji(el("emoji").value);
}

// ---------------------------------------------------------------------
// Vista previa y descarga
// ---------------------------------------------------------------------

const slug = (t) => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "cartel";

function luminancia(hex) {
  const n = parseInt(String(hex).replace("#", ""), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

downloadBtn.addEventListener("click", () => {
  if (lastSVG) saveBlob(new Blob([lastSVG], { type: "image/svg+xml" }), `${lastName}.svg`);
});

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.classList.toggle("error", isError);
}

let busy = false, pending = false;

async function generate() {
  if (busy) { pending = true; return; }
  busy = true;
  try {
    const p = readParams();
    const f = fuenteElegida();
    const peso = el("fontBold").checked && f.pesos.includes(700) ? 700 : 400;
    const pesoEmoji = el("emojiWeight").value === "700" ? 700 : 400;
    const [fTexto, fEmoji] = await Promise.all([
      cargarFuente(f.archivo, peso, f.ext),
      p.emoji ? cargarFuente("noto-emoji", pesoEmoji, "ttf") : Promise.resolve(null),
    ]);
    const texto = el("texto").value;
    const c = construirCartel({ texto: fTexto, emoji: fEmoji }, texto, p);
    const hayAlgo = c.inner.includes('id="figura-texto"') || c.inner.includes('id="figura-emoji"');
    const svg = envolverSVG(c.w, c.h, c.inner, texto.split("\n")[0].trim());
    holder.innerHTML = svg;
    const claros = luminancia(p.color) > 0.8 && luminancia(p.colorCorte || p.color) > 0.8;
    holder.classList.toggle("oscuro", claros);
    el("stats").textContent = `${c.w.toFixed(1)} × ${c.h.toFixed(1)} mm`;
    el("avisos").textContent = c.avisos.join(" ");
    lastSVG = svg;
    lastName = slug(texto.split("\n")[0]);
    downloadBtn.disabled = !hayAlgo;
    setStatus(hayAlgo ? "Listo. Puedes descargar el SVG." : "Escribe algún texto o elige un emoji.");
  } catch (err) {
    console.error(err);
    setStatus("Error al generar: " + (err?.message || err), true);
  } finally {
    busy = false;
    if (pending) { pending = false; generate(); }
  }
}

let debounce = null;
function scheduleGenerate() { clearTimeout(debounce); debounce = setTimeout(generate, 250); }

// ---------------------------------------------------------------------
// Eventos y arranque
// ---------------------------------------------------------------------

function onInput() { syncUI(); scheduleGenerate(); }

el("texto").addEventListener("input", onInput);
for (const k of NUM_FIELDS) el(k).addEventListener("input", onInput);
for (const k of ["fontFamily", "fontBold", "holes", "color", "colorCorte", "cutOther", "emojiWeight", "emojiOn"]) {
  el(k).addEventListener("input", onInput);
  el(k).addEventListener("change", onInput);
}
document.querySelectorAll('input[name="emojiPos"]').forEach((r) => r.addEventListener("change", onInput));
el("emoji").addEventListener("input", () => { refrescarEmoji(); pintarCategorias(); onInput(); });
el("reset-btn").addEventListener("click", () => { applyDefaultsToUI(); onInput(); });

rellenarFuentes();
applyDefaultsToUI();
el("emoji").value = "📚";
refrescarEmoji();
pintarCategorias();

generate();
