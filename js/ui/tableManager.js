'use strict';

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
      return { ps: inp[0].value.trim().toUpperCase(), x : inp[1].value.trim(), ns: inp[2].value.trim().toUpperCase(), z : inp[3].value.trim() };
    })
    .filter(r => r.ps && r.ns);
}