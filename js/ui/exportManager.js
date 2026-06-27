'use strict';

// =========================================================
// exportManager.js — SVG / PNG / PDF Export Engine
// Provides three export paths:
//   downloadSVG()     — clean vector download (strips canvas zoom styles)
//   downloadPNG()     — 2× high-res rasterization via Canvas API
//   exportReport()    — full A4 PDF report in a modal iframe preview
// =========================================================

// Downloads the circuit as a clean SVG file.
// The live SVG has inline width/height/transform from the zoom engine;
// cloning and stripping those properties ensures the export matches
// the diagram's intrinsic viewBox dimensions rather than its display size.
function downloadSVG() {
  const s = document.getElementById('circuit-svg');
  if (!s) return alert('Generate the circuit first.');

  const clone = s.cloneNode(true);
  clone.style.removeProperty('width');
  clone.style.removeProperty('height');
  clone.style.removeProperty('max-width');
  clone.style.removeProperty('max-height');
  clone.style.removeProperty('transform');

  const w = s.getAttribute('data-base-width') || (s.viewBox ? s.viewBox.baseVal.width : 800);
  const h = s.getAttribute('data-base-height') || (s.viewBox ? s.viewBox.baseVal.height : 600);
  clone.setAttribute('width', w);
  clone.setAttribute('height', h);

  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type:'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'circuit.svg';
  a.click();
}

