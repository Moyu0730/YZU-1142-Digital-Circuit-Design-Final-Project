'use strict';

function openSettings() { 
  console.log('[UI] Settings button clicked.');
  alert('Settings configuration panel will be available in future updates.'); 
}

function openAbout() {
  console.log('[UI] About button clicked.');
  alert('Sequential Circuit Design Automation System\n\nVersion 4.1 (Manual Generation Flow)\nFinal Project – Digital Circuit Design');
}

function initSplittersAndDrag() {
  const container = document.getElementById('appLayout');
  const gutters = Array.from(document.querySelectorAll('.gutter'));
  const cards = Array.from(document.querySelectorAll('.card'));

  console.log('[INIT] Layout Container:', container.id);
  console.log('[INIT] Total Panels:', cards.length, '| Total Gutters:', gutters.length);

  // 1. Panel Resizing Engine
  let currentGutter, prevPanel, nextPanel, startX, prevWidth, nextWidth;

  gutters.forEach((gutter) => {
    gutter.addEventListener('mousedown', (e) => {
      currentGutter = e.target;
      currentGutter.classList.add('active');
      prevPanel = currentGutter.previousElementSibling;
      nextPanel = currentGutter.nextElementSibling;
      startX = e.clientX;
      prevWidth = prevPanel.getBoundingClientRect().width;
      nextWidth = nextPanel.getBoundingClientRect().width;

      document.addEventListener('mousemove', onResizeDrag);
      document.addEventListener('mouseup', endResizeDrag);
      document.body.style.cursor = 'col-resize';
      prevPanel.style.pointerEvents = 'none';
      nextPanel.style.pointerEvents = 'none';
    });
  });

  function onResizeDrag(e) {
    if (!currentGutter) return;
    const dx = e.clientX - startX;
    const newPrevWidth = prevWidth + dx;
    const newNextWidth = nextWidth - dx;

    if (newPrevWidth > 280 && newNextWidth > 280) {
      prevPanel.style.flex = `0 0 ${newPrevWidth}px`;
      nextPanel.style.flex = `0 0 ${newNextWidth}px`;
    }
  }

  function endResizeDrag() {
    document.removeEventListener('mousemove', onResizeDrag);
    document.removeEventListener('mouseup', endResizeDrag);
    document.body.style.cursor = 'default';
    if (prevPanel) prevPanel.style.pointerEvents = 'auto';
    if (nextPanel) nextPanel.style.pointerEvents = 'auto';
    if (currentGutter) currentGutter.classList.remove('active');
    currentGutter = null;
    if (window.svgFit) window.svgFit();
  }

  // 2. High-Contrast Progress Glow & Drag Engine
  let draggedCard = null;

  cards.forEach(card => {
    const glowEl = document.createElement('div');
    glowEl.className = 'card-glow';
    glowEl.innerHTML = `
      <svg width="100%" height="100%" style="overflow:visible;">
        <rect class="glow-rect" x="6" y="6" width="calc(100% - 12px)" height="calc(100% - 12px)" rx="8" pathLength="100"></rect>
      </svg>
    `;
    card.appendChild(glowEl);

    card.setAttribute('draggable', 'true');
    const header = card.querySelector('.card-header');
    let pressTimer = null;
    let dragUnlocked = false;

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('button') || e.target.closest('.toolbar')) return;
      
      dragUnlocked = false;
      card.classList.add('long-pressing-loading');

      pressTimer = setTimeout(() => {
        dragUnlocked = true;
        card.classList.remove('long-pressing-loading');
        card.classList.add('drag-ready');
      }, 300); 
    });

    const cancelPress = () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      if (!card.classList.contains('dragging')) {
        dragUnlocked = false;
        card.classList.remove('long-pressing-loading', 'drag-ready');
      }
    };

    header.addEventListener('mouseup', cancelPress);
    header.addEventListener('mouseleave', () => {
      if (!card.classList.contains('dragging')) cancelPress();
    });

    card.addEventListener('dragstart', (e) => {
      if (!dragUnlocked) {
        e.preventDefault();
        return;
      }
      draggedCard = card;
      card.classList.add('dragging');
      card.classList.remove('drag-ready', 'long-pressing-loading');
      e.dataTransfer.effectAllowed = 'move';
      
      const dragIcon = document.createElement('div');
      dragIcon.style.opacity = '0';
      document.body.appendChild(dragIcon);
      e.dataTransfer.setDragImage(dragIcon, 0, 0);
      setTimeout(() => document.body.removeChild(dragIcon), 0);
    });

    card.addEventListener('dragend', () => {
      cards.forEach(c => {
        c.classList.remove('dragging', 'drag-over', 'drag-ready', 'long-pressing-loading');
      });
      draggedCard = null;
      dragUnlocked = false;
      if (window.svgFit) window.svgFit();
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault(); 
      if (!draggedCard || draggedCard === card) return;
      card.classList.add('drag-over');
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      
      if (draggedCard && draggedCard !== card) {
        reorderPanels(draggedCard, card);
      }
    });
  });

  function reorderPanels(sourceCard, targetCard) {
    const currentCards = Array.from(container.querySelectorAll('.card'));
    const sourceIdx = currentCards.indexOf(sourceCard);
    const targetIdx = currentCards.indexOf(targetCard);
    
    currentCards.splice(sourceIdx, 1);
    currentCards.splice(targetIdx, 0, sourceCard);
    
    currentCards.forEach((c, idx) => {
      container.appendChild(c);
      if (idx < currentCards.length - 1) {
        container.appendChild(gutters[idx]);
      }
    });
  }
}

function initEvents() {
  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };

  if (typeof generate === 'function') {
    bind('btnGenerate', generate);
  } else {
    console.error("[CRITICAL] logicEngine.js is not loaded.");
  }

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

  // Live Binding strictly for table headers X/Z text synchronization, 
  // without triggering backend equation recalculation until Generate is clicked.
  const inpVarEl = document.getElementById('inputVars');
  const outVarEl = document.getElementById('outputVars');
  const thInp = document.getElementById('thInput');
  const thOut = document.getElementById('thOutput');

  if (inpVarEl && thInp) {
    inpVarEl.addEventListener('input', (e) => {
      thInp.textContent = e.target.value.trim() || 'X';
    });
  }
  if (outVarEl && thOut) {
    outVarEl.addEventListener('input', (e) => {
      thOut.textContent = e.target.value.trim() || 'Z';
    });
  }

  window.addEventListener('resize', () => {
    if (document.getElementById('circuit-svg')) {
      svgFit();
    }
  });

  initSplittersAndDrag();
}

initEvents();
loadExample();