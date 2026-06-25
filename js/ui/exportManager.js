'use strict';

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
  const w = vb.width; const h = vb.height; const scale = 2;

  const canvas = document.createElement('canvas');
  canvas.width = w * scale; canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);

  const clone = s.cloneNode(true);
  clone.setAttribute('width', w); clone.setAttribute('height', h);
  const xml = new XMLSerializer().serializeToString(clone);
  const img = new Image();

  img.onload = () => { 
    ctx.scale(scale, scale); ctx.drawImage(img, 0, 0); 
    canvas.toBlob(b => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(b);
      a.download = 'circuit.png'; a.click();
    }, 'image/png', 1.0); 
  };
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
}

function exportReport() {
  const s = document.getElementById('circuit-svg');
  if (!s || typeof lastResult === 'undefined' || !lastResult) {
    return alert('Please generate the circuit first before exporting the report.');
  }

  const model = document.querySelector('input[name=model]:checked').parentNode.textContent.trim();
  const ffType = document.querySelector('input[name=fftype]:checked').parentNode.textContent.trim();
  const inputVars = document.getElementById('inputVars').value || 'X';
  const outputVars = document.getElementById('outputVars').value || 'Z';
  const infoBar = document.querySelector('.info-bar');
  const studentInfo = infoBar ? infoBar.innerHTML : '';

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
  const out1Html = document.getElementById('output1').innerHTML;
  const svgHtml = s.outerHTML;

  const reportHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Sequential Circuit Design Report</title>
      <style>
        @page { size: A4 portrait; margin: 15mm 15mm; }
        *, *::before, *::after { box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 0; margin: 0; color: #222; line-height: 1.4; background: #fff; width: 100%; }
        .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1a2744; padding-bottom: 8px; margin-bottom: 12px; width: 100%; }
        .header h1 { margin: 0; font-size: 20px; color: #1a2744; }
        .student-info { font-size: 13px; color: #555; white-space: nowrap; }
        .student-info * { color: #1a2744 !important; font-weight: bold; }
        h2 { color: #1a7a3a; margin-top: 15px; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 10px; font-size: 16px; width: 100%; }
        .info-section { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 13px; background: #f8f9fa; padding: 10px 20px; border-radius: 6px; border: 1px solid #e0e4ef; width: 100%; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .info-section p { margin: 0; }
        .info-section strong { color: #555; margin-right: 4px; }
        table { border-collapse: collapse; width: 100%; font-size: 12px; margin-bottom: 10px; border: 1.5px solid #333 !important; }
        th, td { border: 1px solid #555 !important; padding: 6px 8px; text-align: center; }
        th { background-color: #f0f2f8 !important; color: #333; font-weight: 600; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .placeholder, .sec-label { display: none !important; }
        .out1-subtitle { display: none !important; }
        .state-vars { margin-bottom: 10px; font-weight: bold; color: #444; font-size: 12px; width: 100%; }
        .kmap-section { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; margin-top: 5px; width: 100%; }
        .kmap-item { border: 1px solid #aaa !important; padding: 8px !important; border-radius: 4px !important; background: #fff !important; box-shadow: none !important; display: flex; flex-direction: column; align-items: center; page-break-inside: avoid; flex-grow: 1; }
        .kmap-item .kmap-label { font-weight: 700; color: #000 !important; font-size: 13px; align-self: flex-start; margin-bottom: 4px; }
        .kmap-table { width: auto !important; margin: 0 auto; }
        .simplified-eq { font-size: 12px; color: #333; margin-top: 6px; margin-bottom: 0; padding: 4px 8px; background: transparent !important; border-top: 1px dashed #ccc; width: 100%; text-align: center; }
        .simplified-eq span { color: #c00 !important; font-size: 14px; margin-left: 5px; }
        .circuit-section { margin-top: 10px; width: 100%; }
        .svg-wrap { text-align: center; margin-top: 10px; width: 100%; }
        svg { width: 100% !important; height: auto !important; border: none !important; }
      </style>
    </head>
    <body>
      <div class="header"><h1>Sequential Circuit Design Report</h1><div class="student-info">${studentInfo}</div></div>
      <div class="info-section"><p><strong>Model:</strong> ${model}</p><p><strong>Flip-Flop:</strong> ${ffType}</p><p><strong>Input:</strong> ${inputVars}</p><p><strong>Output:</strong> ${outputVars}</p></div>
      <h2>1. State Table</h2>${cleanTableHtml}
      <h2>2. Equations & K-Maps</h2>${out1Html}
      <div class="circuit-section"><h2>3. Sequential Circuit Diagram</h2><div class="svg-wrap">${svgHtml}</div></div>
    </body>
    </html>
  `;

  const printWin = window.open('', '_blank');
  printWin.document.open(); printWin.document.write(reportHTML); printWin.document.close();
  setTimeout(() => { printWin.focus(); printWin.print(); }, 500);
}