import assert from "node:assert/strict";
import fs from "node:fs";
import opentype from "opentype.js";
import { construirCartel, envolverSVG, primerEmoji, DEFAULTS } from "../docs/svg.js";

const cargar = (f) => { const b = fs.readFileSync(new URL(`../docs/fonts/${f}`, import.meta.url)); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const fuentes = { texto: cargar("atkinson-hyperlegible-700.woff"), emoji: cargar("noto-emoji-400.ttf") };

const sinNaN = (s) => assert.ok(!/NaN|undefined|Infinity/.test(s), "valores raros en el SVG");

// --- solo texto ---
const t = construirCartel(fuentes, "Despacho", { });
assert.ok(t.w > 40 && t.h > 20);
assert.ok(t.inner.includes('id="figura-texto"') && !t.inner.includes('id="figura-emoji"') && !t.inner.includes("agujeros"));
assert.ok(t.inner.includes('stroke="#ff0000"'), "corte en rojo por defecto");
assert.ok(t.inner.includes('fill="#000000"'));
sinNaN(t.inner);
// el texto queda centrado en la placa
{ const c = t.cajas.texto; assert.ok(Math.abs(c.x + c.w / 2 - t.w / 2) < 1e-6 && Math.abs(c.y + c.h / 2 - t.h / 2) < 1e-6); }

// --- posiciones del emoji ---
const pos = {};
for (const ep of ["top", "bottom", "left", "right"]) {
  const c = construirCartel(fuentes, "Biblioteca", { emoji: "📚", emojiPos: ep, emojiSize: 30 });
  assert.ok(c.inner.includes('id="figura-emoji"') && c.inner.includes('id="figura-texto"'), ep);
  const e = c.cajas.emoji, x = c.cajas.texto;
  pos[ep] = { c, e, x };
  // nada se sale de la placa y emoji y texto no se pisan
  for (const b of [e, x]) assert.ok(b.x >= -1e-6 && b.y >= -1e-6 && b.x + b.w <= c.w + 1e-6 && b.y + b.h <= c.h + 1e-6, `${ep} dentro`);
  const solapa = e.x < x.x + x.w && x.x < e.x + e.w && e.y < x.y + x.h && x.y < e.y + e.h;
  assert.ok(!solapa, `${ep} sin solape`);
  sinNaN(c.inner);
}
assert.ok(pos.top.e.y + pos.top.e.h <= pos.top.x.y);
assert.ok(pos.bottom.x.y + pos.bottom.x.h <= pos.bottom.e.y);
assert.ok(pos.left.e.x + pos.left.e.w <= pos.left.x.x);
assert.ok(pos.right.x.x + pos.right.x.w <= pos.right.e.x);
assert.ok(pos.top.c.h > pos.left.c.h && pos.left.c.w > pos.top.c.w, "apilado vs. en fila");

// --- agujeros ---
const base = construirCartel(fuentes, "Hola", { emoji: "😀" });
for (const [modo, n] of [["none", 0], ["left", 1], ["right", 1], ["both", 2]]) {
  const c = construirCartel(fuentes, "Hola", { emoji: "😀", holes: modo, holeDiameter: 6, holeInset: 4 });
  assert.equal(c.cajas.agujeros.length, n, modo);
  assert.equal(c.inner.includes('id="agujeros"'), n > 0);
  if (n) assert.ok(c.w > base.w, "hace sitio para el agujero");
  for (const a of c.cajas.agujeros) {
    assert.equal(a.r, 3);
    assert.ok(Math.abs(a.y - c.h / 2) < 1e-9);
    assert.ok(a.x - a.r >= 4 - 1e-9 && a.x + a.r <= c.w - 4 + 1e-9, "a la distancia pedida del borde");
    // el agujero no toca el contenido
    for (const b of [c.cajas.texto, c.cajas.emoji]) assert.ok(a.x + a.r <= b.x || a.x - a.r >= b.x + b.w);
  }
  if (modo === "left") assert.ok(c.cajas.agujeros[0].x < c.w / 2);
  if (modo === "right") assert.ok(c.cajas.agujeros[0].x > c.w / 2);
}
// el tamaño del agujero cambia el diámetro
{ const a = construirCartel(fuentes, "Hola", { holes: "both", holeDiameter: 3 }), b = construirCartel(fuentes, "Hola", { holes: "both", holeDiameter: 8 });
  assert.equal(a.cajas.agujeros[0].r, 1.5); assert.equal(b.cajas.agujeros[0].r, 4); }

// --- colores ---
const azul = construirCartel(fuentes, "Hola", { color: "#1a4fb5", colorCorte: "#00aa00" });
assert.ok(azul.inner.includes('fill="#1a4fb5"') && azul.inner.includes('stroke="#00aa00"'));
const mismo = construirCartel(fuentes, "Hola", { color: "#1a4fb5", colorCorte: null });
assert.ok(mismo.inner.includes('stroke="#1a4fb5"') && !mismo.inner.includes("#ff0000"));

// --- tamaño fijo: se reduce si no cabe, se centra si sobra ---
{
  const grande = construirCartel(fuentes, "Un texto bastante largo para esta placa", { anchoFijo: 80, altoFijo: 40, emoji: "🚀" });
  assert.equal(grande.w, 80); assert.equal(grande.h, 40);
  assert.ok(grande.escala < 1 && grande.avisos.some((a) => /reducido/.test(a)));
  for (const b of [grande.cajas.texto, grande.cajas.emoji]) assert.ok(b.x >= -1e-6 && b.x + b.w <= 80 + 1e-6 && b.y >= -1e-6 && b.y + b.h <= 40 + 1e-6);
  const holgado = construirCartel(fuentes, "Hola", { anchoFijo: 200, altoFijo: 100 });
  assert.equal(holgado.escala, 1);
  assert.ok(Math.abs(holgado.cajas.texto.x + holgado.cajas.texto.w / 2 - 100) < 1e-6);
}

// --- texto multilínea, solo emoji, emoji inexistente, vacío ---
{
  const m = construirCartel(fuentes, "Sala 1\nPlanta baja", { textSize: 10 });
  assert.ok(m.cajas.texto.h > 10 * 1.2, "dos líneas");
  const e = construirCartel(fuentes, "", { emoji: "🏠" });
  assert.ok(e.inner.includes('id="figura-emoji"') && !e.inner.includes('id="figura-texto"'));
  const malo = construirCartel(fuentes, "Hola", { emoji: "\u{10FFFD}" });
  assert.equal(malo.avisos.length, 1);
  assert.ok(!malo.inner.includes('id="figura-emoji"') && malo.inner.includes('id="figura-texto"'));
  const nada = construirCartel(fuentes, "", { });
  assert.ok(nada.w >= 10 && !/NaN/.test(nada.inner));
}
assert.equal(primerEmoji("  ❤️ extra"), "❤");
assert.equal(primerEmoji(""), "");

// --- SVG final ---
const svg = envolverSVG(t.w, t.h, t.inner, "Despacho <b>");
assert.match(svg, /^<svg [^>]*width="[\d.]+mm" height="[\d.]+mm" viewBox="0 0 [\d.]+ [\d.]+"/);
assert.ok(!svg.includes("<text") && !svg.includes("transform"), "sin <text> ni transformaciones");
assert.ok(svg.indexOf('id="grabado"') < svg.indexOf('id="corte"'), "el corte va el último");
assert.ok(!svg.includes("<b>"));

if (process.env.SVG_OUT) {
  const out = process.env.SVG_OUT;
  const casos = {
    top: { emoji: "📚", emojiPos: "top", holes: "both" },
    left: { emoji: "🚀", emojiPos: "left", holes: "left" },
    right: { emoji: "🦊", emojiPos: "right", holes: "right", color: "#1a4fb5" },
    bottom: { emoji: "🏠", emojiPos: "bottom", holes: "none" },
  };
  for (const [n, p] of Object.entries(casos)) {
    const c = construirCartel(fuentes, n === "left" ? "Sala de\nordenadores" : "Biblioteca", p);
    fs.writeFileSync(`${out}/${n}.svg`, envolverSVG(c.w, c.h, c.inner));
  }
}
console.log(`motor SVG OK → solo texto ${t.w.toFixed(1)} × ${t.h.toFixed(1)} mm`);
