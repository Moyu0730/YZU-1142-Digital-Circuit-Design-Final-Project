'use strict';

// Stores the most recent generate() result so other modules (exportManager,
// circuitInteraction) can access equations and metadata without re-running.
let lastResult = null;

// =========================================================
// 1. BOOLEAN EXPRESSION PARSER (AST GENERATOR)
// =========================================================

// Parses a Boolean expression string into an Abstract Syntax Tree (AST).
// Supports variables (A-Z, a-z, 0-9, _), operators +, ·, *, ', parentheses,
// and implicit AND (adjacent terms without an explicit operator).
// Returns an AST node: { t:'c'|'v'|'and'|'or'|'not', v?, c? }
function parseBool(str) {
  str = (str || '').trim();
  if (!str || str === '0') return { t: 'c', v: 0 };
  if (str === '1')         return { t: 'c', v: 1 };

  // Tokenize: emit OR, AND, NOT, parentheses, and variable objects
  const raw = [];
  for (let i = 0; i < str.length; ) {
    const c = str[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '+')  { raw.push('OR');  i++; }
    else if (c === '·' || c === '*') { raw.push('AND'); i++; }
    else if (c === "'") { raw.push('NOT'); i++; }
    else if (c === '(') { raw.push('('); i++; }
    else if (c === ')') { raw.push(')'); i++; }
    else if (/[A-Za-z0-9_]/.test(c)) {
      let v = ''; while (i < str.length && /[A-Za-z0-9_]/.test(str[i])) v += str[i++];
      raw.push({ v });
    } else i++;
  }

  // Insert implicit AND tokens between adjacent operands (e.g. "AB" → "A AND B")
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

  // Recursive descent parser: OR > AND > NOT > PRIMARY
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

// Flattens nested AND/OR nodes with the same type into a single n-ary node.
// e.g. or(or(A,B),C) → or(A,B,C). Required before SVG gate drawing so each
// gate gets the correct number of inputs.
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

// =========================================================
// 2. QUINE-MCCLUSKEY ALGORITHM ENGINE
// =========================================================

// Counts the number of 1-bits in n (used to group minterms by Hamming weight).
function popcount(n) {
  let c = 0; while (n) { c += n & 1; n >>>= 1; } return c;
}

// Minimizes a Boolean function using the Quine-McCluskey tabular method.
//   minterms   — row indices where the function output is 1
//   dontcares  — row indices that can be treated as either 0 or 1
//   nVars      — number of input variables (determines table width)
//   names      — variable name array ordered MSB→LSB (e.g. ['Q1','Q0','X'])
// Returns { eq: string, groups: prime implicant array }.
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

  // Iteratively combine adjacent groups that differ by exactly one bit,
  // collecting terms that cannot be combined further as prime implicants.
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

  // Essential prime implicant selection: greedily pick the PI covering the
  // most uncovered minterms until all minterms are covered.
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

  // Convert a prime implicant back to a product term string (e.g. "Q1 · X'")
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

// =========================================================
// 3. FLIP-FLOP EXCITATION TABLES
// =========================================================

// Maps present state (q) and next state (qn) to the required FF input values.
// -1 denotes a don't-care condition used to expand the QM don't-care set.
function exciteJK(q, qn) {
  if (q === 0 && qn === 0) return { J: 0, K: -1 };
  if (q === 0 && qn === 1) return { J: 1, K: -1 };
  if (q === 1 && qn === 0) return { J: -1, K: 1 };
  return { J: -1, K: 0 };
}
function exciteT(q, qn)  { return { T: q ^ qn }; }
function exciteD(q, qn)  { return { D: qn }; }

// =========================================================
// 4. MAIN GENERATION CONTROLLER
// =========================================================

// Orchestrates the full synthesis pipeline:
//   1. Read state table rows from the DOM
//   2. Assign binary state codes and enumerate truth-table rows
//   3. Compute FF excitation values and apply Quine-McCluskey minimization
//   4. Route output equation through either Mealy or Moore logic
//   5. Store result in lastResult and trigger both render passes
function generate() {
  try {
    const rows = getTableData();
    if (!rows.length) { alert('Please enter state table rows.'); return; }

    const ffType = document.querySelector('input[name=fftype]:checked').value;
    const model  = document.querySelector('input[name=model]:checked').value;

    const outVar = (document.getElementById('outputVars').value.trim() || 'Z').split(',')[0].trim();
    const inVar  = (document.getElementById('inputVars').value.trim() || 'X').split(',')[0].trim();

    const states = [...new Set(rows.map(r => r.ps))].sort();
    const nFF    = Math.ceil(Math.log2(Math.max(states.length, 2)));
    const code   = {};
    states.forEach((s, i) => { code[s] = i; });

    // State variable names Q(n-1)...Q0; inVar is appended for Mealy calculations
    const stateVarNames = [];
    for (let b = nFF - 1; b >= 0; b--) stateVarNames.push(`Q${b}`);

    const varNames = [...stateVarNames];
    varNames.push(inVar);
    const nVars = nFF + 1;

    const ffTT = {};
    const outTT = { ones: [], dc: [] };        // Mealy: Z depends on state + input
    const outTT_moore = { ones: [], dc: [] };  // Moore: Z depends on state only

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
    const seenMoore = new Set();

    rows.forEach(row => {
      const ps   = code[row.ps];
      const ns   = code[row.ns];
      const xVal = parseInt(row.x) || 0;
      if (ps === undefined || ns === undefined) return;

      // Row index encodes state bits in upper bits and input in LSB
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

      // Mealy: output depends on both current state and current input
      if (zVal === 1) outTT.ones.push(idx);

      // Moore: only the first row per state determines Z; subsequent rows with
      // the same state are ignored so the output is input-independent
      if (!seenMoore.has(ps)) {
        seenMoore.add(ps);
        if (zVal === 1) outTT_moore.ones.push(ps);
      }
    });

    // Any truth-table row not covered by a state-table entry becomes a don't care
    for (let i = 0; i < (1 << nVars); i++) {
      if (!seen.has(i)) {
        allFFkeys.forEach(k => ffTT[k].dc.push(i));
        outTT.dc.push(i);
      }
    }
    for (let i = 0; i < (1 << nFF); i++) {
      if (!seenMoore.has(i)) outTT_moore.dc.push(i);
    }

    const eqs = {};
    const groups = {};

    allFFkeys.forEach(k => {
      const res = qm(ffTT[k].ones, ffTT[k].dc, nVars, varNames);
      eqs[k] = res.eq;
      groups[k] = res.groups;
    });

    // Route output minimization through the correct variable set based on the model
    const finalOutTT   = model === 'moore' ? outTT_moore : outTT;
    const finalOutVars = model === 'moore' ? stateVarNames : varNames;
    const finalOutNVars = model === 'moore' ? nFF : nVars;

    const outRes = qm(finalOutTT.ones, finalOutTT.dc, finalOutNVars, finalOutVars);
    eqs[outVar] = outRes.eq;
    groups[outVar] = outRes.groups;

    lastResult = { eqs, groups, ffTT, outTT: finalOutTT, ffType, nFF, nVars, varNames, outVarNames: finalOutVars, states, code, rows, outVar, model };

    renderOutput1(lastResult);
    renderOutput2(lastResult);

  } catch (error) {
    console.error("[CRITICAL] Generate Error: ", error);
    alert("An error occurred during generation. Check the console for details.\n\n" + error.message);
  }
}