// Downloads the circuit as a high-resolution PNG (2× scale).
// Uses Canvas API: SVG → base64 data URI → Image → Canvas → PNG blob.
function downloadPNG() {
  const s = document.getElementById('circuit-svg');
  if (!s) return alert('Generate the circuit first.');

  const w = s.viewBox ? s.viewBox.baseVal.width : (parseFloat(s.getAttribute('data-base-width')) || 800);
  const h = s.viewBox ? s.viewBox.baseVal.height : (parseFloat(s.getAttribute('data-base-height')) || 600);
  const scale = 2; // 2× for retina-quality output

  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Strip zoom styles before serializing; the Canvas renderer uses intrinsic dimensions
  const clone = s.cloneNode(true);
  clone.style.removeProperty('width');
  clone.style.removeProperty('height');
  clone.style.removeProperty('max-width');
  clone.style.removeProperty('max-height');
  clone.style.removeProperty('transform');
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

// Compiles a complete A4 HTML report and opens it in a modal iframe preview.
// The report includes: student info, configuration summary, state table,
// simplified equations + K-maps (cloned from the DOM), and the SVG schematic.
// From the preview the user can trigger the browser's native print dialog.
function exportReport() {
  const s = document.getElementById('circuit-svg');
  if (!s || typeof lastResult === 'undefined' || !lastResult) {
    return alert('Please generate the circuit first before exporting the report.');
  }

  const model      = document.querySelector('input[name=model]:checked').parentNode.textContent.trim();
  const ffType     = document.querySelector('input[name=fftype]:checked').parentNode.textContent.trim();
  const inputVars  = document.getElementById('inputVars').value || 'X';
  const outputVars = document.getElementById('outputVars').value || 'Z';

  const infoBar    = document.querySelector('.nav-user');
  const studentInfo = infoBar ? infoBar.innerHTML : '';

  // Clone the state table and strip the action column + input elements
  const tableClone = document.getElementById('stateTable').cloneNode(true);
  const ths = tableClone.querySelectorAll('th');
  if (ths.length > 0) ths[ths.length - 1].remove();

  const trs = tableClone.querySelectorAll('tbody tr');
  trs.forEach(tr => {
    const tds = tr.querySelectorAll('td');
    if (ths.length > 0) tds[ths.length - 1].remove();

    const inputs = tr.querySelectorAll('input');
    inputs.forEach(input => {
      const text = document.createTextNode(input.value || '-');
      input.parentNode.replaceChild(text, input);
    });
  });
  const cleanTableHtml = tableClone.outerHTML;
  const out1Html = document.getElementById('output1').innerHTML;

  // SVG must be cloned and have its zoom inline styles removed so the A4
  // layout can scale it with width="100%" without the fixed pixel dimensions
  // blowing out the page width.
  const svgClone = s.cloneNode(true);
  svgClone.style.removeProperty('width');
  svgClone.style.removeProperty('height');
  svgClone.style.removeProperty('max-width');
  svgClone.style.removeProperty('max-height');
  svgClone.style.removeProperty('transform');
  svgClone.setAttribute('width', '100%');
  svgClone.setAttribute('height', 'auto');
  const svgHtml = svgClone.outerHTML;

  // -------------------------------------------------------
  // Full A4 report HTML document (loaded into iframe)
  // -------------------------------------------------------
  const reportHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Sequential Circuit Design Report</title>
      <style>
        *, *::before, *::after { box-sizing: border-box; }

        @media screen {
          html, body { margin: 0; padding: 0; overflow: hidden; background: transparent; }
          body {
            width: 794px;
            padding: 15mm;
            box-sizing: border-box;
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #0f172a; line-height: 1.4;
          }
        }

        @media print {
          @page { size: A4 portrait; margin: 15mm; }
          html, body { margin: 0; padding: 0; width: 100%; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; line-height: 1.4; }
        }

        .header {
          display: flex; justify-content: space-between; align-items: flex-end;
          border-bottom: 2px solid #1e293b; padding-bottom: 8px; margin-bottom: 16px;
          width: 100%;
        }
        .header h1 { margin: 0; font-size: 22px; color: #0f172a; }
        .student-info { font-size: 13px; color: #475569; white-space: nowrap; display: flex; gap: 10px; align-items: center; }
        .student-info * { color: #0f172a !important; font-weight: bold; }
        .user-badge { display: none; }

        h2 {
          color: #2563eb; margin-top: 24px; border-bottom: 1px solid #cbd5e1;
          padding-bottom: 6px; margin-bottom: 12px; font-size: 16px;
          width: 100%; text-transform: uppercase; letter-spacing: 0.5px;
          page-break-after: avoid; page-break-inside: avoid;
        }
        h3 { page-break-after: avoid; }

        .info-section {
          display: flex; justify-content: space-between; margin-bottom: 20px;
          font-size: 13px; background: #f8fafc; padding: 12px 20px;
          border-radius: 6px; border: 1px solid #cbd5e1; width: 100%;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        .info-section p { margin: 0; }
        .info-section strong { color: #334155; margin-right: 6px; text-transform: uppercase; font-size: 11px; }

        .table-container { border: 2px solid #334155 !important; border-radius: 4px; overflow: hidden; margin-bottom: 16px; page-break-inside: avoid; }
        .modern-table { border-collapse: collapse; width: 100%; font-size: 14px; text-align: center; }
        .modern-table th, .modern-table td { border: 1px solid #94a3b8 !important; padding: 10px; }
        .modern-table th { background-color: #1e293b !important; color: #ffffff !important; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .modern-table tbody tr:nth-child(even) td { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .modern-table td { font-weight: 600; }

        .placeholder, .sec-label, .empty-state, .drag-handle { display: none !important; }
        .circuit-section { margin-top: 16px; width: 100%; page-break-inside: avoid; }
        .svg-wrap { text-align: center; margin-top: 16px; width: 100%; }

        svg { max-width: 100% !important; height: auto !important; border: 1px solid #cbd5e1 !important; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Sequential Circuit Design Report</h1>
        <div class="student-info">${studentInfo}</div>
      </div>
      <div class="info-section">
        <p><strong>Model:</strong> ${model}</p><p><strong>Flip-Flop:</strong> ${ffType}</p>
        <p><strong>Input:</strong> ${inputVars}</p><p><strong>Output:</strong> ${outputVars}</p>
      </div>
      <h2>1. State Transition Table</h2>
      <div class="table-container"><table class="modern-table">${cleanTableHtml.replace(/<table[^>]*>|<\/table>/gi, '')}</table></div>
      <h2>2. Logic Synthesis</h2>${out1Html}
      <div class="circuit-section">
        <h2>3. Sequential Circuit Schematic</h2>
        <div class="svg-wrap">${svgHtml}</div>
      </div>
    </body>
    </html>
  `;

  // -------------------------------------------------------
  // PDF Preview Modal UI
  // -------------------------------------------------------
  const previewBodyHtml = `
    <div class="pdf-controls-bar" style="gap: 6px;">
      <select class="pdf-select-menu" id="pdfZoomSelect" onchange="onZoomMenuChange(this.value)" style="margin-right: 8px;">
        <option value="fit_page">Fit to Page</option>
        <option value="fit_width" selected>Fit to Width</option>
        <option value="actual">Actual Size (1:1)</option>
        <option value="0.5">50%</option>
        <option value="1.0">100%</option>
        <option value="1.5">150%</option>
        <option value="2.0">200%</option>
      </select>

      <div style="display:flex; border: 1px solid #cbd5e1; border-radius: 4px; overflow:hidden; background: #fff;">
        <button onclick="fitIframeToContainer()" title="Fit to Height" style="border:none; border-radius:0; border-right: 1px solid #cbd5e1; padding: 6px 10px;">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="#334155" stroke-width="2" fill="none"><rect x="4" y="2" width="16" height="20" rx="2"></rect><polyline points="12 7 9 10 15 10 12 7"></polyline><polyline points="12 17 9 14 15 14 12 17"></polyline></svg>
        </button>
        <button onclick="fitIframeToWidth()" title="Fit to Width" style="border:none; border-radius:0; padding: 6px 10px;">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="#334155" stroke-width="2" fill="none"><rect x="4" y="2" width="16" height="20" rx="2"></rect><polyline points="7 12 10 9 10 15 7 12"></polyline><polyline points="17 12 14 9 14 15 17 12"></polyline></svg>
        </button>
      </div>

      <div style="display:flex; border: 1px solid #cbd5e1; border-radius: 4px; overflow:hidden; background: #fff; margin-left: 8px;">
        <button onclick="adjustIframeZoom(-0.1)" title="Zoom Out" style="border:none; border-radius:0; border-right: 1px solid #cbd5e1; padding: 6px 10px;">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="#334155" stroke-width="2" fill="none" stroke-linecap="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
        </button>
        <button onclick="adjustIframeZoom(0.1)" title="Zoom In" style="border:none; border-radius:0; padding: 6px 10px;">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="#334155" stroke-width="2" fill="none" stroke-linecap="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
        </button>
      </div>

      <span style="font-size:12px; color:var(--text-muted); margin-left:auto;">
        ℹ️ Scroll down to preview entire document.
      </span>
    </div>

    <div class="pdf-preview-viewport" id="pdfViewportArea">
      <div class="pdf-scale-container" id="pdfScaleWrapper">
        <iframe class="pdf-preview-iframe" id="pdfPreviewerIframe" scrolling="no"></iframe>
      </div>
    </div>
  `;

  const previewFooterHtml = `
    <button class="btn btn-bordered" onclick="closeSystemModal()">Dismiss</button>
    <button class="btn btn-primary" onclick="triggerEmbeddedPrint()">Confirm Print & Export</button>
  `;

  openSystemModalWidened('PDF Print Preview & Export', previewBodyHtml, previewFooterHtml);

  // Load the report HTML into the iframe after the modal animates in,
  // then apply an initial fit-to-width scale
  setTimeout(() => {
    const modalBodyContent = document.getElementById('modalBodyContent');
    if (modalBodyContent) modalBodyContent.classList.add('pdf-mode');

    const iframe = document.getElementById('pdfPreviewerIframe');
    if (iframe) {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(reportHTML);
      doc.close();

      iframe.currentZoom = 1.0;
      setTimeout(fitIframeToWidth, 150);
    }
  }, 100);
}

// =========================================================
// PDF Preview Zoom Engine
// Scales the iframe using CSS transform and updates the wrapper
// dimensions so the outer scroll container reflects the true size.
// =========================================================

// Applies a CSS transform scale to the iframe and resizes its wrapper so
// the single scroll owner (.pdf-preview-viewport) scrolls correctly.
function applyIframeScale(scale) {
  const iframe  = document.getElementById('pdfPreviewerIframe');
  const wrapper = document.getElementById('pdfScaleWrapper');
  const select  = document.getElementById('pdfZoomSelect');

  if (iframe && wrapper) {
    iframe.currentZoom = scale;

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    let contentHeight = 1123; // A4 height in px at 96 dpi
    if (doc && doc.body) {
      contentHeight = Math.max(1123, doc.body.scrollHeight);
    }

    iframe.style.height = contentHeight + 'px';
    iframe.style.transform = `scale(${scale})`;
    wrapper.style.width  = (794 * scale) + 'px';
    wrapper.style.height = (contentHeight * scale) + 'px';

    if (select) {
      Array.from(select.options).forEach(opt => {
        if (parseFloat(opt.value) === scale) opt.selected = true;
      });
    }
  }
}

// Dispatches the zoom dropdown value to the appropriate scale function.
function onZoomMenuChange(val) {
  if (val === 'fit_page') fitIframeToContainer();
  else if (val === 'fit_width') fitIframeToWidth();
  else if (val === 'actual') applyIframeScale(1.0);
  else {
    const scale = parseFloat(val);
    if (!isNaN(scale)) applyIframeScale(scale);
  }
}

// Scales the iframe so the entire A4 page height fits inside the viewport.
function fitIframeToContainer() {
  const iframe   = document.getElementById('pdfPreviewerIframe');
  const viewport = document.getElementById('pdfViewportArea');
  if (iframe && viewport) {
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    const contentHeight = (doc && doc.body) ? Math.max(1123, doc.body.scrollHeight) : 1123;
    const scaleWidth  = (viewport.clientWidth  - 80) / 794;
    const scaleHeight = (viewport.clientHeight - 80) / contentHeight;
    applyIframeScale(Math.min(1.0, scaleWidth, scaleHeight));
    const select = document.getElementById('pdfZoomSelect');
    if (select) select.value = 'fit_page';
  }
}

// Scales the iframe so the A4 page width fills the viewport width (default view).
function fitIframeToWidth() {
  const viewport = document.getElementById('pdfViewportArea');
  if (viewport) {
    const scaleWidth = (viewport.clientWidth - 80) / 794;
    applyIframeScale(Math.min(1.2, scaleWidth));
    const select = document.getElementById('pdfZoomSelect');
    if (select) select.value = 'fit_width';
  }
}

// Nudges the current zoom level by the given amount (positive = zoom in).
function adjustIframeZoom(amount) {
  const iframe = document.getElementById('pdfPreviewerIframe');
  if (iframe) {
    let newZoom = (iframe.currentZoom || 1.0) + amount;
    newZoom = Math.max(0.25, Math.min(3.0, newZoom));
    applyIframeScale(newZoom);
  }
}

// Focuses the iframe and triggers the browser's native print dialog.
function triggerEmbeddedPrint() {
  const iframe = document.getElementById('pdfPreviewerIframe');
  if (iframe) {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }
}
