'use strict';

function renderOutput1({ eqs, groups, ffTT, outTT, ffType, nFF, varNames, states, outVar }) {
  const svNames = varNames.slice(0, nFF).join('  ');

  let html = `
    <div class="sec-label blue">Output 1: Flip-Flop Input Equations</div>
    <div class="out1-subtitle">Flip-Flop Input Equations (Simplified)</div>
    <div class="state-vars">State Variables: ${svNames}</div>
    <table class="eq-table">
      <thead><tr><th>Flip-Flop</th><th>Input</th><th>Equation</th></tr></thead>
      <tbody>`;

  for (let b = nFF - 1; b >= 0; b--) {
    const pins = ffType === 'JK' ? [`J${b}`,`K${b}`] : ffType === 'T' ? [`T${b}`] : [`D${b}`];
    pins.forEach((k, i) => {
      html += `<tr>
        ${i === 0 ? `<td rowspan="${pins.length}">FF for Q${b}</td>` : ''}
        <td><strong>${k}</strong></td>
        <td class="eq-value">${k} = ${eqs[k] || '0'}</td>
      </tr>`;
    });
  }
  html += `<tr><td>Output</td><td><strong>${outVar}</strong></td><td class="eq-value">${outVar} = ${eqs[outVar] || '0'}</td></tr></tbody></table>`;

  html += `<div class="kmap-title" style="margin-top:15px; font-weight:700; color:#333; font-size:13px;">K-Maps & Groups</div>`;
  html += `<div class="kmap-section" style="display:flex; flex-wrap:wrap; gap:12px; margin-top:8px;">`;

  const showKeys = Object.keys(eqs).filter(k => k !== outVar);
  [...showKeys, outVar].forEach(k => {
    const tt = (k === outVar) ? outTT : ffTT[k];
    html += `
      <div class="kmap-item" style="border:1px solid #d8dce8; border-radius:6px; padding:10px; background:#fafbff; display:flex; flex-direction:column; align-items:center; page-break-inside:avoid; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
        <div class="kmap-label" style="align-self:flex-start; font-weight:700; color:#1a2744; margin-bottom:6px; font-size:12px;">${k}</div>
        ${renderKMap(tt.ones, tt.dc, varNames, groups[k])}
        <div class="simplified-eq" style="margin-top:8px; margin-bottom:0; background:#f0f4ff; padding:4px 10px; border-radius:4px; font-size:12px; font-weight:700; color:#333; width:100%; text-align:center;">
          ${k} = <span style="color:#c00;">${eqs[k] || '0'}</span>
        </div>
      </div>
    `;
  });
  html += `</div>`;
  document.getElementById('output1').innerHTML = html;
}

