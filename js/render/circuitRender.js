'use strict';

// =========================================================
// circuitRender.js — SVG Gate-Level Schematic Generator
// Converts the minimized Boolean equations from logicEngine.js
// into a fully routed SVG schematic drawn in the Circuit panel.
//
// Layout zones (left → right):
//   Input bus  →  NOT gates  →  AND stage  →  OR stage  →  FF inlet  →  Flip-Flops
//   Feedback wires run below the FFs back to the bus columns.
// =========================================================

let svgScale = 1;

// Legacy zoom helpers (kept for backward compatibility with circuitInteraction.js).
// The primary zoom path uses applyCanvasZoom() in circuitInteraction.js instead.
function svgZoom(f) { svgScale *= f; applySvgScale(); }
function svgReset() { svgScale = 1; applySvgScale(); }
function svgFit() {
  const c = document.getElementById('svg-container');
  const s = document.getElementById('circuit-svg');
  if (!s) return;
  const vb = s.viewBox.baseVal;
  svgScale = Math.min(c.clientWidth / vb.width, c.clientHeight / vb.height) * 0.95;
  applySvgScale();
}
function applySvgScale() {
  const s = document.getElementById('circuit-svg');
  if (!s) return;
  const vb = s.viewBox.baseVal;
  s.style.width  = (vb.width  * svgScale) + 'px';
  s.style.height = (vb.height * svgScale) + 'px';
}

// =========================================================
// SVG Primitive Helpers
// =========================================================

// Shortcut for document.createElementNS with the SVG namespace
function mkEl(tag) { return document.createElementNS('http://www.w3.org/2000/svg', tag); }

function svgRect(g, x, y, w, h, fill, stroke, sw = 2, rx = 4) {
  const r = mkEl('rect');
  r.setAttribute('x', x); r.setAttribute('y', y);
  r.setAttribute('width', w); r.setAttribute('height', h);
  r.setAttribute('fill', fill); r.setAttribute('stroke', stroke);
  r.setAttribute('stroke-width', sw); r.setAttribute('rx', rx);
  g.appendChild(r);
}

function svgLine(g, x1, y1, x2, y2, color = '#333', sw = '1.5', dash = '') {
  const l = mkEl('line');
  l.setAttribute('x1', x1); l.setAttribute('y1', y1);
  l.setAttribute('x2', x2); l.setAttribute('y2', y2);
  l.setAttribute('stroke', color); l.setAttribute('stroke-width', sw);
  if (dash) l.setAttribute('stroke-dasharray', dash);
  g.appendChild(l);
}

function svgText(g, x, y, text, fill = '#333', size = 12, weight = 'normal', anchor = 'start') {
  const t = mkEl('text');
  t.setAttribute('x', x); t.setAttribute('y', y);
  t.setAttribute('fill', fill); t.setAttribute('font-size', size);
  t.setAttribute('font-weight', weight); t.setAttribute('text-anchor', anchor);
  t.setAttribute('font-family', 'Segoe UI, Arial, sans-serif');
  t.textContent = text;
  g.appendChild(t);
}

function svgCircle(g, cx, cy, r, fill, stroke, sw = 1) {
  const c = mkEl('circle');
  c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r);
  c.setAttribute('fill', fill); c.setAttribute('stroke', stroke); c.setAttribute('stroke-width', sw);
  g.appendChild(c);
}

// =========================================================
// Logic Gate Shapes
// =========================================================

const GW = 46; // Gate body width in SVG units

