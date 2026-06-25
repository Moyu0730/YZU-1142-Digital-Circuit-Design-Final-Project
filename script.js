'use strict';

// ─── 動態載入專屬 CSS 確保卡諾圖尺寸不受外部影響 ──────────────────────────
if (!document.getElementById('kmap-strict-styles')) {
  const s = document.createElement('style');
  s.id = 'kmap-strict-styles';
  s.innerHTML = `
    .kmap-exact { border-collapse: collapse; table-layout: fixed; }
    .kmap-exact th, .kmap-exact td { 
      padding: 0 !important; margin: 0 !important; 
      box-sizing: border-box !important; border: 1px solid #bbb; 
    }
  `;
  document.head.appendChild(s);
}

// ─── Table management ───────────────────────────────────────────────────────

function addRow(ps = '', x = '', ns = '', z = '') {
  const tbody = document.getElementById('tableBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" value="${ps}" placeholder="A" spellcheck="false"></td>
    <td><input type="text" value="${x}"  placeholder="0" spellcheck="false"></td>
    <td><input type="text" value="${ns}" placeholder="A" spellcheck="false"></td>
    <td><input type="text" value="${z}"  placeholder="0" spellcheck="false"></td>
    <td class="del-cell"><button class="del-btn" onclick="this.closest('tr').remove()">×</button></td>
  `;
  tbody.appendChild(tr);
}

function clearTable() {
  document.getElementById('tableBody').innerHTML = '';
  addRow();
}

function loadExample() {
  document.getElementById('tableBody').innerHTML = '';
  [['A','0','A','0'],['A','1','B','0'],
   ['B','0','C','1'],['B','1','A','0'],
   ['C','0','A','1'],['C','1','C','1']]
    .forEach(r => addRow(...r));
  document.querySelector('input[name=fftype][value=JK]').checked = true;
  document.querySelector('input[name=model][value=mealy]').checked = true;
  document.getElementById('inputVars').value  = 'X';
  document.getElementById('outputVars').value = 'Z';
}

function getTableData() {
  return [...document.querySelectorAll('#tableBody tr')]
    .map(r => {
      const inp = r.querySelectorAll('input');
      return {
        ps: inp[0].value.trim().toUpperCase(),
        x : inp[1].value.trim(),
        ns: inp[2].value.trim().toUpperCase(),
        z : inp[3].value.trim()
      };
    })
    .filter(r => r.ps && r.ns);
}

// ─── Quine-McCluskey ────────────────────────────────────────────────────────

function popcount(n) {
  let c = 0; while (n) { c += n & 1; n >>>= 1; } return c;
}

function qm(minterms, dontcares, nVars, names) {
  if (minterms.length === 0) return { eq: '0', groups: [] };
  const all = (1 << nVars) - 1;
  if (minterms.length + dontcares.length >= (1 << nVars)) {
    return { eq: '1', groups: [{ bits: 0, mask: all }] };
  }

  const allTerms = [...minterms, ...dontcares].map(m => ({ bits: m, mask: 0, used: false }));

  const grouped = {};
  allTerms.forEach(t => {
    const k = popcount(t.bits);
    (grouped[k] = grouped[k] || []).push(t);
  });

  const primes = [];

  function combine(groups) {
    const next = {};
    let changed = false;
    const keys = Object.keys(groups).map(Number).sort((a, b) => a - b);
    for (let i = 0; i < keys.length - 1; i++) {
      for (const a of groups[keys[i]]) {
        for (const b of groups[keys[i + 1]]) {
          if (a.mask !== b.mask) continue;
          const diff = (a.bits ^ b.bits) & ~a.mask;
          if (popcount(diff) !== 1) continue;
          a.used = b.used = true; changed = true;
          const r = { bits: a.bits & ~diff, mask: a.mask | diff, used: false };
          const k = popcount(r.bits & ~r.mask);
          if (!(next[k] || []).some(t => t.bits === r.bits && t.mask === r.mask))
            (next[k] = next[k] || []).push(r);
        }
      }
    }
    keys.forEach(k => groups[k].filter(t => !t.used).forEach(t => primes.push(t)));
    if (changed) combine(next);
    else Object.values(next).flat().forEach(t => { if (!t.used) primes.push(t); });
  }
  combine(grouped);

  const covers = {};
  minterms.forEach(m => { covers[m] = []; });
  primes.forEach((pi, i) => {
    minterms.forEach(m => {
      if ((m & ~pi.mask) === (pi.bits & ~pi.mask)) covers[m].push(i);
    });
  });

  const sel = new Set();
  const covered = new Set();

  function cover(piIdx) {
    sel.add(piIdx);
    const pi = primes[piIdx];
    minterms.forEach(m => {
      if ((m & ~pi.mask) === (pi.bits & ~pi.mask)) covered.add(m);
    });
  }

  minterms.forEach(m => { if (covers[m].length === 1) cover(covers[m][0]); });
  minterms.forEach(m => {
    if (covered.has(m)) return;
    let best = -1, bestN = -1;
    covers[m].forEach(i => {
      let n = 0;
      minterms.forEach(m2 => {
        if (!covered.has(m2) && (m2 & ~primes[i].mask) === (primes[i].bits & ~primes[i].mask)) n++;
      });
      if (n > bestN) { bestN = n; best = i; }
    });
    if (best >= 0) cover(best);
  });

  function piToStr(pi) {
    const parts = [];
    for (let i = nVars - 1; i >= 0; i--) {
      if (pi.mask & (1 << i)) continue;
      const v = names[nVars - 1 - i];
      parts.push((pi.bits & (1 << i)) ? v : v + "'");
    }
    return parts.length ? parts.join(' · ') : '1';
  }

  const selectedPrimes = [...sel].map(i => primes[i]);
  const terms = selectedPrimes.map(pi => piToStr(pi));
  return { 
    eq: terms.join(' + ') || '0', 
    groups: selectedPrimes 
  };
}

// ─── Flip-flop excitation ────────────────────────────────────────────────────

function exciteJK(q, qn) {
  if (q === 0 && qn === 0) return { J: 0, K: -1 };
  if (q === 0 && qn === 1) return { J: 1, K: -1 };
  if (q === 1 && qn === 0) return { J: -1, K: 1 };
  return                          { J: -1, K: 0 };
}
function exciteT(q, qn)  { return { T: q ^ qn }; }
function exciteD(q, qn)  { return { D: qn }; }

// ─── Generate ────────────────────────────────────────────────────────────────

let lastResult = null;

function generate() {
  try {
    const rows = getTableData();
    if (!rows.length) { alert('Please enter state table rows.'); return; }

    const ffType = document.querySelector('input[name=fftype]:checked').value;
    const model  = document.querySelector('input[name=model]:checked').value;
    const outVar = (document.getElementById('outputVars').value.trim() || 'Z').split(',')[0].trim();

    const states = [...new Set(rows.map(r => r.ps))].sort();
    const nFF    = Math.ceil(Math.log2(Math.max(states.length, 2)));
    const code   = {};
    states.forEach((s, i) => { code[s] = i; });

    const varNames = [];
    for (let b = nFF - 1; b >= 0; b--) varNames.push(`Q${b}`);
    varNames.push('X');
    const nVars = nFF + 1;

    const ffTT = {};
    const outTT = { ones: [], dc: [] };

    const mkFF = (prefix, bit) => {
      const keys = ffType === 'JK' ? [`J${bit}`, `K${bit}`]
                 : ffType === 'T'  ? [`T${bit}`]
                 :                   [`D${bit}`];
      keys.forEach(k => { ffTT[k] = { ones: [], dc: [] }; });
      return keys;
    };
    const allFFkeys = [];
    for (let b = nFF - 1; b >= 0; b--) allFFkeys.push(...mkFF(ffType, b));

    const seen = new Set();

    rows.forEach(row => {
      const ps   = code[row.ps];
      const ns   = code[row.ns];
      const xVal = parseInt(row.x) || 0;
      if (ps === undefined || ns === undefined) return;

      const idx = (ps << 1) | (xVal & 1);
      seen.add(idx);

      for (let b = nFF - 1; b >= 0; b--) {
        const q  = (ps >> b) & 1;
        const qn = (ns >> b) & 1;
        if (ffType === 'JK') {
          const e = exciteJK(q, qn);
          const jk = (v, k) => { if (v === -1) ffTT[k].dc.push(idx); else if (v === 1) ffTT[k].ones.push(idx); };
          jk(e.J, `J${b}`); jk(e.K, `K${b}`);
        } else if (ffType === 'T') {
          if (exciteT(q,qn).T === 1) ffTT[`T${b}`].ones.push(idx);
        } else {
          if (exciteD(q,qn).D === 1) ffTT[`D${b}`].ones.push(idx);
        }
      }
      const zVal = parseInt(row.z) || 0;
      if (zVal === 1) outTT.ones.push(idx);
    });

    for (let i = 0; i < (1 << nVars); i++) {
      if (!seen.has(i)) {
        allFFkeys.forEach(k => ffTT[k].dc.push(i));
        outTT.dc.push(i);
      }
    }

    const eqs = {};
    const groups = {};
    allFFkeys.forEach(k => { 
      const res = qm(ffTT[k].ones, ffTT[k].dc, nVars, varNames);
      eqs[k] = res.eq;
      groups[k] = res.groups;
    });
    
    const outRes = qm(outTT.ones, outTT.dc, nVars, varNames);
    eqs[outVar] = outRes.eq;
    groups[outVar] = outRes.groups;

    lastResult = { eqs, groups, ffTT, outTT, ffType, nFF, nVars, varNames, states, code, rows, outVar, model };

    renderOutput1(lastResult);
    renderOutput2(lastResult);

  } catch (error) {
    console.error("Generate Error: ", error);
    alert("An error occurred during generation. Check the console for details.\n\n" + error.message);
  }
}

// ─── Render Output 1 (完美卡片化 K-Map) ────────────────────────────────────────

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
    const pins = ffType === 'JK' ? [`J${b}`,`K${b}`]
               : ffType === 'T'  ? [`T${b}`]
               :                   [`D${b}`];
    pins.forEach((k, i) => {
      html += `<tr>
        ${i === 0 ? `<td rowspan="${pins.length}">FF for Q${b}</td>` : ''}
        <td><strong>${k}</strong></td>
        <td class="eq-value">${k} = ${eqs[k] || '0'}</td>
      </tr>`;
    });
  }
  html += `<tr>
    <td>Output</td>
    <td><strong>${outVar}</strong></td>
    <td class="eq-value">${outVar} = ${eqs[outVar] || '0'}</td>
  </tr></tbody></table>`;

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

// ─── K-map renderer (STRICT Pixel-Perfect Grid) ─────────────────────────────

function renderKMap(ones, dc, varNames, groups = []) {
  const n = varNames.length;
  const onesSet = new Set(ones);
  const dcSet   = new Set(dc);

  function cellVal(idx) {
    if (onesSet.has(idx)) return { v: '1', cls: 'k1' };
    if (dcSet.has(idx))   return { v: 'X', cls: 'kdc' };
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
    t += `<tr><th class="kmap-corner" ${thCorner}>${v0}</th><th ${thCol}>0</th><th ${thCol}>1</th></tr>`;
    t += `<tr><th ${thRow}></th>`;
    for (let x = 0; x <= 1; x++) { const c = cellVal(x); t += `<td class="${c.cls}" ${tdCell}>${c.v}</td>`; }
    t += `</tr>`;
  }
  else if (n === 2) {
    const [r0, c0] = varNames;
    t += `<tr><th class="kmap-corner" ${thCorner}>${r0}\\${c0}</th><th ${thCol}>0</th><th ${thCol}>1</th></tr>`;
    for (let r = 0; r <= 1; r++) {
      t += `<tr><th ${thRow}>${r}</th>`;
      for (let c = 0; c <= 1; c++) {
        const idx = (r << 1) | c;
        const ce = cellVal(idx);
        t += `<td class="${ce.cls}" ${tdCell}>${ce.v}</td>`;
      }
      t += `</tr>`;
    }
  }
  else if (n === 3) {
    const rowVar = varNames[0];
    const colH   = gray.map(g => `<th ${thCol}>${(g>>1)&1}${g&1}</th>`).join('');
    t += `<tr><th class="kmap-corner" ${thCorner}>${rowVar}\\${varNames[1]}${varNames[2]}</th>${colH}</tr>`;
    for (let r = 0; r <= 1; r++) {
      t += `<tr><th ${thRow}>${r}</th>`;
      gray.forEach(g => {
        const q0 = (g >> 1) & 1, x = g & 1;
        const idx = (r << 2) | (q0 << 1) | x;
        const ce  = cellVal(idx);
        t += `<td class="${ce.cls}" ${tdCell}>${ce.v}</td>`;
      });
      t += `</tr>`;
    }
  }
  else if (n === 4) {
    const r0 = varNames[0], r1 = varNames[1], c0 = varNames[2], c1 = varNames[3];
    const colH = gray.map(g => `<th ${thCol}>${(g>>1)&1}${g&1}</th>`).join('');
    t += `<tr><th class="kmap-corner" ${thCorner}>${r0}${r1}\\${c0}${c1}</th>${colH}</tr>`;
    gray.forEach(rg => {
      const rh = `${(rg>>1)&1}${rg&1}`;
      t += `<tr><th ${thRow}>${rh}</th>`;
      gray.forEach(cg => {
        const r_val = (rg >> 1) & 1, r2val = rg & 1;
        const c_val = (cg >> 1) & 1, c2val = cg & 1;
        const idx = (r_val << 3) | (r2val << 2) | (c_val << 1) | c2val;
        const ce  = cellVal(idx);
        t += `<td class="${ce.cls}" ${tdCell}>${ce.v}</td>`;
      });
      t += `</tr>`;
    });
  }
  t += `</table>`;

  if (n <= 4 && groups && groups.length > 0) {
    t += `<svg style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:5;">`;
    const colors = ['#e6194b', '#3cb44b', '#0055ff', '#f58231', '#911eb4', '#009999', '#f032e6', '#99aa00'];
    
    let rowsLen = 1, colsLen = 1;
    let getPos = m => ({r:0, c:0});
    if (n === 1) { rowsLen = 1; colsLen = 2; getPos = m => ({ r: 0, c: m & 1 }); }
    else if (n === 2) { rowsLen = 2; colsLen = 2; getPos = m => ({ r: (m>>1)&1, c: m&1 }); }
    else if (n === 3) { rowsLen = 2; colsLen = 4; getPos = m => ({ r: (m>>2)&1, c: gray.indexOf(m&3) }); }
    else if (n === 4) { rowsLen = 4; colsLen = 4; getPos = m => ({ r: gray.indexOf((m>>2)&3), c: gray.indexOf(m&3) }); }

    function getSegments(idxArray, max) {
      if(idxArray.length === 0) return [];
      idxArray.sort((a,b) => a-b);
      if (idxArray.length === max) return [[0, max-1]];
      if (idxArray.length === 2 && idxArray[0] === 0 && idxArray[1] === max-1) return [[0,0], [max-1, max-1]]; 
      return [[idxArray[0], idxArray[idxArray.length-1]]];
    }

    groups.forEach((g, gIdx) => {
      const color = colors[gIdx % colors.length];
      const covered = [];
      for(let m=0; m < (1<<n); m++) {
        if ((m & ~g.mask) === (g.bits & ~g.mask)) covered.push(m);
      }
      
      const rSet = new Set(), cSet = new Set();
      covered.forEach(m => { const p = getPos(m); rSet.add(p.r); cSet.add(p.c); });
      
      const rSegs = getSegments([...rSet], rowsLen);
      const cSegs = getSegments([...cSet], colsLen);
      
      const inset = 3 + (gIdx % 3) * 2.5; 

      rSegs.forEach(rs => {
        cSegs.forEach(cs => {
          const rx = HDR_W + cs[0] * CELL_W + inset;
          const ry = CELL_H + rs[0] * CELL_H + inset;
          const rw = (cs[1] - cs[0] + 1) * CELL_W - inset * 2;
          const rh = (rs[1] - rs[0] + 1) * CELL_H - inset * 2;
          t += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="6" fill="${color}26" stroke="${color}" stroke-width="2.5" />`;
        });
      });
    });
    t += `</svg>`;
  }

  t += `</div>`;
  return t;
}

// ─── Boolean expression parser ───────────────────────────────────────────────

function parseBool(str) {
  str = (str || '').trim();
  if (!str || str === '0') return { t: 'c', v: 0 };
  if (str === '1')         return { t: 'c', v: 1 };

  const raw = [];
  for (let i = 0; i < str.length; ) {
    const c = str[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '+')  { raw.push('OR');  i++; }
    else if (c === '·' || c === '*') { raw.push('AND'); i++; }
    else if (c === "'") { raw.push('NOT'); i++; }
    else if (c === '(') { raw.push('('); i++; }
    else if (c === ')') { raw.push(')'); i++; }
    else if (/[A-Z0-9]/.test(c)) {
      let v = ''; while (i < str.length && /[A-Z0-9]/.test(str[i])) v += str[i++];
      raw.push({ v });
    } else i++;
  }
  const toks = [];
  raw.forEach((t, i) => {
    toks.push(t);
    if (i + 1 < raw.length) {
      const cur = raw[i], nxt = raw[i + 1];
      const isEnd   = typeof cur === 'object' || cur === 'NOT' || cur === ')';
      const isStart = typeof nxt === 'object' || nxt === '(';
      if (isEnd && isStart) toks.push('AND');
    }
  });

  let p = 0;
  const pk = () => toks[p];
  const nt = () => toks[p++];

  function eOR()  { let l = eAND(); while (pk()==='OR')  { nt(); l={t:'or', c:[l,eAND()]}; } return l; }
  function eAND() { let l = eNOT(); while (pk()==='AND') { nt(); l={t:'and',c:[l,eNOT()]}; } return l; }
  function eNOT() { let n = ePRI(); while (pk()==='NOT') { nt(); n={t:'not',c:[n]};         } return n; }
  function ePRI() {
    if (!pk()) return {t:'c',v:0};
    if (pk() === '(') { nt(); const e=eOR(); if(pk()===')') nt(); return e; }
    if (typeof pk() === 'object') {
      const { v } = nt();
      if (v==='0') return {t:'c',v:0};
      if (v==='1') return {t:'c',v:1};
      return {t:'v',v};
    }
    return {t:'c',v:0};
  }
  return eOR();
}

function flatAST(ast) {
  if (!ast) return {t:'c',v:0};
  if (ast.t==='and'||ast.t==='or') {
    const ch = ast.c.map(flatAST), fl = [];
    ch.forEach(c => (c.t===ast.t ? fl.push(...c.c) : fl.push(c)));
    return {...ast, c: fl};
  }
  if (ast.t==='not') return {...ast, c:[flatAST(ast.c[0])]};
  return ast;
}

// ─── Gate shape drawing (Dynamic Height Scaling) ──────────────────────────────

const GW=46;

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

function drawGateOR(g, lx, cy, ni, isZ = false) {
  const col = isZ ? '#c00' : '#333';
  const h = Math.max(36, ni * 14 + 12);
  const ty = cy - h/2;
  const path = mkEl('path');
  path.setAttribute('d',
    `M${lx},${ty} Q${lx+GW*0.18},${cy} ${lx},${ty+h} Q${lx+GW*0.68},${ty+h} ${lx+GW},${cy} Q${lx+GW*0.68},${ty} ${lx},${ty} Z`);
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

// ─── Render Output 2 (The Flawless Absolute Vertical Bus Architecture) ───────

let svgScale = 1;

function svgZoom(f) { svgScale *= f; applySvgScale(); }
function svgReset() { svgScale = 1; applySvgScale(); }
function svgFit()   {
  const c = document.getElementById('svg-container');
  const s = document.getElementById('circuit-svg');
  if (!s) return;
  const vb = s.viewBox.baseVal;
  svgScale = Math.min(c.clientWidth/vb.width, c.clientHeight/vb.height) * 0.95;
  applySvgScale();
}
function applySvgScale() {
  const s = document.getElementById('circuit-svg');
  if (!s) return;
  const vb = s.viewBox.baseVal;
  s.style.width  = (vb.width  * svgScale) + 'px';
  s.style.height = (vb.height * svgScale) + 'px';
}

function renderOutput2({ eqs, ffType, nFF, varNames, outVar }) {
  const parsed={};
  Object.keys(eqs).forEach(k=>{parsed[k]=flatAST(parseBool(eqs[k]));});
  
  const inVars=varNames.slice(nFF), stVars=varNames.slice(0,nFF);
  const needComp=new Set();
  function findC(a){if(!a)return;if(a.t==='not'&&a.c[0].t==='v'){needComp.add(a.c[0].v);return;}if(a.c)a.c.forEach(findC);}
  Object.values(parsed).forEach(findC);

  let allSigs = [];
  inVars.forEach(v => {
    allSigs.push(v);
    if (needComp.has(v)) allSigs.push(v + "'");
  });
  for (let b = nFF - 1; b >= 0; b--) {
    allSigs.push(`Q${b}`);
    if (needComp.has(`Q${b}`)) allSigs.push(`Q${b}'`);
  }

  // ── 絕對空間系統 (Absolute Space Allocation) ──
  const BUS_SPACING = 24; 
  const BUS_START_X = 130;
  const maxSigs = allSigs.length;
  
  const sigY = {}; 
  function busX(nm) { return BUS_START_X + allSigs.indexOf(nm) * BUS_SPACING; }
  
  const MAX_BUS_X = BUS_START_X + (maxSigs - 1) * BUS_SPACING;
  const DROP_W = maxSigs * 14; 
  
  // 數學保證的防重疊空間劃分
  const AND_DROP_START = MAX_BUS_X + 40;
  const AND_IN_X    = AND_DROP_START + DROP_W + 10;
  const AND_X       = AND_IN_X + 14;

  const OR_DROP_START = AND_X + GW + 80;
  const OR_IN_X     = OR_DROP_START + DROP_W + 10;
  const OR_X        = OR_IN_X + 14;

  const FF_DROP_START = OR_X + GW + 60;
  const FF_INLET    = FF_DROP_START + DROP_W + 10;
  const FF_X        = FF_INLET + 14;
  const FF_W        = 100, FF_H = 120; 
  const FF_RIGHT    = FF_X + FF_W; 
  
  const Z_X = FF_INLET; 
  
  const FB_ZONE_W = 40 + (nFF * 2) * 16;
  const SVG_W = Math.max(FF_RIGHT + FB_ZONE_W + 100, Z_X + 160);

  const isT = ffType === 'T' || ffType === 'D';

  const ffTopY = {};
  const TOP_MARGIN = 120; 
  // 【關鍵修正】大幅加大 Flip-Flop 之間的間距，讓 AND 閘有足夠空間長出來
  const FF_GAP = 180; 
  for(let b=nFF-1; b>=0; b--){ 
    ffTopY[b] = TOP_MARGIN + (nFF - 1 - b) * (FF_H + FF_GAP); 
  }

  const lastFFBot = ffTopY[0] + FF_H;
  const Z_Y = lastFFBot + 140; 
  const clkY = Z_Y + 120;
  const fbStartY = clkY + 30;
  
  const RAW_H = fbStartY + (nFF * 2) * 16 + 20;

  // 加入 40px 的邊距，讓 PNG 下載時絕對置中
  const PAD = 40;
  const VIEW_W = SVG_W + PAD * 2;
  const VIEW_H = RAW_H + PAD * 2;

  const svg=mkEl('svg');
  svg.setAttribute('id','circuit-svg');
  svg.setAttribute('viewBox',`${-PAD} ${-PAD} ${VIEW_W} ${VIEW_H}`);
  svg.style.cssText=`width:100%;height:100%;max-width:${VIEW_W}px;background:#fff;border:1px solid #dde;border-radius:4px;`;
  const root=mkEl('g'); svg.appendChild(root);
  svgText(root,SVG_W/2,20,`${ffType} Flip-Flop Sequential Circuit`,'#333',14,'bold','middle');

  // 1. 繪製輸入 X 與無縫 NOT 閘 (修正多餘的標籤與重疊)
  let inputY = 50;
  inVars.forEach((v) => {
      const col = '#1a7a33';
      const bxV = busX(v);
      
      svgText(root, 15, inputY + 4, v, col, 13, 'bold', 'start');
      svgLine(root, 30, inputY, bxV, inputY, col, '1.5');
      svgCircle(root, bxV, inputY, 3, col, col, 0);
      
      if (needComp.has(v)) {
          const vPrime = v + "'";
          const bxVPrime = busX(vPrime);
          const tapX = BUS_START_X - 55; 
          const yPrime = inputY + 30; // 將 NOT 閘安全錯開下方
          const NOT_X = tapX + 10;
          
          svgCircle(root, tapX, inputY, 3, col, col, 0);
          svgLine(root, tapX, inputY, tapX, yPrime, col, '1.5');
          svgLine(root, tapX, yPrime, NOT_X, yPrime, col, '1.5');
          
          const g = drawGateNOT(root, NOT_X, yPrime);
          svgLine(root, g.out.x, yPrime, bxVPrime, yPrime, col, '1.5');
          svgCircle(root, bxVPrime, yPrime, 3, col, col, 0);
          
          sigY[v] = inputY;
          sigY[vPrime] = yPrime;
          inputY += 70;
      } else {
          sigY[v] = inputY;
          inputY += 40;
      }
  });

  // 2. 繪製全域垂直主總線軌道
  allSigs.forEach(sig => {
      const bx = busX(sig);
      const isState = stVars.some(v => sig.includes(v));
      const col = isState ? '#1a44cc' : '#1a7a33';
      
      if (isState) {
          svgText(root, bx, 26, sig, col, 12, sig.endsWith("'")?'normal':'bold', 'middle');
          sigY[sig] = 35; 
      }
      
      let bottomY = fbStartY - 20; 
      if (isState) {
         let fbIdx = 0;
         for (let b = nFF - 1; b >= 0; b--) {
             if (`Q${b}` === sig) bottomY = fbStartY + fbIdx * 16;
             if (allSigs.includes(`Q${b}`)) fbIdx++;
             if (`Q${b}'` === sig) bottomY = fbStartY + fbIdx * 16;
             if (allSigs.includes(`Q${b}'`)) fbIdx++;
         }
      } else {
         bottomY = clkY + 20;
      }
      svgLine(root, bx, sigY[sig], bx, bottomY, col, '1.5');
  });

  // 3. 繪製時脈樹 (Clock Tree) - 安全走廊，絕對不切西瓜
  const CLK_TRUNK_X = MAX_BUS_X + 35; 
  svgLine(root, 15, clkY, CLK_TRUNK_X, clkY, '#aaa', '1.5'); 
  svgText(root, 10, clkY - 6, 'CLK', '#888', 11, 'bold');
  
  const topFF_Bottom = ffTopY[nFF - 1] + FF_H;
  // 主幹線往上接
  svgLine(root, CLK_TRUNK_X, clkY, CLK_TRUNK_X, topFF_Bottom + 70, '#aaa', '1.5');

  for (let b = nFF - 1; b >= 0; b--) {
      const bottomY = ffTopY[b] + FF_H;
      const clkRouteY = bottomY + 70; // 絕對安全距離，讓 AND 閘在上面長
      svgLine(root, CLK_TRUNK_X, clkRouteY, FF_X + FF_W / 2, clkRouteY, '#aaa', '1.5');
      svgLine(root, FF_X + FF_W / 2, clkRouteY, FF_X + FF_W / 2, bottomY, '#aaa', '1.5');
      svgCircle(root, CLK_TRUNK_X, clkRouteY, 2.5, '#aaa', '#aaa', 0);
  }

  // 4. 絕對封裝的無重疊 SOP 繪圖引擎
  function createSOPDrawer(andDrop, orDrop, finalDrop, isZ) {
      return function drawSOP(ast, targetX, targetY) {
          function localBusWire(nm, gInX, gInY, dropType) {
              const srcY = sigY[nm];
              const sigIdx = allSigs.indexOf(nm);
              let dropStart = andDrop;
              if (dropType === 'or') dropStart = orDrop;
              if (dropType === 'final') dropStart = finalDrop;
              
              // 絕對錯開的垂直下拉線，保證訊號絕不重疊
              const dropX = dropStart + sigIdx * 14; 
              const isState = stVars.some(v => nm.includes(v));
              const dotCol = isState ? (isZ ? '#c00' : '#1a44cc') : (isZ ? '#c00' : '#1a7a33');
              const wireCol = isZ ? '#c00' : '#444';

              svgCircle(root, dropX, srcY, 3, dotCol, dotCol, 0); 
              svgLine(root, dropX, srcY, dropX, gInY, wireCol, '1.5');
              svgLine(root, dropX, gInY, gInX, gInY, wireCol, '1.5');
          }

          const wireCol = isZ ? '#c00' : '#333';

          if (!ast) return;
          if (ast.t === 'c') {
              svgText(root, targetX - 55, targetY + 4, ast.v === 1 ? 'VCC(1)' : 'GND(0)', '#c00', 10, 'bold');
              svgLine(root, targetX - 16, targetY, targetX, targetY, '#c00', '1.5');
              svgCircle(root, targetX - 16, targetY, 3, '#c00', '#c00', 0);
              return;
          }
          if (ast.t === 'v' || (ast.t === 'not' && ast.c[0].t === 'v')) {
              localBusWire(leafNm(ast), targetX, targetY, 'final');
              return;
          }
          if (ast.t === 'and') {
              const g2 = drawGateAND(root, AND_X, targetY, ast.c.length, isZ);
              svgLine(root, g2.out.x, g2.out.y, targetX, targetY, wireCol, '1.5');
              ast.c.forEach((ch, i) => localBusWire(leafNm(ch), g2.ins[i].x, g2.ins[i].y, 'and'));
              return;
          }
          if (ast.t === 'or') {
              const hasA = ast.c.some(c => c.t === 'and');
              const gox = hasA ? OR_X : AND_X; 
              const g2 = drawGateOR(root, gox, targetY, ast.c.length, isZ);
              svgLine(root, g2.out.x, g2.out.y, targetX, targetY, wireCol, '1.5');

              const andSpacing = 56; 
              const startY = targetY - (ast.c.length - 1) * andSpacing / 2;

              ast.c.forEach((ch, i) => {
                  const targetIn = g2.ins[i];
                  if (ch.t === 'and') {
                      const andY = startY + i * andSpacing;
                      const ag = drawGateAND(root, AND_X, andY, ch.c.length, isZ);
                      wireTo(root, ag.out.x, ag.out.y, targetIn.x, targetIn.y, i, isZ);
                      ch.c.forEach((gc, gi) => localBusWire(leafNm(gc), ag.ins[gi].x, ag.ins[gi].y, 'and'));
                  } else {
                      localBusWire(leafNm(ch), targetIn.x, targetIn.y, 'or');
                  }
              });
          }
      };
  }

  function leafNm(a){ return a.t==='v'?a.v:(a.t==='not'&&a.c[0].t==='v')?a.c[0].v+"'":''; }

  // 5. 繪製 Flip-Flop 與引腳組合邏輯 (T/D 完美居中，JK 安全錯開)
  for (let b = nFF - 1; b >= 0; b--) {
      drawFFBox(root, FF_X, ffTopY[b], FF_W, FF_H, b, ffType);
      
      const pins = ffType === 'JK' ? [`J${b}`, `K${b}`] : [ffType === 'T' ? `T${b}` : `D${b}`];
      pins.forEach((pin, i) => {
          const py = isT ? ffTopY[b] + FF_H/2 : (i === 0 ? ffTopY[b] + 35 : ffTopY[b] + 105);
          const drawLogic = createSOPDrawer(AND_DROP_START, OR_DROP_START, FF_DROP_START, false);
          drawLogic(parsed[pin], FF_INLET, py);
      });
  }

  // 6. 繪製 Output Z 邏輯
  const outAST = parsed[outVar];
  if (outAST) {
      const zDrawSOP = createSOPDrawer(AND_DROP_START, OR_DROP_START, FF_DROP_START, true);
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

  // 7. 繪製 梯田式繞道回饋網路 (Feedback Waterfall)
  let fbIdx = 0;
  for (let b = nFF - 1; b >= 0; b--) {
      const fy = ffTopY[b];
      const qy = isT ? fy + FF_H/2 - 20 : fy + 35;
      const qpy = isT ? fy + FF_H/2 + 20 : fy + 105;
      
      svgText(root, FF_RIGHT + 8, qy - 6, `Q${b}`, '#1a7a3a', 11, 'bold');
      if (needComp.has(`Q${b}`)) svgText(root, FF_RIGHT + 8, qpy - 6, `Q${b}'`, '#1a7a3a', 11, 'bold');
      
      const processFb = (sig, pinY) => {
          if (allSigs.includes(sig)) {
              const bx = busX(sig);
              const fbY = fbStartY + fbIdx * 16;
              const rightX = FF_RIGHT + 30 + fbIdx * 16; 
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

  svgScale=1;
  const container=document.getElementById('svg-container');
  container.innerHTML=''; container.appendChild(svg);
  document.getElementById('circuitNote').style.display='block';
}

// ─── SVG helpers ─────────────────────────────────────────────────────────────

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

function drawFFBox(g, x, y, w, h, bitNum, ffType) {
  svgRect(g, x, y, w, h, '#fff', '#333', 1.5, 3);

  svgText(g, x+w/2, y+34, ffType,      '#333', 13, 'bold',   'middle');
  svgText(g, x+w/2, y+48, 'Flip-Flop', '#555',  9, 'normal', 'middle');

  const isT = ffType === 'T' || ffType === 'D';
  const pins = ffType === 'JK' ? ['J','K'] : [ffType];
  
  pins.forEach((pin, i) => {
    // 居中處理
    const py = isT ? y + h/2 : (i === 0 ? y + 35 : y + 105);
    svgText(g, x+6, py+4, pin, '#333', 11, 'bold');
    svgLine(g, x-14, py, x, py, '#333', '1.5');
  });

  const qY = isT ? y + h/2 - 20 : y + 35;
  const qpY = isT ? y + h/2 + 20 : y + 105;

  svgText(g, x+w-6, qY+4, 'Q',  '#333', 10, 'bold',   'end');
  svgText(g, x+w-6, qpY+4, "Q'", '#333', 10, 'normal', 'end');
  svgLine(g, x+w, qY, x+w+16, qY, '#333', '1.5');
  svgLine(g, x+w, qpY, x+w+16, qpY, '#333', '1.5');

  const tx = x + w*0.5;
  const tri = mkEl('polygon');
  tri.setAttribute('points', `${tx-6},${y+h} ${tx+6},${y+h} ${tx},${y+h-8}`);
  tri.setAttribute('fill', 'none');
  tri.setAttribute('stroke', '#333');
  tri.setAttribute('stroke-width', '1.5');
  g.appendChild(tri);
}

// ─── Download helpers ─────────────────────────────────────────────────────────

function downloadSVG() {
  const s = document.getElementById('circuit-svg');
  if (!s) return alert('Generate the circuit first.');
  const blob = new Blob([new XMLSerializer().serializeToString(s)], { type:'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'circuit.svg'; a.click();
}

function downloadPNG() {
  const s = document.getElementById('circuit-svg');
  if (!s) return alert('Generate the circuit first.');
  const vb = s.viewBox.baseVal;
  const w = vb.width;
  const h = vb.height;
  const scale = 2;

  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const clone = s.cloneNode(true);
  clone.setAttribute('width', w);
  clone.setAttribute('height', h);

  const xml = new XMLSerializer().serializeToString(clone);
  const img = new Image();

  img.onload = () => { 
    ctx.scale(scale, scale); 
    ctx.drawImage(img, 0, 0); 
    canvas.toBlob(b => {
      const a = document.createElement('a'); 
      a.href = URL.createObjectURL(b);
      a.download = 'circuit.png'; 
      a.click();
    }, 'image/png', 1.0); 
  };
  
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
}

// ─── Export Report (產生完整 PDF 報告 - 垂直滿版不斷頁) ───────────────────────────────────

function exportReport() {
  const s = document.getElementById('circuit-svg');
  if (!s || typeof lastResult === 'undefined' || !lastResult) {
    return alert('Please generate the circuit first before exporting the report.');
  }

  // 1. 取得基本設定資訊
  const model = document.querySelector('input[name=model]:checked').parentNode.textContent.trim();
  const ffType = document.querySelector('input[name=fftype]:checked').parentNode.textContent.trim();
  const inputVars = document.getElementById('inputVars').value || 'X';
  const outputVars = document.getElementById('outputVars').value || 'Z';

  // 取得學生姓名與學號
  const infoBar = document.querySelector('.info-bar');
  const studentInfo = infoBar ? infoBar.innerHTML : '';

  // 2. 複製 State Table 並轉為純文字
  const tableClone = document.getElementById('stateTable').cloneNode(true);
  const ths = tableClone.querySelectorAll('th');
  if (ths.length > 0) ths[ths.length - 1].remove(); 
  
  const trs = tableClone.querySelectorAll('tbody tr');
  trs.forEach(tr => {
    const tds = tr.querySelectorAll('td');
    if (tds.length > 0) tds[tds.length - 1].remove(); 
    
    const inputs = tr.querySelectorAll('input');
    inputs.forEach(input => {
      const text = document.createTextNode(input.value || '-');
      input.parentNode.replaceChild(text, input);
    });
  });
  const cleanTableHtml = tableClone.outerHTML;

  // 3. 取得方程式與 K-Map HTML
  const out1Html = document.getElementById('output1').innerHTML;

  // 4. 取得 SVG HTML
  const svgHtml = s.outerHTML;

  // 5. 組合列印用的 HTML 報告 (垂直滿版，不斷頁)
  const reportHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Sequential Circuit Design Report</title>
      <style>
        /* 報告專屬列印排版 - 垂直 A4，固定間距 */
        @page { 
          size: A4 portrait; 
          margin: 15mm 15mm; 
        }

        /* 確保所有元素都不會超出或內縮 */
        *, *::before, *::after { box-sizing: border-box; }

        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          padding: 0; margin: 0; color: #222; 
          line-height: 1.4; background: #fff; 
          width: 100%; 
        }
        
        .header { 
          display: flex; justify-content: space-between; align-items: flex-end; 
          border-bottom: 2px solid #1a2744; padding-bottom: 8px; margin-bottom: 12px; 
          width: 100%;
        }
        .header h1 { margin: 0; font-size: 20px; color: #1a2744; }
        .student-info { font-size: 13px; color: #555; white-space: nowrap; }
        .student-info * { color: #1a2744 !important; font-weight: bold; }
        
        h2 { 
          color: #1a7a3a; margin-top: 15px; border-bottom: 1px solid #ddd; 
          padding-bottom: 4px; margin-bottom: 10px; font-size: 16px; 
          width: 100%;
        }
        
        .info-section { 
          display: flex; justify-content: space-between; margin-bottom: 15px; 
          font-size: 13px; background: #f8f9fa; padding: 10px 20px; 
          border-radius: 6px; border: 1px solid #e0e4ef; width: 100%;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        .info-section p { margin: 0; }
        .info-section strong { color: #555; margin-right: 4px; }
        
        /* 表格樣式：強制繪製所有框線 */
        table { 
          border-collapse: collapse; width: 100%; font-size: 12px; margin-bottom: 10px; 
          border: 1.5px solid #333 !important; 
        }
        th, td { border: 1px solid #555 !important; padding: 6px 8px; text-align: center; }
        th { background-color: #f0f2f8 !important; color: #333; font-weight: 600; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        
        /* 隱藏網頁版 UI 專屬元素 */
        .placeholder, .sec-label { display: none !important; }
        .out1-subtitle { display: none !important; }
        .state-vars { margin-bottom: 10px; font-weight: bold; color: #444; font-size: 12px; width: 100%; }
        
        /* K-Map 獨立卡片，填滿版寬 */
        .kmap-section { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; margin-top: 5px; width: 100%; }
        .kmap-item { 
          border: 1px solid #aaa !important; 
          padding: 8px !important; 
          border-radius: 4px !important; 
          background: #fff !important; 
          box-shadow: none !important;
          display: flex; flex-direction: column; align-items: center; 
          page-break-inside: avoid;
          flex-grow: 1; /* 讓卡諾圖卡片自動延展對齊左右邊界 */
        }
        .kmap-item .kmap-label { font-weight: 700; color: #000 !important; font-size: 13px; align-self: flex-start; margin-bottom: 4px; }
        .kmap-table { width: auto !important; margin: 0 auto; }
        
        .simplified-eq { 
          font-size: 12px; color: #333; margin-top: 6px; margin-bottom: 0; 
          padding: 4px 8px; background: transparent !important; 
          border-top: 1px dashed #ccc; width: 100%; text-align: center; 
        }
        .simplified-eq span { color: #c00 !important; font-size: 14px; margin-left: 5px; }

        /* 電路圖區塊 */
        .circuit-section {
          margin-top: 10px;
          width: 100%;
        }
        .svg-wrap { 
          text-align: center; margin-top: 10px; width: 100%; 
        }
        /* 強制電路圖寬度 100% 貼齊左右 */
        svg { 
          width: 100% !important; height: auto !important; 
          border: none !important; 
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Sequential Circuit Design Report</h1>
        <div class="student-info">${studentInfo}</div>
      </div>

      <div class="info-section">
        <p><strong>Model:</strong> ${model}</p>
        <p><strong>Flip-Flop:</strong> ${ffType}</p>
        <p><strong>Input:</strong> ${inputVars}</p>
        <p><strong>Output:</strong> ${outputVars}</p>
      </div>

      <h2>1. State Table</h2>
      ${cleanTableHtml}

      <h2>2. Equations & K-Maps</h2>
      ${out1Html}

      <div class="circuit-section">
        <h2>3. Sequential Circuit Diagram</h2>
        <div class="svg-wrap">
          ${svgHtml}
        </div>
      </div>
    </body>
    </html>
  `;

  const printWin = window.open('', '_blank');
  printWin.document.open();
  printWin.document.write(reportHTML);
  printWin.document.close();

  setTimeout(() => {
    printWin.focus();
    printWin.print();
  }, 500);
}

// ─── Stubs ────────────────────────────────────────────────────────────────────

function openSettings() { alert('Settings – coming soon!'); }
function openAbout() {
  alert('Sequential Circuit Design Automation System\n\nVersion 1.0\nFinal Project – Digital Circuit Design\n114-2 Semester');
}

// ─── Init (Global Event Binding) ──────────────────────────────────────────────
function initEvents() {
  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };

  bind('btnGenerate', generate);
  bind('btnClear', clearTable);
  bind('btnLoad', loadExample);
  bind('btnAddRow', () => addRow());
  
  bind('btnZoomIn', () => svgZoom(1.15));
  bind('btnZoomOut', () => svgZoom(0.85));
  bind('btnZoomReset', svgReset);
  bind('btnFit', svgFit);
  
  bind('btnDlSVG', downloadSVG);
  bind('btnDlPNG', downloadPNG);
  
  bind('btnSettings', openSettings);
  bind('btnExport', exportReport);
  bind('btnAbout', openAbout);
}

// 啟動應用
initEvents();
loadExample();