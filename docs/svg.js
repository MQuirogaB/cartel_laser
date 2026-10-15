// Cartel en SVG para corte y grabado láser. Todo en milímetros.
//
//   <g id="grabado">  texto y emoji como formas rellenas (trazados, sin <text>)
//   <g id="corte">    contorno de la placa y agujeros, como línea fina (por defecto en rojo)
//
// El texto y el emoji van convertidos a trazados con opentype.js, así que el archivo no
// depende de ninguna letra instalada en el programa del láser.

export const POSICIONES_EMOJI = ["top", "bottom", "left", "right"];
export const AGUJEROS = ["none", "left", "right", "both"];

export const DEFAULTS = {
  color: "#000000",        // grabado (texto y emoji)
  colorCorte: "#ff0000",   // contorno y agujeros; null = el mismo que el grabado
  textSize: 16,            // tamaño de letra (mm)
  lineSpacing: 1.2,        // interlineado (múltiplo del tamaño)
  emoji: "",               // un emoji (vacío = sin emoji)
  emojiPos: "top",         // top | bottom | left | right (respecto al texto)
  emojiSize: 30,           // lado mayor del emoji (mm)
  gap: 5,                  // separación texto-emoji
  margin: 8,               // margen entre el contenido y el borde (o el agujero)
  cornerRadius: 6,
  holes: "none",           // none | left | right | both
  holeDiameter: 5,
  holeInset: 5,            // distancia del borde de la placa al borde del agujero
  anchoFijo: 0,            // 0 = automático
  altoFijo: 0,
  strokeWidth: 0.1,        // grosor de la línea de corte (mm)
};

const r3 = (n) => Math.round(n * 1000) / 1000;
const num = (v, def) => (Number.isFinite(v) ? v : def);

export function sanear(p) {
  const q = { ...DEFAULTS, ...p };
  q.textSize = Math.max(1, num(q.textSize, DEFAULTS.textSize));
  q.lineSpacing = Math.max(0.8, num(q.lineSpacing, DEFAULTS.lineSpacing));
  q.emojiSize = Math.max(2, num(q.emojiSize, DEFAULTS.emojiSize));
  q.gap = Math.max(0, num(q.gap, DEFAULTS.gap));
  q.margin = Math.max(0, num(q.margin, DEFAULTS.margin));
  q.cornerRadius = Math.max(0, num(q.cornerRadius, DEFAULTS.cornerRadius));
  q.holeDiameter = Math.max(0.5, num(q.holeDiameter, DEFAULTS.holeDiameter));
  q.holeInset = Math.max(0, num(q.holeInset, DEFAULTS.holeInset));
  q.anchoFijo = Math.max(0, num(q.anchoFijo, 0));
  q.altoFijo = Math.max(0, num(q.altoFijo, 0));
  if (!POSICIONES_EMOJI.includes(q.emojiPos)) q.emojiPos = "top";
  if (!AGUJEROS.includes(q.holes)) q.holes = "none";
  return q;
}

// ---------------------------------------------------------------------
// Trazados
// ---------------------------------------------------------------------

function cajaDe(cmds) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  const toca = (x, y) => { if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y; };
  let cx = 0, cy = 0;
  for (const c of cmds) {
    if (c.type === "Z") continue;
    if (c.type === "Q") {
      // extremos de la curva cuadrática (rápido y suficiente para centrar)
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const mt = 1 - t;
        toca(mt * mt * cx + 2 * mt * t * c.x1 + t * t * c.x, mt * mt * cy + 2 * mt * t * c.y1 + t * t * c.y);
      }
    } else if (c.type === "C") {
      for (const t of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
        const mt = 1 - t;
        toca(
          mt ** 3 * cx + 3 * mt * mt * t * c.x1 + 3 * mt * t * t * c.x2 + t ** 3 * c.x,
          mt ** 3 * cy + 3 * mt * mt * t * c.y1 + 3 * mt * t * t * c.y2 + t ** 3 * c.y,
        );
      }
    } else toca(c.x, c.y);
    cx = c.x; cy = c.y;
  }
  return { x1, y1, x2, y2 };
}

/** Aplica x' = x*k + dx, y' = y*k + dy a todos los puntos. */
function mover(cmds, k, dx, dy) {
  return cmds.map((c) => {
    const o = { type: c.type };
    if (c.type === "Z") return o;
    o.x = c.x * k + dx; o.y = c.y * k + dy;
    if (c.type === "Q" || c.type === "C") { o.x1 = c.x1 * k + dx; o.y1 = c.y1 * k + dy; }
    if (c.type === "C") { o.x2 = c.x2 * k + dx; o.y2 = c.y2 * k + dy; }
    return o;
  });
}

