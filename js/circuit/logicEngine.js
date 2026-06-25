'use strict';

// Global state required for PDF Export
let lastResult = null;

// ─── Quine-McCluskey & Bitwise Operations ───────────────────────────────────

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
  allTerms.forEach(t => { const k = popcount(t.bits); (grouped[k] = grouped[k] || []).push(t); });

  const primes = [];
  function combine(groups) {
    const next = {}; let changed = false;
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
  return { eq: terms.join(' + ') || '0', groups: selectedPrimes };
}

// ─── Flip-flop Excitation Tables ────────────────────────────────────────────

function exciteJK(q, qn) {
  if (q === 0 && qn === 0) return { J: 0, K: -1 };
  if (q === 0 && qn === 1) return { J: 1, K: -1 };
  if (q === 1 && qn === 0) return { J: -1, K: 1 };
  return { J: -1, K: 0 };
}
function exciteT(q, qn)  { return { T: q ^ qn }; }
function exciteD(q, qn)  { return { D: qn }; }

// ─── Boolean Expression Parser (AST) ────────────────────────────────────────

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

// ─── Main Logic Controller ──────────────────────────────────────────────────

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

    // Passes payload to UI renderers
    renderOutput1(lastResult);
    renderOutput2(lastResult);

  } catch (error) {
    console.error("Generate Error: ", error);
    alert("An error occurred during generation. Check the console for details.\n\n" + error.message);
  }
}