// Draws an AND gate (D-shaped body) and returns input port and output port coords.
// isZ=true colors the output wire red (used for the Z output path).
function drawGateAND(g, lx, cy, ni, isZ = false) {
  const col = isZ ? '#c00' : '#333';
  const h = Math.max(36, ni * 14 + 12);
  const ty = cy - h/2;
  const path = mkEl('path');
  path.setAttribute('d', `M${lx},${ty} L${lx+GW*0.5},${ty} A${GW*0.5},${h/2} 0 0,1 ${lx+GW*0.5},${ty+h} L${lx},${ty+h} Z`);
  path.setAttribute('fill','#fff'); path.setAttribute('stroke','#333'); path.setAttribute('stroke-width','1.5');
  g.appendChild(path);
  svgText(g, lx+12, cy+4, '&', '#333', 10, 'bold', 'middle');
  const ins = [];
  const startY = cy - ((ni - 1) * 14) / 2;
  for (let i = 0; i < ni; i++) {
    const py = startY + i * 14;
    svgLine(g, lx-14, py, lx, py, '#333', '1.5');
    ins.push({x:lx-14, y:py});
  }
  svgLine(g, lx+GW, cy, lx+GW+14, cy, col, '1.5');
  return {ins, out:{x:lx+GW+14, y:cy}};
}

// Draws an OR gate (curved body with concave input side) and returns port coords.
function drawGateOR(g, lx, cy, ni, isZ = false) {
  const col = isZ ? '#c00' : '#333';
  const h = Math.max(36, ni * 14 + 12);
  const ty = cy - h/2;
  const path = mkEl('path');
  path.setAttribute('d', `M${lx},${ty} Q${lx+GW*0.18},${cy} ${lx},${ty+h} Q${lx+GW*0.68},${ty+h} ${lx+GW},${cy} Q${lx+GW*0.68},${ty} ${lx},${ty} Z`);
  path.setAttribute('fill','#fff'); path.setAttribute('stroke','#333'); path.setAttribute('stroke-width','1.5');
  g.appendChild(path);
  svgText(g, lx+17, cy+4, '≥1', '#333', 9, 'bold', 'middle');
  const ins = [];
  const startY = cy - ((ni - 1) * 14) / 2;
  for (let i = 0; i < ni; i++) {
    const py = startY + i * 14;
    svgLine(g, lx-14, py, lx+4, py, '#333', '1.5');
    ins.push({x:lx-14, y:py});
  }
  svgLine(g, lx+GW, cy, lx+GW+14, cy, col, '1.5');
  return {ins, out:{x:lx+GW+14, y:cy}};
}

// Draws a NOT gate (triangle + bubble) and returns input and output port coords.
function drawGateNOT(g, lx, cy) {
  const NW = 26, NH = 22;
  const ty = cy - NH/2;
  const path = mkEl('path');
  path.setAttribute('d', `M${lx},${ty} L${lx+NW},${cy} L${lx},${ty+NH} Z`);
  path.setAttribute('fill','#fff'); path.setAttribute('stroke','#333'); path.setAttribute('stroke-width','1.5');
  g.appendChild(path);
  svgCircle(g, lx+NW+5, cy, 4.5, '#fff', '#333', 1.5);
  return {in:{x:lx,y:cy}, out:{x:lx+NW+9.5, y:cy}};
}

// Routes a wire from (x1,y1) to (x2,y2) using a 3-segment L-shaped path.
// idx offsets the elbow column to prevent wires from overlapping.
function wireTo(g, x1, y1, x2, y2, idx, isZ = false) {
  const col = isZ ? '#c00' : '#333';
  if (Math.abs(y1 - y2) < 2) {
    svgLine(g, x1, y1, x2, y2, col, '1.5');
    return;
  }
  const midX = x1 + 10 + idx * 8;
  svgLine(g, x1, y1, midX, y1, col, '1.5');
  svgLine(g, midX, y1, midX, y2, col, '1.5');
  svgLine(g, midX, y2, x2, y2, col, '1.5');
}

