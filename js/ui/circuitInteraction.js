'use strict';

console.log("[EDA DEBUG] circuitInteraction.js interaction engine loaded.");

document.addEventListener('DOMContentLoaded', () => {
  console.log("[EDA DEBUG] DOMContentLoaded triggered, initializing canvas engine...");
  
  // =========================================================
  // 1. Precise Vector Canvas Zoom Engine 
  // =========================================================
  let currentSvgZoom = 1.0;

  function applyCanvasZoom(newZoom) {
    console.log(`[EDA DEBUG] Applying zoom: Current scale ${currentSvgZoom} -> Target scale ${newZoom}`);
    const svg = document.getElementById('circuit-svg');
    if (!svg) {
      console.warn("[EDA DEBUG] #circuit-svg canvas not found, aborting zoom.");
      return;
    }

    currentSvgZoom = Math.max(0.4, Math.min(4.0, newZoom));

    if (!svg.getAttribute('viewBox')) {
        console.log("[EDA DEBUG] Canvas missing viewBox, injecting fallback...");
        const w = parseFloat(svg.getAttribute('width')) || 800;
        const h = parseFloat(svg.getAttribute('height')) || 600;
        svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    }

    let baseW = svg.getAttribute('data-base-width');
    let baseH = svg.getAttribute('data-base-height');
    
    if (!baseW || !baseH) {
        baseW = svg.viewBox.baseVal.width || parseFloat(svg.getAttribute('width')) || 800;
        baseH = svg.viewBox.baseVal.height || parseFloat(svg.getAttribute('height')) || 600;
        svg.setAttribute('data-base-width', baseW);
        svg.setAttribute('data-base-height', baseH);
    }

    svg.style.setProperty('width', (parseFloat(baseW) * currentSvgZoom) + 'px', 'important');
    svg.style.setProperty('height', (parseFloat(baseH) * currentSvgZoom) + 'px', 'important');
    svg.style.setProperty('max-width', 'none', 'important');
    svg.style.setProperty('max-height', 'none', 'important');
    svg.style.transform = 'none';
    
    console.log(`[EDA DEBUG] Zoom complete. Canvas physical dimensions updated.`);
  }

  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const btnZoomReset = document.getElementById('btnZoomReset');
  const btnFit = document.getElementById('btnFit');

  if(btnZoomIn) { btnZoomIn.addEventListener('click', () => applyCanvasZoom(currentSvgZoom + 0.2)); console.log("[EDA DEBUG] Bound Zoom In button"); }
  if(btnZoomOut) { btnZoomOut.addEventListener('click', () => applyCanvasZoom(currentSvgZoom - 0.2)); console.log("[EDA DEBUG] Bound Zoom Out button"); }
  if(btnZoomReset) { btnZoomReset.addEventListener('click', () => applyCanvasZoom(1.0)); console.log("[EDA DEBUG] Bound Zoom Reset button"); }
  
  if(btnFit) {
    btnFit.addEventListener('click', () => {
      console.log("[EDA DEBUG] Executing Fit to Screen calculation...");
      const svg = document.getElementById('circuit-svg');
      const container = document.getElementById('svg-container');
      if (!svg || !container) return;

      let baseW = parseFloat(svg.getAttribute('data-base-width') || svg.getAttribute('width') || 800);
      let baseH = parseFloat(svg.getAttribute('data-base-height') || svg.getAttribute('height') || 600);

      const padding = 80; 
      const scaleW = (container.clientWidth - padding) / baseW;
      const scaleH = (container.clientHeight - padding) / baseH;
      
      applyCanvasZoom(Math.min(scaleW, scaleH, 1.5));
    });
    console.log("[EDA DEBUG] Bound Fit to Screen button");
  }

  // =========================================================
  // 2. Text Bounding-Box Mask Engine
  // =========================================================
  function applyTextBackgroundMasks() {
    const svg = document.getElementById('circuit-svg');
    if (!svg) return;

    const texts = svg.querySelectorAll('text:not([data-masked="true"])');
    if(texts.length > 0) console.log(`[EDA DEBUG] Found ${texts.length} text nodes, initiating DOM mask reordering...`);
    
    texts.forEach(txt => {
        txt.setAttribute('data-masked', 'true'); 
        try {
            const bbox = txt.getBBox();
            if (bbox.width === 0 && bbox.height === 0) return;

            const padX = 4;
            const padY = 2;
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', bbox.x - padX);
            rect.setAttribute('y', bbox.y - padY);
            rect.setAttribute('width', bbox.width + padX * 2);
            rect.setAttribute('height', bbox.height + padY * 2);
            rect.setAttribute('rx', '3'); 
            rect.setAttribute('class', 'text-bg-mask');
            rect.style.fill = '#ffffff';
            
            txt.style.stroke = 'none'; 
            
            const parent = txt.parentNode;
            parent.insertBefore(rect, txt);
            parent.appendChild(rect);
            parent.appendChild(txt);

            if (parent.tagName.toLowerCase() === 'g' && parent.parentNode) {
                parent.parentNode.appendChild(parent);
            }
        } catch(e) {}
    });
  }

  const svgContainer = document.getElementById('svg-container');
  if (svgContainer) {
      const observer = new MutationObserver((mutations) => {
          const hasAddedNodes = mutations.some(m => m.addedNodes.length > 0);
          if (hasAddedNodes) {
              setTimeout(applyTextBackgroundMasks, 50);
          }
      });
      observer.observe(svgContainer, { childList: true, subtree: true });
  }

  // =========================================================
  // 3. Intelligent Geometry Radar & Tooltip Engine
  // =========================================================
  const tooltip = document.getElementById('circuitTooltip');
  if (!tooltip) {
      console.error("[EDA DEBUG] .circuit-tooltip node not found, tooltip engine disabled!");
      return;
  }

  let mouseX = 0;
  let mouseY = 0;

  svgContainer.addEventListener('mousemove', (e) => {
    mouseX = e.pageX;
    mouseY = e.pageY;
  });

  svgContainer.addEventListener('click', (e) => {
    const target = e.target;
    
    if (!['rect', 'path', 'polygon', 'circle', 'text', 'tspan'].includes(target.tagName) || target.classList.contains('text-bg-mask')) {
      tooltip.classList.remove('visible');
      return;
    }

    console.log(`[EDA DEBUG] Clicked SVG node: <${target.tagName}>`);
    const comp = identifyComponentByGeometry(target);
    
    if (comp.type === 'UNKNOWN') {
      console.log("[EDA DEBUG] Unknown node, bypassing tooltip.");
      tooltip.classList.remove('visible');
      return;
    }

    console.log(`[EDA DEBUG] Component successfully identified: ${comp.type}`);

    const eqMap = parseEquationsFromUI();
    let qLabel = null;
    if (comp.type === 'FF') {
        qLabel = findNearestStateLabel(target);
    }

    const tooltipHTML = generateTooltipHTML(comp, eqMap, qLabel);

    if (tooltipHTML) {
      tooltip.innerHTML = tooltipHTML;
      tooltip.style.left = '0px'; 
      tooltip.style.top = '0px';
      tooltip.classList.add('visible');

      setTimeout(() => {
        const ttWidth = tooltip.offsetWidth || 260;
        const ttHeight = tooltip.offsetHeight || 180;
        let finalX = mouseX + 15;
        let finalY = mouseY + 15;

        if (finalX + ttWidth > window.innerWidth) finalX = mouseX - ttWidth - 15;
        if (finalY + ttHeight > window.innerHeight) finalY = mouseY - ttHeight - 15;
        
        tooltip.style.left = finalX + 'px';
        tooltip.style.top = finalY + 'px';
      }, 0);
    } else {
      tooltip.classList.remove('visible');
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#svg-container g, #svg-container text, #svg-container path, #svg-container rect, #svg-container polygon, #svg-container circle')) {
      tooltip.classList.remove('visible');
    }
  });
  
  console.log("[EDA DEBUG] Canvas engine bindings completely initialized.");
});

