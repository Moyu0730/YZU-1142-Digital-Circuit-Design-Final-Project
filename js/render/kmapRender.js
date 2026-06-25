'use strict';

function renderOutput1({ eqs, groups, ffTT, outTT, ffType, nFF, varNames, states, outVar }) {
  const svNames = varNames.slice(0, nFF).join(', ');

  let html = `
    <div style="margin-bottom: 20px; width: 100%;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <h3 style="font-size: 16px; color: #0f172a; font-weight: 700; margin: 0;">Simplified Equations</h3>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
        <span style="background: #e2e8f0; color: #0f172a; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">State Variables</span>
        <span style="font-family: monospace; font-size: 14px; font-weight: 700; color: #0f172a;">${svNames}</span>
      </div>
    </div>
    
    <div class="table-container" style="flex: none; margin-bottom: 32px;">
      <table class="modern-table">
        <thead>
          <tr>
            <th>Target</th>
            <th>Port</th>
            <th style="text-align: left;">Boolean Expression</th>
          </tr>
        </thead>
        <tbody>`;

  for (let b = nFF - 1; b >= 0; b--) {
    const pins = ffType === 'JK' ? [`J${b}`,`K${b}`] : ffType === 'T' ? [`T${b}`] : [`D${b}`];
    pins.forEach((k, i) => {
      html += `<tr>
        ${i === 0 ? `<td rowspan="${pins.length}"><span style="color: #475569; font-size: 13px;">FF for</span> <strong style="color: #0f172a; font-size: 15px;">Q${b}</strong></td>` : ''}
        <td><strong style="color: #0f172a; font-size: 15px;">${k}</strong></td>
        <td style="text-align: left; padding: 12px 16px;">
          <span style="font-family: monospace; font-size: 16px; color: #475569; font-weight: 600;">${k} = </span>
          <span style="font-family: monospace; font-size: 16px; font-weight: 700; color: #2563eb;">${eqs[k] || '0'}</span>
        </td>
      </tr>`;
    });
  }
  
  html += `
        <tr class="highlight-row">
          <td><span style="color: #475569; font-size: 13px; font-weight: 600;">Output</span></td>
          <td><strong style="color: #0f172a; font-size: 15px;">${outVar}</strong></td>
          <td style="text-align: left; padding: 12px 16px;">
            <span style="font-family: monospace; font-size: 16px; color: #475569; font-weight: 600;">${outVar} = </span>
            <span style="font-family: monospace; font-size: 16px; font-weight: 700; color: #ef4444;">${eqs[outVar] || '0'}</span>
          </td>
        </tr>
      </tbody>
    </table>
    </div>`;

  html += `
    <h3 style="font-size: 16px; color: #0f172a; margin-top: 32px; margin-bottom: 16px; font-weight: 700; border-top: 1px solid #cbd5e1; padding-top: 24px; width: 100%;">
      K-Maps & Logic Grouping
    </h3>
    <div style="display: flex; flex-wrap: wrap; gap: 16px; width: 100%;">`;

  const showKeys = Object.keys(eqs).filter(k => k !== outVar);
  [...showKeys, outVar].forEach(k => {
    const tt = (k === outVar) ? outTT : ffTT[k];
    const isOutput = (k === outVar);
    const hlColor = isOutput ? '#ef4444' : '#2563eb';
    const bgColor = isOutput ? '#fef2f2' : '#eff6ff';
    
    html += `
      <div style="border: 1px solid #94a3b8; border-radius: 6px; padding: 16px; background: #ffffff; display: flex; flex-direction: column; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05); flex: 1; min-width: 250px;">
        <div style="align-self: flex-start; font-weight: 700; color: #0f172a; margin-bottom: 16px; font-size: 13px; background: #e2e8f0; padding: 6px 12px; border-radius: 4px; border: 1px solid #cbd5e1;">
          Port: ${k}
        </div>
        
        <div style="margin-bottom: 16px; width: 100%; display: flex; justify-content: center;">
          ${renderKMap(tt.ones, tt.dc, varNames, groups[k])}
        </div>
        
        <div style="margin-top: auto; background: ${bgColor}; padding: 10px 16px; border-radius: 4px; border: 1px solid #94a3b8; width: 100%; text-align: center; display: flex; justify-content: center; align-items: center; gap: 8px;">
          <span style="font-size: 14px; font-weight: 700; color: #0f172a;">${k} =</span>
          <span style="font-family: monospace; font-size: 16px; font-weight: 700; color: ${hlColor};">${eqs[k] || '0'}</span>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  document.getElementById('output1').innerHTML = html;
}

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
  
  const HDR_W = 56, CELL_W = 42, CELL_H = 36;
  const borderStyle = "1px solid #94a3b8"; 

  let rowsLen = 1, colsLen = 1;
  if (n === 1) { rowsLen = 1; colsLen = 2; }
  else if (n === 2) { rowsLen = 2; colsLen = 2; }
  else if (n === 3) { rowsLen = 2; colsLen = 4; }
  else if (n === 4) { rowsLen = 4; colsLen = 4; }

  const totalW = HDR_W + (colsLen * CELL_W);
  const totalH = CELL_H + (rowsLen * CELL_H);
  
  const thCorner = `style="width:${HDR_W}px !important; min-width:${HDR_W}px; max-width:${HDR_W}px; height:${CELL_H}px !important; padding:0 !important; font-size:11px; text-align:center; vertical-align:middle; border:${borderStyle}; background:#f1f5f9; color:#0f172a; font-weight:700; box-sizing: border-box;"`;
  const thCol    = `style="width:${CELL_W}px !important; min-width:${CELL_W}px; max-width:${CELL_W}px; height:${CELL_H}px !important; padding:0 !important; text-align:center; vertical-align:middle; border:${borderStyle}; background:#f1f5f9; color:#0f172a; font-weight:700; font-size:13px; box-sizing: border-box;"`;
  const thRow    = `style="width:${HDR_W}px !important; min-width:${HDR_W}px; max-width:${HDR_W}px; height:${CELL_H}px !important; padding:0 !important; text-align:center; vertical-align:middle; border:${borderStyle}; background:#f1f5f9; color:#0f172a; font-weight:700; font-size:13px; box-sizing: border-box;"`;

  let t = `<div style="position:relative; width:${totalW}px; height:${totalH}px; overflow:visible; display:block; box-sizing: border-box;">`;
  
  t += `<table style="width:${totalW}px !important; height:${totalH}px !important; margin:0; table-layout:fixed; border-collapse:collapse; position:absolute; top:0; left:0; z-index:2; background:transparent; box-sizing: border-box;">`;

  function getCellHtml(c) {
    let cellBg = 'transparent';
    let cellColor = '#64748b'; 
    if (c.v === '1') { cellBg = '#f0fdf4'; cellColor = '#16a34a'; } 
    if (c.v === 'X') { cellBg = '#fffbeb'; cellColor = '#ca8a04'; } 
    return `<td style="background:${cellBg}; color:${cellColor}; width:${CELL_W}px !important; min-width:${CELL_W}px; max-width:${CELL_W}px; height:${CELL_H}px !important; padding:0 !important; text-align:center; vertical-align:middle; position:relative; z-index:2; border:${borderStyle}; font-size:15px; font-weight:700; box-sizing: border-box;">${c.v}</td>`;
  }

  if (n === 1) {
    const [v0] = varNames;
    t += `<tr><th ${thCorner}>${v0}</th><th ${thCol}>0</th><th ${thCol}>1</th></tr>`;
    t += `<tr><th ${thRow}></th>`;
    for (let x = 0; x <= 1; x++) { t += getCellHtml(cellVal(x)); }
    t += `</tr>`;
  }
  else if (n === 2) {
    const [r0, c0] = varNames;
    t += `<tr><th ${thCorner}>${r0}\\${c0}</th><th ${thCol}>0</th><th ${thCol}>1</th></tr>`;
    for (let r = 0; r <= 1; r++) {
      t += `<tr><th ${thRow}>${r}</th>`;
      for (let c = 0; c <= 1; c++) {
        const idx = (r << 1) | c;
        t += getCellHtml(cellVal(idx));
      }
      t += `</tr>`;
    }
  }
  else if (n === 3) {
    const rowVar = varNames[0];
    const colH   = gray.map(g => `<th ${thCol}>${(g>>1)&1}${g&1}</th>`).join('');
    t += `<tr><th ${thCorner}>${rowVar}\\${varNames[1]}${varNames[2]}</th>${colH}</tr>`;
    for (let r = 0; r <= 1; r++) {
      t += `<tr><th ${thRow}>${r}</th>`;
      gray.forEach(g => {
        const q0 = (g >> 1) & 1, x = g & 1;
        const idx = (r << 2) | (q0 << 1) | x;
        t += getCellHtml(cellVal(idx));
      });
      t += `</tr>`;
    }
  }
  else if (n === 4) {
    const r0 = varNames[0], r1 = varNames[1], c0 = varNames[2], c1 = varNames[3];
    const colH = gray.map(g => `<th ${thCol}>${(g>>1)&1}${g&1}</th>`).join('');
    t += `<tr><th ${thCorner}>${r0}${r1}\\${c0}${c1}</th>${colH}</tr>`;
    gray.forEach(rg => {
      const rh = `${(rg>>1)&1}${rg&1}`;
      t += `<tr><th ${thRow}>${rh}</th>`;
      gray.forEach(cg => {
        const r_val = (rg >> 1) & 1, r2val = rg & 1;
        const c_val = (cg >> 1) & 1, c2val = cg & 1;
        const idx = (r_val << 3) | (r2val << 2) | (c_val << 1) | c2val;
        t += getCellHtml(cellVal(idx));
      });
      t += `</tr>`;
    });
  }
  t += `</table>`;

  if (n <= 4 && groups && groups.length > 0) {
    t += `<svg style="position:absolute; top:0; left:0; width:${totalW}px; height:${totalH}px; pointer-events:none; z-index:5;">`;
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
    
    let getPos = m => ({r:0, c:0});
    if (n === 1) { getPos = m => ({ r: 0, c: m & 1 }); }
    else if (n === 2) { getPos = m => ({ r: (m>>1)&1, c: m&1 }); }
    else if (n === 3) { getPos = m => ({ r: (m>>2)&1, c: gray.indexOf(m&3) }); }
    else if (n === 4) { getPos = m => ({ r: gray.indexOf((m>>2)&3), c: gray.indexOf(m&3) }); }

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
      
      const inset = 4 + (gIdx % 3) * 2; 

      rSegs.forEach(rs => {
        cSegs.forEach(cs => {
          const rx = HDR_W + cs[0] * CELL_W + inset;
          const ry = CELL_H + rs[0] * CELL_H + inset;
          const rw = (cs[1] - cs[0] + 1) * CELL_W - inset * 2;
          const rh = (rs[1] - rs[0] + 1) * CELL_H - inset * 2;
          t += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="6" fill="${color}1A" stroke="${color}" stroke-width="2.5" />`;
        });
      });
    });
    t += `</svg>`;
  }

  t += `</div>`;
  return t;
}