function aD(cmds) {
  let d = "";
  for (const c of cmds) {
    if (c.type === "Z") d += "Z";
    else if (c.type === "M" || c.type === "L") d += `${c.type}${r3(c.x)} ${r3(c.y)}`;
    else if (c.type === "Q") d += `Q${r3(c.x1)} ${r3(c.y1)} ${r3(c.x)} ${r3(c.y)}`;
    else if (c.type === "C") d += `C${r3(c.x1)} ${r3(c.y1)} ${r3(c.x2)} ${r3(c.y2)} ${r3(c.x)} ${r3(c.y)}`;
  }
  return d;
}

function rectRedondeado(w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  if (r <= 0) return `M0 0H${r3(w)}V${r3(h)}H0Z`;
  return (
    `M${r3(r)} 0H${r3(w - r)}A${r3(r)} ${r3(r)} 0 0 1 ${r3(w)} ${r3(r)}` +
    `V${r3(h - r)}A${r3(r)} ${r3(r)} 0 0 1 ${r3(w - r)} ${r3(h)}` +
    `H${r3(r)}A${r3(r)} ${r3(r)} 0 0 1 0 ${r3(h - r)}` +
    `V${r3(r)}A${r3(r)} ${r3(r)} 0 0 1 ${r3(r)} 0Z`
  );
}

function circulo(cx, cy, r) {
  return `M${r3(cx - r)} ${r3(cy)}A${r3(r)} ${r3(r)} 0 1 0 ${r3(cx + r)} ${r3(cy)}A${r3(r)} ${r3(r)} 0 1 0 ${r3(cx - r)} ${r3(cy)}Z`;
}

/** Primer carácter de emoji de la cadena (sin selectores de variación ni uniones). */
export function primerEmoji(s) {
  const chars = Array.from(String(s || "")).filter((c) => !/[︎️‍⃣]/.test(c) && !/\s/.test(c));
  return chars[0] || "";
}

// ---------------------------------------------------------------------
// Construcción
// ---------------------------------------------------------------------

/**
 * Construye el cartel. `fuentes` = { texto: Font, emoji: Font }.
 * Devuelve { w, h, inner, avisos, cajas } con el origen arriba a la izquierda.
 */