// Draws the rectangular flip-flop block with pin labels, clock triangle,
// and Q/Q' output stubs. bitNum is used for labeling purposes only.
function drawFFBox(g, x, y, w, h, bitNum, ffType) {
  svgRect(g, x, y, w, h, '#fff', '#333', 1.5, 3);
  svgText(g, x+w/2, y+34, ffType, '#333', 13, 'bold', 'middle');
  svgText(g, x+w/2, y+48, 'Flip-Flop', '#555', 9, 'normal', 'middle');

  const isT = ffType === 'T' || ffType === 'D';
  const pins = ffType === 'JK' ? ['J','K'] : [ffType];

  pins.forEach((pin, i) => {
    const py = isT ? y + h/2 : (i === 0 ? y + 35 : y + 105);
    svgText(g, x+6, py+4, pin, '#333', 11, 'bold');
    svgLine(g, x-14, py, x, py, '#333', '1.5');
  });

  const qY  = isT ? y + h/2 - 20 : y + 35;
  const qpY = isT ? y + h/2 + 20 : y + 105;

  svgText(g, x+w-6, qY+4,  'Q',  '#333', 10, 'bold',   'end');
  svgText(g, x+w-6, qpY+4, "Q'", '#333', 10, 'normal', 'end');
  svgLine(g, x+w, qY,  x+w+16, qY,  '#333', '1.5');
  svgLine(g, x+w, qpY, x+w+16, qpY, '#333', '1.5');

  // Standard clock input triangle symbol at the bottom of the FF body
  const tx = x + w*0.5;
  const tri = mkEl('polygon');
  tri.setAttribute('points', `${tx-6},${y+h} ${tx+6},${y+h} ${tx},${y+h-8}`);
  tri.setAttribute('fill', 'none');
  tri.setAttribute('stroke', '#333');
  tri.setAttribute('stroke-width', '1.5');
  g.appendChild(tri);
}

// =========================================================
// Main SVG Schematic Renderer
// =========================================================

