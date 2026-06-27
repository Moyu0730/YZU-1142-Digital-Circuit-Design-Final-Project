'use strict';

// =========================================================
// tableManager.js — State Transition Table CRUD
// Manages the editable HTML table in the Configuration panel.
// All functions operate directly on DOM; no separate data store.
// =========================================================

// Appends one row to the state table with optional pre-filled values.
// Default placeholder "-" appears when a cell is empty.
function addRow(ps = '', x = '', ns = '', z = '') {
  const tbody = document.getElementById('tableBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" value="${ps}" placeholder="-" spellcheck="false"></td>
    <td><input type="text" value="${x}"  placeholder="-" spellcheck="false"></td>
    <td><input type="text" value="${ns}" placeholder="-" spellcheck="false"></td>
    <td><input type="text" value="${z}"  placeholder="-" spellcheck="false"></td>
    <td class="col-action"><button class="del-btn" onclick="this.closest('tr').remove()" title="Delete Row">×</button></td>
  `;
  tbody.appendChild(tr);
}

// Wipes all table rows and inserts one blank row.
function clearTable() {
  document.getElementById('tableBody').innerHTML = '';
  addRow();
}

// Loads a built-in 3-state Mealy JK example and resets all control inputs
// to their defaults so the example generates cleanly on first run.
function loadExample() {
  document.getElementById('tableBody').innerHTML = '';
  [['A','0','A','0'],['A','1','B','0'],
   ['B','0','C','1'],['B','1','A','0'],
   ['C','0','A','1'],['C','1','C','1']]
    .forEach(r => addRow(...r));

  document.querySelector('input[name=fftype][value=JK]').checked = true;
  document.querySelector('input[name=model][value=mealy]').checked = true;

  const inpVar = document.getElementById('inputVars');
  const outVar = document.getElementById('outputVars');
  if (inpVar) inpVar.value = 'X';
  if (outVar) outVar.value = 'Z';

  const thInp = document.getElementById('thInput');
  const thOut = document.getElementById('thOutput');
  if (thInp) thInp.textContent = 'X';
  if (thOut) thOut.textContent = 'Z';
}

// Reads all rows from the DOM and returns an array of state-row objects.
// State names are normalized to uppercase; rows with missing PS or NS are filtered out.
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
