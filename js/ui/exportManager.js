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

function exportReport() {
  const s = document.getElementById('circuit-svg');
  if (!s || typeof lastResult === 'undefined' || !lastResult) {
    return alert('Please generate the circuit first before exporting the report.');
  }

  const model = document.querySelector('input[name=model]:checked').parentNode.textContent.trim();
  const ffType = document.querySelector('input[name=fftype]:checked').parentNode.textContent.trim();
  const inputVars = document.getElementById('inputVars').value || 'X';
  const outputVars = document.getElementById('outputVars').value || 'Z';

  const infoBar = document.querySelector('.nav-user');
  const studentInfo = infoBar ? infoBar.innerHTML : '';

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
  const svgHtml = s.outerHTML;

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
          page-break-after: avoid; 
          page-break-inside: avoid;
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
        
        .table-container { 
          border: 2px solid #334155 !important; border-radius: 4px; 
          overflow: hidden; margin-bottom: 16px; page-break-inside: avoid; 
        }
        .modern-table { border-collapse: collapse; width: 100%; font-size: 14px; text-align: center; }
        .modern-table th, .modern-table td { border: 1px solid #94a3b8 !important; padding: 10px; }
        .modern-table th { 
          background-color: #1e293b !important; color: #ffffff !important; 
          font-weight: 700; text-transform: uppercase; letter-spacing: 1px; 
          -webkit-print-color-adjust: exact; print-color-adjust: exact; 
        }
        .modern-table tbody tr:nth-child(even) td { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .modern-table td { font-weight: 600; }
        
        .placeholder, .sec-label, .empty-state, .drag-handle { display: none !important; }
        
        .circuit-section { margin-top: 16px; width: 100%; page-break-inside: avoid; }
        .svg-wrap { text-align: center; margin-top: 16px; width: 100%; }
        svg { 
          max-width: 100% !important; max-height: 120mm !important; 
          width: auto !important; height: auto !important; 
          border: 1px solid #cbd5e1 !important; border-radius: 4px;
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

      <h2>1. State Transition Table</h2>
      <div class="table-container">
        <table class="modern-table">
          ${cleanTableHtml.replace(/<table[^>]*>|<\/table>/gi, '')}
        </table>
      </div>

      <h2>2. Logic Synthesis</h2>
      ${out1Html}

      <div class="circuit-section">
        <h2>3. Sequential Circuit Schematic</h2>
        <div class="svg-wrap">
          ${svgHtml}
        </div>
      </div>
    </body>
    </html>
  `;

  // >>> REFACTORED SCALER DOM: Pure single-scrollbar architecture <<<
  const previewBodyHtml = `
    <div class="pdf-controls-bar">
      <select class="pdf-select-menu" id="pdfZoomSelect" onchange="onZoomMenuChange(this.value)">
        <option value="fit_page">Fit to Page</option>
        <option value="fit_width" selected>Fit to Width</option>
        <option value="actual">Actual Size (1:1)</option>
        <option value="0.5">50%</option>
        <option value="1.0">100%</option>
        <option value="1.5">150%</option>
        <option value="2.0">200%</option>
      </select>
      <button onclick="adjustIframeZoom(0.1)">Zoom +</button>
      <button onclick="adjustIframeZoom(-0.1)">Zoom -</button>
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

  // Securely lock the modal body to pass scroll control entirely to pdfViewportArea
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
      
      // Allow browser 150ms to finish rendering internal heights before calculating scale
      setTimeout(fitIframeToWidth, 150); 
    }
  }, 100);
}

// =========================================================
// Advanced Scale Integration: Absolute Wrapper Projection
// =========================================================
function applyIframeScale(scale) {
  const iframe = document.getElementById('pdfPreviewerIframe');
  const wrapper = document.getElementById('pdfScaleWrapper');
  const select = document.getElementById('pdfZoomSelect');
  
  if (iframe && wrapper) {
    iframe.currentZoom = scale;
    
    // 1. Detect natural document height organically
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    let contentHeight = 1123; // Minimum 1 A4 physical height
    if (doc && doc.body) {
        contentHeight = Math.max(1123, doc.body.scrollHeight);
    }
    
    // 2. Set dimensions & absolute scale transforming
    iframe.style.height = contentHeight + 'px';
    iframe.style.transform = `scale(${scale})`;
    
    // 3. Project the scaled dimensions onto the invisible wrapper
    // This allows the outer gray tray to display precise, single scrollbars!
    wrapper.style.width = (794 * scale) + 'px';
    wrapper.style.height = (contentHeight * scale) + 'px';
    
    // Sync dropdown UI
    if (select) {
        Array.from(select.options).forEach(opt => {
            if (parseFloat(opt.value) === scale) opt.selected = true;
        });
    }
  }
}

function onZoomMenuChange(val) {
  if (val === 'fit_page') fitIframeToContainer();
  else if (val === 'fit_width') fitIframeToWidth();
  else if (val === 'actual') applyIframeScale(1.0);
  else {
    const scale = parseFloat(val);
    if (!isNaN(scale)) applyIframeScale(scale);
  }
}

function fitIframeToContainer() {
  const viewport = document.getElementById('pdfViewportArea');
  const iframe = document.getElementById('pdfPreviewerIframe');
  if (viewport && iframe) {
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    const contentHeight = (doc && doc.body) ? Math.max(1123, doc.body.scrollHeight) : 1123;
      
    const paddingBuffer = 80; // Safe clearance for gray tray boundaries
    const scaleWidth = (viewport.clientWidth - paddingBuffer) / 794;
    const scaleHeight = (viewport.clientHeight - paddingBuffer) / contentHeight;
    applyIframeScale(Math.min(1.0, scaleWidth, scaleHeight));
    
    const select = document.getElementById('pdfZoomSelect');
    if (select) select.value = 'fit_page';
  }
}

function fitIframeToWidth() {
  const viewport = document.getElementById('pdfViewportArea');
  if (viewport) {
    const paddingBuffer = 80;
    const scaleWidth = (viewport.clientWidth - paddingBuffer) / 794;
    
    // Defaulting to max scale of 1.5 to prevent extreme massive zooms on wide screens
    applyIframeScale(Math.min(1.5, scaleWidth));
    
    const select = document.getElementById('pdfZoomSelect');
    if (select) select.value = 'fit_width';
  }
}

function adjustIframeZoom(amount) {
  const iframe = document.getElementById('pdfPreviewerIframe');
  if (iframe) {
    let newZoom = (iframe.currentZoom || 1.0) + amount;
    newZoom = Math.max(0.25, Math.min(3.0, newZoom)); 
    applyIframeScale(newZoom);
  }
}

function triggerEmbeddedPrint() {
  const iframe = document.getElementById('pdfPreviewerIframe');
  if (iframe) {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }
}