function identifyComponentByGeometry(target) {
    const targetRect = target.getBoundingClientRect();
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    const svg = document.getElementById('circuit-svg');
    const allTexts = Array.from(svg.querySelectorAll('text, tspan'));
    
    const nearbyTexts = allTexts.filter(t => {
        const tRect = t.getBoundingClientRect();
        const isIntersecting = !(targetRect.right < tRect.left || targetRect.left > tRect.right || targetRect.bottom < tRect.top || targetRect.top > tRect.bottom);
        const tCenterX = tRect.left + tRect.width / 2;
        const tCenterY = tRect.top + tRect.height / 2;
        const distance = Math.sqrt(Math.pow(tCenterX - targetCenterX, 2) + Math.pow(tCenterY - targetCenterY, 2));
        return isIntersecting || distance < 45; 
    });

    const nearbyStr = nearbyTexts.map(t => t.textContent.trim()).join(' ');

    if (target.tagName === 'text' || target.tagName === 'tspan') {
        const txt = target.textContent.trim();
        if (txt === '&') return { type: 'AND', element: target };
        if (txt === '≥1' || txt === '>=1') return { type: 'OR', element: target };
        if (txt.includes('JK') || txt.includes('D') || txt.includes('T') || txt.includes('FF')) return { type: 'FF', element: target };
        if (txt.length <= 2 && /^[A-Za-z0-9']+$/.test(txt)) return { type: 'LABEL', label: txt, element: target };
    }

    if (target.tagName === 'rect' && !target.classList.contains('text-bg-mask')) {
        if (nearbyStr.includes('JK') || nearbyStr.includes('D') || nearbyStr.includes('T') || nearbyStr.includes('FF') || nearbyStr.includes('Flip-Flop') || nearbyStr.includes('Q')) {
            return { type: 'FF', element: target };
        }
    }

    if (nearbyStr.includes('&')) return { type: 'AND', element: target };
    if (nearbyStr.includes('≥1') || nearbyStr.includes('>=1')) return { type: 'OR', element: target };

    if (target.tagName === 'polygon' || target.tagName === 'circle' || target.tagName === 'path') {
        const allCircles = Array.from(svg.querySelectorAll('circle'));
        const isNearCircle = allCircles.some(c => {
            if (c === target) return true; 
            const cRect = c.getBoundingClientRect();
            const dist = Math.sqrt(Math.pow(cRect.left - targetRect.left, 2) + Math.pow(cRect.top - targetRect.top, 2));
            return dist < 45;
        });
        
        if ((target.tagName === 'polygon' || target.tagName === 'path') && isNearCircle) return { type: 'NOT', element: target };
        if (target.tagName === 'circle') return { type: 'NOT', element: target };
    }

    if (target.tagName === 'line' || target.tagName === 'path') {
        const nearestLabel = nearbyTexts.find(t => t.textContent.trim().length <= 2);
        if (nearestLabel) {
            return { type: 'LABEL', label: nearestLabel.textContent.trim(), element: target };
        }
    }

    return { type: 'UNKNOWN' };
}

function findNearestPortLabel(target, validPorts) {
    const svg = document.getElementById('circuit-svg');
    if (!svg || !target) return null;

    const gRect = target.getBoundingClientRect();
    const gCenterX = gRect.left + gRect.width / 2;
    const gCenterY = gRect.top + gRect.height / 2;

    let minLabel = null;
    let minDist = Infinity;

    const allTexts = Array.from(svg.querySelectorAll('text, tspan'));
    allTexts.forEach(t => {
        const txt = t.textContent.trim().replace(/[^A-Za-z0-9]/g, '');
        if (validPorts.includes(txt)) {
            const tRect = t.getBoundingClientRect();
            const tCenterX = tRect.left + tRect.width / 2;
            const tCenterY = tRect.top + tRect.height / 2;
            
            let dist = Math.sqrt(Math.pow(tCenterX - gCenterX, 2) + Math.pow(tCenterY - gCenterY, 2));
            if (tCenterX < gCenterX) dist += 10000; 

            if (dist < minDist) {
                minDist = dist;
                minLabel = txt;
            }
        }
    });
    return minLabel;
}

function generateTooltipHTML(comp, eqMap, qLabel) {
    let title = ''; let icon = '⚡'; let inputsHTML = ''; let outputsHTML = '';

    if (comp.type === 'FF') {
        const numMatch = qLabel ? qLabel.match(/\d+/) : null;
        const num = numMatch ? numMatch[0] : '';
        title = qLabel ? `Flip-Flop Unit (${qLabel})` : `Flip-Flop Unit`;
        icon = '🔲';

        let eqRows = '';
        if (num !== '') {
            ['J', 'K', 'D', 'T'].forEach(prefix => {
                const port = prefix + num;
                if (eqMap[port]) {
                    const eqStr = eqMap[port].includes('=') ? eqMap[port].split('=')[1].trim() : eqMap[port];
                    eqRows += `<div class="tt-row"><span class="tt-port">${port}</span><span class="tt-eq">${highlight(eqStr)}</span></div>`;
                }
            });
        }
        inputsHTML = eqRows + `<div class="tt-row"><span class="tt-port">CLK</span><span class="tt-desc">Clock (Edge Triggered)</span></div>`;
        
        const ffType = document.querySelector('input[name=fftype]:checked')?.value || 'JK';
        let nextStateEq = '';
        
        if (ffType === 'JK') {
            nextStateEq = `(J${num} · Q${num}') + (K${num}' · Q${num})`;
        } else if (ffType === 'T') {
            nextStateEq = `(T${num} · Q${num}') + (T${num}' · Q${num})`;
        } else if (ffType === 'D') {
            nextStateEq = `D${num}`;
        }

        outputsHTML = `<div class="tt-row"><span class="tt-port">Q${num}(t+1)</span><span class="tt-eq">${highlight(nextStateEq)}</span></div>`;
    }
    else if (comp.type === 'LABEL') {
        const portName = comp.label.replace(/[^A-Za-z0-9]/g, '');
        title = `Signal Node: ${portName}`;
        icon = '🎯';

        if (eqMap[portName]) {
            const eqStr = eqMap[portName].includes('=') ? eqMap[portName].split('=')[1].trim() : eqMap[portName];
            inputsHTML = `<div class="tt-row"><span class="tt-port">Logic</span><span class="tt-eq">${highlight(eqStr)}</span></div>`;
            outputsHTML = `<div class="tt-row"><span class="tt-port">Out</span><span class="tt-desc">Output Signal (${portName})</span></div>`;
        } else {
            inputsHTML = `<div class="tt-row"><span class="tt-port">Ext</span><span class="tt-desc">Origin / System Input</span></div>`;
            outputsHTML = `<div class="tt-row"><span class="tt-port">Out</span><span class="tt-desc">Wire Routing</span></div>`;
        }
    }
    else if (comp.type === 'AND' || comp.type === 'OR') {
         let nearestPort = findNearestPortLabel(comp.element, Object.keys(eqMap));

         title = comp.type === 'AND' ? 'Logic Gate: AND' : 'Logic Gate: OR'; 
         icon = comp.type === 'AND' ? '⋀' : '⋁';

         if (nearestPort && eqMap[nearestPort]) {
             let rhs = eqMap[nearestPort].split('=')[1].trim() || eqMap[nearestPort];
             let sumTerms = rhs.split('+').map(t => t.trim());

             if (comp.type === 'AND') {
                 let prodTerms = sumTerms.filter(t => t.includes('·') || (t.length > 2 && !t.includes('+')));
                 let termToUse = null;

                 if (prodTerms.length === 1) {
                     termToUse = prodTerms[0];
                 } else if (prodTerms.length > 1) {
                     const svg = document.getElementById('circuit-svg');
                     const allGates = Array.from(svg.querySelectorAll('g, text'));
                     let andGatesForPort = [];
                     
                     allGates.forEach(g => {
                         const c = identifyComponentByGeometry(g);
                         if (c.type === 'AND' && findNearestPortLabel(g, Object.keys(eqMap)) === nearestPort) {
                             if(!andGatesForPort.includes(g)) andGatesForPort.push(g);
                         }
                     });
                     
                     andGatesForPort.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
                     const myIndex = andGatesForPort.findIndex(g => g === comp.element || g.contains(comp.element));
                     termToUse = myIndex >= 0 && myIndex < prodTerms.length ? prodTerms[myIndex] : prodTerms[0];
                 } else {
                     termToUse = sumTerms[0]; 
                 }

                 if (termToUse) {
                     let vars = termToUse.split('·').map(v => v.trim());
                     let inStr = vars.join(', ');
                     inputsHTML = `<div class="tt-row"><span class="tt-port">Inputs</span><span class="tt-eq">${highlight(inStr)}</span></div>`;
                     outputsHTML = `<div class="tt-row"><span class="tt-port">Output</span><span class="tt-eq">${highlight(termToUse)}</span></div>`;
                 } else {
                     inputsHTML = `<div class="tt-row"><span class="tt-port">Inputs</span><span class="tt-desc">Signals</span></div>`;
                     outputsHTML = `<div class="tt-row"><span class="tt-port">Output</span><span class="tt-desc">Conjunction</span></div>`;
                 }
             }
             else if (comp.type === 'OR') {
                 let validSumTerms = sumTerms.filter(t => t.length > 0);
                 let formattedTerms = validSumTerms.map(t => t.includes('·') ? `(${t})` : t);
                 let inStr = formattedTerms.join(', ');
                 let outEq = formattedTerms.join(' + '); 
                 
                 inputsHTML = `<div class="tt-row"><span class="tt-port">Inputs</span><span class="tt-eq" style="white-space:normal; text-align:right;">${highlight(inStr)}</span></div>`;
                 outputsHTML = `<div class="tt-row"><span class="tt-port">Output</span><span class="tt-eq">${highlight(outEq)}</span></div>`;
             }
         } else {
             inputsHTML = `<div class="tt-row"><span class="tt-port">Inputs</span><span class="tt-desc">Origin Signals</span></div>`;
             outputsHTML = `<div class="tt-row"><span class="tt-port">Output</span><span class="tt-desc">Logic Result</span></div>`;
         }
    }
    else if (comp.type === 'NOT') {
         const inputElement = document.getElementById('inputVars');
         let primaryInput = 'X';
         if (inputElement && inputElement.value.trim() !== '') {
             primaryInput = inputElement.value.trim().split(',')[0];
         }

         title = 'Logic Gate: NOT'; icon = '△';
         inputsHTML = `<div class="tt-row"><span class="tt-port">Input</span><span class="tt-eq">${highlight(primaryInput)}</span></div>`;
         outputsHTML = `<div class="tt-row"><span class="tt-port">Output</span><span class="tt-eq">${highlight(primaryInput + "'")}</span></div>`;
    }
    
    if(!title) return null;

    return `
        <div class="tt-header">
            <span class="tt-icon">${icon}</span>
            <h4 class="tt-title">${title}</h4>
        </div>
        <div class="tt-body">
            <div class="tt-section">
                <div class="tt-section-title">Inputs</div>
                ${inputsHTML}
            </div>
            <div class="tt-section">
                <div class="tt-section-title">Outputs</div>
                ${outputsHTML}
            </div>
        </div>
    `;
}

function findNearestStateLabel(target) {
  const svg = document.getElementById('circuit-svg');
  if (!svg) return null;

  const qTexts = Array.from(svg.querySelectorAll('text, tspan')).filter(t => {
      const txt = t.textContent.trim();
      return txt.startsWith('Q') && /\d/.test(txt);
  });

  if (qTexts.length === 0) return null;

  const gRect = target.getBoundingClientRect();
  const gCenterX = gRect.left + gRect.width / 2;
  const gCenterY = gRect.top + gRect.height / 2;

  let minLabel = null;
  let minDist = Infinity;

  qTexts.forEach(t => {
    const tRect = t.getBoundingClientRect();
    const tCenterX = tRect.left + tRect.width / 2;
    const tCenterY = tRect.top + tRect.height / 2;
    const dist = Math.pow(tCenterX - gCenterX, 2) + Math.pow(tCenterY - gCenterY, 2);
    
    if (dist < minDist) {
      minDist = dist;
      const match = t.textContent.trim().match(/Q\d+/);
      if (match) minLabel = match[0];
    }
  });

  return minLabel;
}

function parseEquationsFromUI() {
  const equationMap = {};
  const cells = document.querySelectorAll('#output1 table tbody td');
  cells.forEach(td => {
    const txt = td.textContent.trim();
    if (txt.includes('=')) {
      const parts = txt.split('=');
      const port = parts[0].trim();
      equationMap[port] = txt;
    }
  });
  return equationMap;
}

function highlight(eq) {
  let res = eq.replace(/([+·])/g, '<span style="color:#f87171; margin:0 3px;">$1</span>'); 
  res = res.replace(/(['])/g, '<span style="color:#f87171;">$1</span>'); 
  res = res.replace(/([()])/g, '<span style="color:#fbbf24; font-weight:bold;">$1</span>'); 
  return res;
}