function renderKMap(ones, dc, varNames, groups = []) {
  const n = varNames.length;
  const onesSet = new Set(ones); const dcSet = new Set(dc);

  function cellVal(idx) {
    if (onesSet.has(idx)) return { v: '1', cls: 'k1' };
    if (dcSet.has(idx)) return { v: 'X', cls: 'kdc' };
    return { v: '0', cls: 'k0' };
  }

  const gray = [0, 1, 3, 2];
  const HDR_W = 64, CELL_W = 44, CELL_H = 36;
  const thCorner = `style="width:${HDR_W}px !important; min-width:${HDR_W}px; max-width:${HDR_W}px; height:${CELL_H}px !important; padding:0 !important; font-size:11px; text-align:center; vertical-align:middle; border:1px solid #bbb; background:#f0f2f8;"`;
  const thCol    = `style="width:${CELL_W}px !important; min-width:${CELL_W}px; max-width:${CELL_W}px; height:${CELL_H}px !important; padding:0 !important; text-align:center; vertical-align:middle; border:1px solid #bbb; background:#f0f2f8; color:#444;"`;
  const thRow    = `style="width:${HDR_W}px !important; min-width:${HDR_W}px; max-width:${HDR_W}px; height:${CELL_H}px !important; padding:0 !important; text-align:center; vertical-align:middle; border:1px solid #bbb; background:#f0f2f8; color:#444;"`;
  const tdCell   = `style="width:${CELL_W}px !important; min-width:${CELL_W}px; max-width:${CELL_W}px; height:${CELL_H}px !important; padding:0 !important; text-align:center; vertical-align:middle; position:relative; z-index:2; border:1px solid #bbb;"`;

  let t = `<div class="kmap-wrap" style="position:relative; display:inline-block;">`;
  t += `<table class="kmap-table" style="width:auto !important; margin:0; table-layout:fixed; border-collapse:collapse; position:relative; z-index:2; background:transparent;">`;

  if (n === 1) {
    const [v0] = varNames;
    t += `<tr><th class="kmap-corner" ${thCorner}>${v0}</th><th ${thCol}>0</th><th ${thCol}>1</th></tr><tr><th ${thRow}></th>`;
    for (let x = 0; x <= 1; x++) { const c = cellVal(x); t += `<td class="${c.cls}" ${tdCell}>${c.v}</td>`; }
    t += `</tr>`;
  }
  else if (n === 2) {
    const [r0, c0] = varNames;
    t += `<tr><th class="kmap-corner" ${thCorner}>${r0}\\${c0}</th><th ${thCol}>0</th><th ${thCol}>1</th></tr>`;
    for (let r = 0; r <= 1; r++) {
      t += `<tr><th ${thRow}>${r}</th>`;
      for (let c = 0; c <= 1; c++) { const idx = (r << 1) | c; const ce = cellVal(idx); t += `<td class="${ce.cls}" ${tdCell}>${ce.v}</td>`; }
      t += `</tr>`;
    }
  }
  else if (n === 3) {
    const rowVar = varNames[0]; const colH = gray.map(g => `<th ${thCol}>${(g>>1)&1}${g&1}</th>`).join('');
    t += `<tr><th class="kmap-corner" ${thCorner}>${rowVar}\\${varNames[1]}${varNames[2]}</th>${colH}</tr>`;
    for (let r = 0; r <= 1; r++) {
      t += `<tr><th ${thRow}>${r}</th>`;
      gray.forEach(g => { const q0 = (g >> 1) & 1, x = g & 1; const idx = (r << 2) | (q0 << 1) | x; const ce = cellVal(idx); t += `<td class="${ce.cls}" ${tdCell}>${ce.v}</td>`; });
      t += `</tr>`;
    }
  }
  else if (n === 4) {
    const r0 = varNames[0], r1 = varNames[1], c0 = varNames[2], c1 = varNames[3];
    const colH = gray.map(g => `<th ${thCol}>${(g>>1)&1}${g&1}</th>`).join('');
    t += `<tr><th class="kmap-corner" ${thCorner}>${r0}${r1}\\${c0}${c1}</th>${colH}</tr>`;
    gray.forEach(rg => {
      const rh = `${(rg>>1)&1}${rg&1}`; t += `<tr><th ${thRow}>${rh}</th>`;
      gray.forEach(cg => {
        const r_val = (rg >> 1) & 1, r2val = rg & 1; const c_val = (cg >> 1) & 1, c2val = cg & 1;
        const idx = (r_val << 3) | (r2val << 2) | (c_val << 1) | c2val; const ce = cellVal(idx);
        t += `<td class="${ce.cls}" ${tdCell}>${ce.v}</td>`;
      });
      t += `</tr>`;
    });
  }
  t += `</table>`;

  if (n <= 4 && groups && groups.length > 0) {
    t += `<svg style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:5;">`;
    const colors = ['#e6194b', '#3cb44b', '#0055ff', '#f58231', '#911eb4', '#009999', '#f032e6', '#99aa00'];
    let rowsLen = 1, colsLen = 1; let getPos = m => ({r:0, c:0});
    if (n === 1) { rowsLen = 1; colsLen = 2; getPos = m => ({ r: 0, c: m & 1 }); }
    else if (n === 2) { rowsLen = 2; colsLen = 2; getPos = m => ({ r: (m>>1)&1, c: m&1 }); }
    else if (n === 3) { rowsLen = 2; colsLen = 4; getPos = m => ({ r: (m>>2)&1, c: gray.indexOf(m&3) }); }
    else if (n === 4) { rowsLen = 4; colsLen = 4; getPos = m => ({ r: gray.indexOf((m>>2)&3), c: gray.indexOf(m&3) }); }

    function getSegments(idxArray, max) {
      if(idxArray.length === 0) return []; idxArray.sort((a,b) => a-b);
      if (idxArray.length === max) return [[0, max-1]];
      if (idxArray.length === 2 && idxArray[0] === 0 && idxArray[1] === max-1) return [[0,0], [max-1, max-1]]; 
      return [[idxArray[0], idxArray[idxArray.length-1]]];
    }

    groups.forEach((g, gIdx) => {
      const color = colors[gIdx % colors.length]; const covered = [];
      for(let m=0; m < (1<<n); m++) if ((m & ~g.mask) === (g.bits & ~g.mask)) covered.push(m);
      
      const rSet = new Set(), cSet = new Set();
      covered.forEach(m => { const p = getPos(m); rSet.add(p.r); cSet.add(p.c); });
      const rSegs = getSegments([...rSet], rowsLen), cSegs = getSegments([...cSet], colsLen);
      const inset = 3 + (gIdx % 3) * 2.5; 

      rSegs.forEach(rs => {
        cSegs.forEach(cs => {
          const rx = HDR_W + cs[0] * CELL_W + inset, ry = CELL_H + rs[0] * CELL_H + inset;
          const rw = (cs[1] - cs[0] + 1) * CELL_W - inset * 2, rh = (rs[1] - rs[0] + 1) * CELL_H - inset * 2;
          t += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="6" fill="${color}26" stroke="${color}" stroke-width="2.5" />`;
        });
      });
    });
    t += `</svg>`;
  }
  t += `</div>`; return t;
}