'use strict';

function openSettings() { alert('Settings – coming soon!'); }
function openAbout() {
  alert('Sequential Circuit Design Automation System\n\nVersion 1.0\nFinal Project – Digital Circuit Design\n114-2 Semester');
}

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