export function construirCartel(fuentes, texto, p) {
  const q = sanear(p);
  const avisos = [];
  const F = q.textSize;

  // --- texto: cada línea centrada por su tinta, bloque medido por su tinta ---
  const lineas = String(texto || "").split("\n").map((l) => l.trim());
  while (lineas.length && !lineas[lineas.length - 1]) lineas.pop();
  while (lineas.length && !lineas[0]) lineas.shift();
  let textoCmds = [];
  let tmax = 0, ty1 = Infinity, ty2 = -Infinity;
  const porLinea = [];
  lineas.forEach((l, i) => {
    if (!l) return;
    const cmds = fuentes.texto.getPath(l, 0, i * F * q.lineSpacing, F).commands;
    const b = cajaDe(cmds);
    if (!Number.isFinite(b.x1)) return;
    porLinea.push({ cmds, b });
    ty1 = Math.min(ty1, b.y1); ty2 = Math.max(ty2, b.y2);
    tmax = Math.max(tmax, b.x2 - b.x1);
  });
  const hayTexto = porLinea.length > 0;
  let tw = 0, th = 0;
  if (hayTexto) {
    tw = tmax;
    th = ty2 - ty1;
    // centra cada línea en x=0 y el bloque en y=0
    const yc = (ty1 + ty2) / 2;
    for (const l of porLinea) textoCmds.push(...mover(l.cmds, 1, -(l.b.x1 + l.b.x2) / 2, -yc));
  }

  // --- emoji ---
  let emojiCmds = [];
  let ew = 0, eh = 0;
  const ch = primerEmoji(q.emoji);
  let hayEmoji = false;
  if (ch) {
    if (!fuentes.emoji || fuentes.emoji.charToGlyphIndex(ch) <= 0) {
      avisos.push(`El emoji «${ch}» no está disponible en la fuente de emojis.`);
    } else {
      const cmds = fuentes.emoji.getPath(ch, 0, 0, 1000).commands;
      const b = cajaDe(cmds);
      const bw = b.x2 - b.x1, bh = b.y2 - b.y1;
      if (bw > 0 && bh > 0) {
        const k = q.emojiSize / Math.max(bw, bh);
        emojiCmds = mover(cmds, k, -((b.x1 + b.x2) / 2) * k, -((b.y1 + b.y2) / 2) * k);
        ew = bw * k; eh = bh * k;
        hayEmoji = true;
      }
    }
  }

  // --- composición del bloque (centrado en 0,0, tamaño natural) ---
  const g = hayTexto && hayEmoji ? q.gap : 0;
  let cw, chh, tpos = [0, 0], epos = [0, 0];
  if (hayTexto && hayEmoji) {
    if (q.emojiPos === "top" || q.emojiPos === "bottom") {
      cw = Math.max(tw, ew); chh = eh + g + th;
      const yE = -chh / 2 + eh / 2, yT = chh / 2 - th / 2;
      if (q.emojiPos === "top") { epos = [0, yE]; tpos = [0, yT]; }
      else { epos = [0, -yE]; tpos = [0, -yT]; }
    } else {
      cw = ew + g + tw; chh = Math.max(th, eh);
      const xE = -cw / 2 + ew / 2, xT = cw / 2 - tw / 2;
      if (q.emojiPos === "left") { epos = [xE, 0]; tpos = [xT, 0]; }
      else { epos = [-xE, 0]; tpos = [-xT, 0]; }
    }
  } else if (hayTexto) { cw = tw; chh = th; }
  else if (hayEmoji) { cw = ew; chh = eh; }
  else { cw = 0; chh = 0; }

  // --- placa ---
  const izq = q.holes === "left" || q.holes === "both";
  const der = q.holes === "right" || q.holes === "both";
  const zonaAg = q.holeInset + q.holeDiameter;
  const padL = izq ? zonaAg + q.margin * 0.5 : q.margin; // junto a un agujero basta media separación
  const padR = der ? zonaAg + q.margin * 0.5 : q.margin;
  const padV = q.margin;
  const wNat = cw + padL + padR;
  const hNat = chh + 2 * padV;
  const W = q.anchoFijo > 0 ? q.anchoFijo : Math.max(wNat, 10);
  const H = q.altoFijo > 0 ? q.altoFijo : Math.max(hNat, 10);

  // si el tamaño es fijo y el contenido no cabe, se reduce todo proporcionalmente
  const dispW = W - padL - padR, dispH = H - 2 * padV;
  let s = 1;
  if (cw > 0 && chh > 0) s = Math.min(1, dispW > 0 ? dispW / cw : 0.01, dispH > 0 ? dispH / chh : 0.01);
  if (s < 0.999) avisos.push(`El contenido no cabe en ${W} × ${H} mm: se ha reducido al ${Math.round(s * 100)} %.`);
  s = Math.max(s, 0.01);
  const ox = padL + dispW / 2, oy = padV + dispH / 2; // centro del contenido

  const cajas = {};
  const grabado = [];
  if (hayEmoji) {
    const c = mover(emojiCmds, s, ox + epos[0] * s, oy + epos[1] * s);
    grabado.push(`<path id="figura-emoji" d="${aD(c)}"/>`);
    cajas.emoji = { x: ox + (epos[0] - ew / 2) * s, y: oy + (epos[1] - eh / 2) * s, w: ew * s, h: eh * s };
  }
  if (hayTexto) {
    const c = mover(textoCmds, s, ox + tpos[0] * s, oy + tpos[1] * s);
    grabado.push(`<path id="figura-texto" d="${aD(c)}"/>`);
    cajas.texto = { x: ox + (tpos[0] - tw / 2) * s, y: oy + (tpos[1] - th / 2) * s, w: tw * s, h: th * s };
  }

  // --- corte ---
  const cut = q.colorCorte || q.color;
  let corte = `<path id="contorno" d="${rectRedondeado(W, H, q.cornerRadius)}"/>`;
  const centros = [];
  const rr = q.holeDiameter / 2;
  if (izq) centros.push([q.holeInset + rr, H / 2]);
  if (der) centros.push([W - q.holeInset - rr, H / 2]);
  if (centros.length) {
    if (q.holeDiameter > H * 0.8) avisos.push("El agujero es casi tan grande como la altura de la placa.");
    corte += `<path id="agujeros" d="${centros.map(([x, y]) => circulo(x, y, rr)).join("")}"/>`;
  }
  cajas.agujeros = centros.map(([x, y]) => ({ x, y, r: rr }));

  const inner =
    `<g id="grabado" fill="${q.color}" stroke="none">${grabado.join("")}</g>` +
    `<g id="corte" fill="none" stroke="${cut}" stroke-width="${q.strokeWidth}">${corte}</g>`;
  return { w: W, h: H, inner, avisos, cajas, escala: s };
}

export function envolverSVG(w, h, inner, titulo = "") {
  const t = titulo ? `<title>${titulo.replace(/[<&>"]/g, "")}</title>` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${r3(w)}mm" height="${r3(h)}mm" viewBox="0 0 ${r3(w)} ${r3(h)}">` +
    t + inner + `</svg>\n`
  );
}
