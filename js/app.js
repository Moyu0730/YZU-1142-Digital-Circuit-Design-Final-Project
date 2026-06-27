'use strict';

// =============================================================================
// app.js — Application Entry Point
// Bootstraps the two UI engines (splitter resize + panel drag-reorder) and
// wires every toolbar button to its handler via bindSafe().
// Script load order dependency: all other JS modules must load before app.js.
// =============================================================================

// =========================================================
// Panel Resize & Drag-to-Reorder Engine
// =========================================================

// Attaches mouse-based column resize to each .gutter divider and implements a
// long-press (300 ms) drag-to-reorder gesture on .card-header elements.
// After any resize or reorder, programmatically fires btnFit so the SVG canvas
// rescales to the new panel dimensions.
function initSplittersAndDrag() {
  const container = document.getElementById('appLayout');
  const gutters = Array.from(document.querySelectorAll('.gutter'));
  const cards = Array.from(document.querySelectorAll('.card'));

  let currentGutter, prevPanel, nextPanel, startX, prevWidth, nextWidth;

  // Attach mousedown to each gutter to begin a resize drag
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
      // Disable pointer events on panels during drag to prevent iframe bleed
      prevPanel.style.pointerEvents = 'none';
      nextPanel.style.pointerEvents = 'none';
    });
  });

  function onResizeDrag(e) {
    if (!currentGutter) return;
    const dx = e.clientX - startX;
    const newPrevWidth = prevWidth + dx;
    const newNextWidth = nextWidth - dx;
    // Enforce a 280px minimum per panel to keep the UI usable
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
    // Re-fit the SVG after panels resize so the diagram fills the new canvas area
    const fitBtn = document.getElementById('btnFit');
    if (fitBtn) fitBtn.click();
  }

  // -------------------------------------------------------------------------
  // Long-press drag-to-reorder: holding a card header for 300 ms unlocks drag.
  // The native HTML5 drag-and-drop API is used for the actual reorder.
  // -------------------------------------------------------------------------
  let draggedCard = null;

  cards.forEach(card => {
    // Inject a CSS glow SVG overlay used during the drag-lock animation
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
      // Ignore clicks on interactive controls inside the header
      if (e.target.closest('button') || e.target.closest('.toolbar') || e.target.closest('.panel-actions')) return;

      dragUnlocked = false;
      card.classList.add('long-pressing-loading');
      // 300 ms hold to confirm intentional drag; shorter presses are treated as clicks
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
      if (!dragUnlocked) { e.preventDefault(); return; }
      draggedCard = card;
      card.classList.add('dragging');
      card.classList.remove('drag-ready', 'long-pressing-loading');
      e.dataTransfer.effectAllowed = 'move';
      // Use a transparent 1px image as the drag ghost so the real card stays visible
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
      const fitBtn = document.getElementById('btnFit');
      if (fitBtn) fitBtn.click();
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!draggedCard || draggedCard === card) return;
      card.classList.add('drag-over');
    });

    card.addEventListener('dragleave', () => { card.classList.remove('drag-over'); });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      if (draggedCard && draggedCard !== card) {
        reorderPanels(draggedCard, card);
      }
    });
  });

  // Reinserts DOM nodes so sourceCard occupies targetCard's original position.
  // Gutters are re-threaded between cards after every reorder.
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

// =========================================================
// Global Event Binding
// =========================================================

// Binds all toolbar buttons to their handler functions.
// bindSafe() checks for element existence and function availability before
// attaching to avoid silent failures when scripts load out of order.
function initEvents() {
  const bindSafe = (id, fn) => {
    if (typeof fn !== 'function') {
      console.warn(`[EDA DEBUG] Binding failed: Target function for button ${id} does not exist.`);
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        console.log(`[EDA DEBUG] Intercepted click event: Button [${id}]`);
        fn(e);
      });
      console.log(`[EDA DEBUG] Button [${id}] successfully bound.`);
    } else {
      console.error(`[EDA DEBUG] HTML element not found: ID [${id}]`);
    }
  };

  if (typeof generate === 'function') {
    bindSafe('btnGenerate', generate);
  } else {
    console.error("[EDA DEBUG] CRITICAL: 'generate' function not found! Please check logicEngine.js.");
  }

  if (typeof clearTable !== 'undefined') bindSafe('btnClear', clearTable);
  if (typeof loadExample !== 'undefined') bindSafe('btnLoad', loadExample);
  if (typeof addRow !== 'undefined') bindSafe('btnAddRow', () => addRow());

  if (typeof downloadSVG !== 'undefined') bindSafe('btnDlSVG', downloadSVG);
  if (typeof downloadPNG !== 'undefined') bindSafe('btnDlPNG', downloadPNG);
  if (typeof exportReport !== 'undefined') bindSafe('btnExport', exportReport);

  if (typeof openSettingsModal !== 'undefined') {
    bindSafe('btnSettings', openSettingsModal);
  } else {
    console.error("[EDA DEBUG] 'openSettingsModal' function not found! Please check modalManager.js.");
  }

  if (typeof openAboutModal !== 'undefined') bindSafe('btnAbout', openAboutModal);

  // Live header sync: update the state table column headers as the user types
  // variable names without triggering a full re-generation.
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
      const fitBtn = document.getElementById('btnFit');
      if (fitBtn) fitBtn.click();
    }
  });

  initSplittersAndDrag();
  console.log("[EDA DEBUG] System event bindings completely initialized.");
}

// Bootstrap
initEvents();

if (typeof loadExample === 'function') {
  loadExample();
}