// Builds the complete sequential circuit SVG from lastResult and injects it
// into #svg-container. The schematic renders in 5 horizontal zones:
//   Zone 1 — input bus + NOT tap wires
//   Zone 2 — AND gates (one per product term per FF input)
//   Zone 3 — OR gate (sums AND outputs, or direct wire if only one term)
//   Zone 4 — FF inlet point (where wire meets the FF input pin)
//   Zone 5 — Flip-flop boxes + Q/Q' feedback wires
function renderOutput2({ eqs, ffType, nFF, varNames, outVar }) {
  // Parse all equations into flat ASTs for gate-level drawing
  const parsed = {};
  Object.keys(eqs).forEach(k => { parsed[k] = flatAST(parseBool(eqs[k])); });

  const inVars = varNames.slice(nFF), stVars = varNames.slice(0, nFF);
  const needComp = new Set();

  // Find all variables that appear complemented (A') so NOT gates can be added
  function findC(a) {
    if(!a) return;
    if(a.t === 'not' && a.c[0].t === 'v') { needComp.add(a.c[0].v); return; }
    if(a.c) a.c.forEach(findC);
  }
  Object.values(parsed).forEach(findC);

  // Build the ordered list of bus signals: inputs first, then states
  // Each signal that needs a complement gets a second entry (e.g. "A" and "A'")
  let allSigs = [];
  inVars.forEach(v => {
    allSigs.push(v);
    if (needComp.has(v)) allSigs.push(v + "'");
  });
  for (let b = nFF - 1; b >= 0; b--) {
    allSigs.push(`Q${b}`);
    if (needComp.has(`Q${b}`)) allSigs.push(`Q${b}'`);
  }

  // -------------------------------------------------------
  // Zone coordinate constants
  // -------------------------------------------------------
  const BUS_SPACING = 24;  // Horizontal distance between bus wire columns
  const BUS_START_X = 140; // X offset where the first bus column begins
  const maxSigs = allSigs.length;

  const sigY = {};
  // Maps a signal name to its X coordinate on the vertical bus
  function busX(nm) { return BUS_START_X + allSigs.indexOf(nm) * BUS_SPACING; }

  const MAX_BUS_X = BUS_START_X + (maxSigs - 1) * BUS_SPACING;

  const AND_X    = MAX_BUS_X + 60;   // Left edge of AND gate bodies
  const OR_X     = AND_X + 120;      // Left edge of OR gate bodies
  const FF_INLET = OR_X + 80;        // Point where logic output meets FF input pin
  const FF_X     = FF_INLET + 14;    // Left edge of FF box
  const FF_W     = 100, FF_H = 120;
  const FF_RIGHT = FF_X + FF_W;
  const Z_X      = FF_INLET;         // X anchor for the output (Z) logic stage

  const MAX_FB_X = FF_RIGHT + 30 + (nFF * 2) * 14;
  const SVG_W = Math.max(MAX_FB_X + 40, Z_X + 120);

  const isT = ffType === 'T' || ffType === 'D';

  // Vertical positions for each FF block (MSB at top)
  const ffTopY = {};
  const TOP_MARGIN = 80;
  const FF_GAP = 180; // Gap between consecutive FF blocks to accommodate logic rows
  for(let b = nFF - 1; b >= 0; b--) {
    ffTopY[b] = TOP_MARGIN + (nFF - 1 - b) * (FF_H + FF_GAP);
  }

  // Safe vertical zones prevent clock and feedback wires from crossing signal wires
  const lastFFBot = ffTopY[0] + FF_H;
  const Z_Y = lastFFBot + 160;  // Output logic stage sits below all FFs
  const clkY = Z_Y + 100;      // CLK trunk below the Z logic stage
  const fbStartY = clkY + 40;  // Feedback return wires start below the CLK trunk

  const SVG_H = fbStartY + (nFF * 2) * 14 + 20;

  const PAD = 10;
  const VIEW_W = SVG_W + PAD * 2;
  const VIEW_H = SVG_H + PAD * 2;

  const svg = mkEl('svg');
  svg.setAttribute('id','circuit-svg');
  svg.setAttribute('viewBox', `${-PAD} ${-PAD} ${VIEW_W} ${VIEW_H}`);
  svg.style.cssText = `width:100%; height:100%; max-width:${VIEW_W}px; background:#fff; border:1px solid #dde; border-radius:4px;`;
  const root = mkEl('g');
  svg.appendChild(root);
  svgText(root, SVG_W/2, 20, `${ffType} Flip-Flop Sequential Circuit`, '#333', 14, 'bold', 'middle');

  // -------------------------------------------------------
  // Zone 1: Draw input signals and complemented taps
  // -------------------------------------------------------
  let inputY = 40;
  inVars.forEach((v) => {
    const col = '#1a7a33';
    const bxV = busX(v);

    svgText(root, 15, inputY + 4, v, col, 13, 'bold', 'start');
    svgLine(root, 30, inputY, bxV, inputY, col, '1.5');
    svgCircle(root, bxV, inputY, 3, col, col, 0);

    if (needComp.has(v)) {
      const vPrime = v + "'";
      const bxVPrime = busX(vPrime);
      const tapX = BUS_START_X - 70;
      const yPrime = inputY + 30;
      const NOT_X = tapX + 10;

      svgCircle(root, tapX, inputY, 3, col, col, 0);
      svgLine(root, tapX, inputY, tapX, yPrime, col, '1.5');
      svgLine(root, tapX, yPrime, NOT_X, yPrime, col, '1.5');

      const g = drawGateNOT(root, NOT_X, yPrime);
      svgLine(root, g.out.x, yPrime, bxVPrime, yPrime, col, '1.5');
      svgCircle(root, bxVPrime, yPrime, 3, col, col, 0);

      sigY[v] = inputY;
      sigY[vPrime] = yPrime;
      inputY += 60;
    } else {
      sigY[v] = inputY;
      inputY += 40;
    }
  });

  // Draw vertical bus wires that span from top labels down to the feedback return lines
  allSigs.forEach(sig => {
    const bx = busX(sig);
    const isState = stVars.some(v => sig.includes(v));
    const col = isState ? '#1a44cc' : '#1a7a33';

    let topY = 25;
    if (isState) {
      svgText(root, bx, 20, sig, col, 12, sig.endsWith("'")?'normal':'bold', 'middle');
    } else {
      topY = sigY[sig];
    }

    let bottomY = fbStartY - 20;
    if (isState) {
      let fbIdx = 0;
      for (let b = nFF - 1; b >= 0; b--) {
        if (`Q${b}` === sig) bottomY = fbStartY + fbIdx * 14;
        if (allSigs.includes(`Q${b}`)) fbIdx++;
        if (`Q${b}'` === sig) bottomY = fbStartY + fbIdx * 14;
        if (allSigs.includes(`Q${b}'`)) fbIdx++;
      }
    } else {
      bottomY = clkY + 20;
    }
    svgLine(root, bx, topY, bx, bottomY, col, '1.5');
  });

  // -------------------------------------------------------
  // Clock routing: horizontal trunk + per-FF drop wires
  // -------------------------------------------------------
  const CLK_TRUNK_X = MAX_BUS_X + 25;
  svgLine(root, 15, clkY, CLK_TRUNK_X, clkY, '#aaa', '1.5');
  svgText(root, 10, clkY - 6, 'CLK', '#888', 11, 'bold');

  const topFF_Bottom = ffTopY[nFF - 1] + FF_H;
  svgLine(root, CLK_TRUNK_X, clkY, CLK_TRUNK_X, topFF_Bottom + 60, '#aaa', '1.5');

  for (let b = nFF - 1; b >= 0; b--) {
    const bottomY = ffTopY[b] + FF_H;
    const clkRouteY = bottomY + 60;
    svgLine(root, CLK_TRUNK_X, clkRouteY, FF_X + FF_W / 2, clkRouteY, '#aaa', '1.5');
    svgLine(root, FF_X + FF_W / 2, clkRouteY, FF_X + FF_W / 2, bottomY, '#aaa', '1.5');
    svgCircle(root, CLK_TRUNK_X, clkRouteY, 2.5, '#aaa', '#aaa', 0);
  }

  // -------------------------------------------------------
  // SOP (Sum-of-Products) Drawer Factory
  // Returns a function that draws one Boolean expression's gate network.
  // Handles constant, single variable, AND-only, and OR(AND) forms.
  // -------------------------------------------------------
  function createSOPDrawer(isZ) {
    return function drawSOP(ast, targetX, targetY) {
      const wireCol = isZ ? '#c00' : '#333';

      // Draws a horizontal wire from the signal's bus column to a gate input port
      function wireFromBus(nm, gInX, gInY) {
        const bx = busX(nm);
        const isState = stVars.some(v => nm.includes(v));
        const col = isState ? '#1a44cc' : '#1a7a33';
        const dotCol = isZ ? '#c00' : col;
        svgCircle(root, bx, gInY, 3, dotCol, dotCol, 0);
        svgLine(root, bx, gInY, gInX, gInY, wireCol, '1.5');
      }

      if (!ast) return;
      if (ast.t === 'c') {
        svgText(root, targetX - 55, targetY + 4, ast.v === 1 ? 'VCC(1)' : 'GND(0)', '#c00', 10, 'bold');
        svgLine(root, targetX - 16, targetY, targetX, targetY, '#c00', '1.5');
        svgCircle(root, targetX - 16, targetY, 3, '#c00', '#c00', 0);
        return;
      }
      if (ast.t === 'v' || (ast.t === 'not' && ast.c[0].t === 'v')) {
        wireFromBus(leafNm(ast), targetX, targetY);
        return;
      }
      if (ast.t === 'and') {
        const g2 = drawGateAND(root, AND_X, targetY, ast.c.length, isZ);
        svgLine(root, g2.out.x, g2.out.y, targetX, targetY, wireCol, '1.5');
        ast.c.forEach((ch, i) => wireFromBus(leafNm(ch), g2.ins[i].x, g2.ins[i].y));
        return;
      }
      if (ast.t === 'or') {
        const hasA = ast.c.some(c => c.t === 'and');
        const gox = hasA ? OR_X : AND_X;
        const g2 = drawGateOR(root, gox, targetY, ast.c.length, isZ);
        svgLine(root, g2.out.x, g2.out.y, targetX, targetY, wireCol, '1.5');

        const andSpacing = 52;
        const startY = targetY - (ast.c.length - 1) * andSpacing / 2;

        ast.c.forEach((ch, i) => {
          const targetIn = g2.ins[i];
          if (ch.t === 'and') {
            const andY = startY + i * andSpacing;
            const ag = drawGateAND(root, AND_X, andY, ch.c.length, isZ);
            wireTo(root, ag.out.x, ag.out.y, targetIn.x, targetIn.y, i, isZ);
            ch.c.forEach((gc, gi) => wireFromBus(leafNm(gc), ag.ins[gi].x, ag.ins[gi].y));
          } else {
            wireFromBus(leafNm(ch), targetIn.x, targetIn.y);
          }
        });
      }
    };
  }

  // Resolves a leaf AST node to its signal name (handles complement notation)
  function leafNm(a) {
    return a.t==='v' ? a.v : (a.t==='not' && a.c[0].t==='v') ? a.c[0].v+"'" : '';
  }

  // -------------------------------------------------------
  // Zone 5: Draw FF boxes and their input logic networks
  // -------------------------------------------------------
  for (let b = nFF - 1; b >= 0; b--) {
    drawFFBox(root, FF_X, ffTopY[b], FF_W, FF_H, b, ffType);

    const pins = ffType === 'JK' ? [`J${b}`, `K${b}`] : [ffType === 'T' ? `T${b}` : `D${b}`];
    pins.forEach((pin, i) => {
      const py = isT ? ffTopY[b] + FF_H/2 : (i === 0 ? ffTopY[b] + 35 : ffTopY[b] + 105);
      const drawLogic = createSOPDrawer(false);
      drawLogic(parsed[pin], FF_INLET, py);
    });
  }

  // -------------------------------------------------------
  // Output (Z) logic stage
  // -------------------------------------------------------
  const outAST = parsed[outVar];
  if (outAST) {
    const zDrawSOP = createSOPDrawer(true);
    if (outAST.t === 'c') {
      svgText(root, Z_X - 10, Z_Y + 4, outAST.v === 1 ? '1' : '0', '#c00', 12, 'bold');
      svgLine(root, Z_X, Z_Y, Z_X + 24, Z_Y, '#c00', '2');
      svgText(root, Z_X + 30, Z_Y + 5, `→ ${outVar}`, '#c00', 14, 'bold');
    } else {
      zDrawSOP(outAST, Z_X, Z_Y);
      svgLine(root, Z_X, Z_Y, Z_X + 24, Z_Y, '#c00', '2');
      svgText(root, Z_X + 30, Z_Y + 5, `→ ${outVar}`, '#c00', 14, 'bold');
    }
  }

  // -------------------------------------------------------
  // Feedback wires: route Q/Q' outputs back to their bus columns
  // Each wire makes an L-shaped path that drops below the CLK trunk
  // -------------------------------------------------------
  let fbIdx = 0;
  for (let b = nFF - 1; b >= 0; b--) {
    const fy = ffTopY[b];
    const qy  = isT ? fy + FF_H/2 - 20 : fy + 35;
    const qpy = isT ? fy + FF_H/2 + 20 : fy + 105;

    svgText(root, FF_RIGHT + 8, qy - 6,  `Q${b}`,  '#1a7a3a', 11, 'bold');
    if (needComp.has(`Q${b}`)) svgText(root, FF_RIGHT + 8, qpy - 6, `Q${b}'`, '#1a7a3a', 11, 'bold');

    const processFb = (sig, pinY) => {
      if (allSigs.includes(sig)) {
        const bx = busX(sig);
        const fbY = fbStartY + fbIdx * 14;
        const rightX = FF_RIGHT + 20 + fbIdx * 14;
        fbIdx++;

        svgLine(root, FF_RIGHT + 16, pinY, rightX, pinY, '#1a44cc', '1.5');
        svgLine(root, rightX, pinY, rightX, fbY, '#1a44cc', '1.5');
        svgLine(root, rightX, fbY, bx, fbY, '#1a44cc', '1.5');
        svgCircle(root, bx, fbY, 3, '#1a44cc', '#1a44cc', 0);
      }
    };

    processFb(`Q${b}`, qy);
    processFb(`Q${b}'`, qpy);
  }

  // Inject the finished SVG into the circuit panel
  svgScale = 1;
  const container = document.getElementById('svg-container');
  container.innerHTML = '';
  container.appendChild(svg);
  document.getElementById('circuitNote').style.display = 'block';
}
