'use strict';

function createModalSystem() {
  if (document.getElementById('globalModalBackdrop')) return;

  const backdrop = document.createElement('div');
  backdrop.id = 'globalModalBackdrop';
  backdrop.className = 'modal-backdrop';
  
  backdrop.innerHTML = `
    <div class="modal-content" id="modalContentWrapper" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h3 id="modalTitle">Modal Title</h3>
        <button class="modal-close" id="modalCloseBtn" title="Close Window">×</button>
      </div>
      <div class="modal-body" id="modalBodyContent"></div>
      <div class="modal-footer" id="modalFooterArea"></div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const closeBtn = document.getElementById('modalCloseBtn');
  const closeEvents = () => closeSystemModal();
  
  closeBtn.addEventListener('click', closeEvents);
  backdrop.addEventListener('click', closeEvents);
}

function openSystemModal(title, bodyHtml, footerButtonsHtml) {
  createModalSystem();

  const backdrop = document.getElementById('globalModalBackdrop');
  const contentEl = document.getElementById('modalContentWrapper');
  
  // Reset width modifiers
  if (contentEl) contentEl.classList.remove('modal-wide');
  
  document.body.classList.add('modal-open');

  const modalHeaderEl = document.querySelector('.modal-header');
  if (modalHeaderEl) {
    modalHeaderEl.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--nav-bg') || '#0f172a';
  }

  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBodyContent').innerHTML = bodyHtml;
  
  const footerArea = document.getElementById('modalFooterArea');
  footerArea.innerHTML = footerButtonsHtml;

  setTimeout(() => {
    backdrop.classList.add('active');
  }, 10);
}

// Extended viewport modal for reports/iframes visualization
function openSystemModalWidened(title, bodyHtml, footerButtonsHtml) {
  createModalSystem();

  const backdrop = document.getElementById('globalModalBackdrop');
  const contentEl = document.getElementById('modalContentWrapper');
  if (contentEl) contentEl.classList.add('modal-wide');
  
  document.body.classList.add('modal-open');

  const modalHeaderEl = document.querySelector('.modal-header');
  if (modalHeaderEl) {
    modalHeaderEl.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--nav-bg') || '#0f172a';
  }

  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBodyContent').innerHTML = bodyHtml;
  
  const footerArea = document.getElementById('modalFooterArea');
  footerArea.innerHTML = footerButtonsHtml;

  setTimeout(() => {
    backdrop.classList.add('active');
  }, 10);
}

function closeSystemModal() {
  const backdrop = document.getElementById('globalModalBackdrop');
  if (backdrop) {
    backdrop.classList.remove('active');
    document.body.classList.remove('modal-open');
    
    setTimeout(() => {
      if (backdrop.parentNode) {
        backdrop.parentNode.removeChild(backdrop);
      }
    }, 250);
  }
}

// =========================================================
// Modal Configuration Templates (10 Swatch Options)
// =========================================================
function openSettings() { 
  console.log('[UI] Settings modal opening.');
  
  const formHtml = `
    <div class="settings-form">
      <div class="settings-group">
        <label style="font-size:11px; letter-spacing:0.5px; font-weight:700; text-transform:uppercase;">System Workspace Palette</label>
        <span class="setting-desc-text" style="color:var(--text-main); font-weight: 500;">Select an enterprise-grade color profile that perfectly matches your laboratory environment.</span>
        
        <div class="swatch-grid">
          
          <div class="theme-swatch-card" onclick="selectPaletteOption(this, 'navy')" data-theme="navy">
            <div class="swatch-visual">
              <div class="swatch-chunk swatch-navy-nav"></div>
              <div class="swatch-chunk swatch-navy-card"></div>
              <div class="swatch-chunk swatch-navy-accent"></div>
            </div>
            <div class="swatch-details">
              <span class="swatch-title">Deep Industrial Navy</span>
              <span class="swatch-desc">Default engineering theme</span>
            </div>
          </div>

          <div class="theme-swatch-card" onclick="selectPaletteOption(this, 'graphite')" data-theme="graphite">
            <div class="swatch-visual">
              <div class="swatch-chunk swatch-graphite-nav"></div>
              <div class="swatch-chunk swatch-graphite-card"></div>
              <div class="swatch-chunk swatch-graphite-accent"></div>
            </div>
            <div class="swatch-details">
              <span class="swatch-title">Carbon Graphite Grey</span>
              <span class="swatch-desc">Neutral low-glare profile</span>
            </div>
          </div>

          <div class="theme-swatch-card" onclick="selectPaletteOption(this, 'engineer')" data-theme="engineer">
            <div class="swatch-visual">
              <div class="swatch-chunk swatch-eng-nav"></div>
              <div class="swatch-chunk swatch-eng-card"></div>
              <div class="swatch-chunk swatch-eng-accent"></div>
            </div>
            <div class="swatch-details">
              <span class="swatch-title">High-Contrast White</span>
              <span class="swatch-desc">Optimized for reports</span>
            </div>
          </div>

          <div class="theme-swatch-card" onclick="selectPaletteOption(this, 'science')" data-theme="science">
            <div class="swatch-visual">
              <div class="swatch-chunk swatch-sci-nav"></div>
              <div class="swatch-chunk swatch-sci-card"></div>
              <div class="swatch-chunk swatch-sci-accent"></div>
            </div>
            <div class="swatch-details">
              <span class="swatch-title">Laboratory Green</span>
              <span class="swatch-desc">Medical visualization mode</span>
            </div>
          </div>

          <div class="theme-swatch-card" onclick="selectPaletteOption(this, 'sunset')" data-theme="sunset">
            <div class="swatch-visual">
              <div class="swatch-chunk swatch-sunset-nav"></div>
              <div class="swatch-chunk swatch-sunset-card"></div>
              <div class="swatch-chunk swatch-sunset-accent"></div>
            </div>
            <div class="swatch-details">
              <span class="swatch-title">Amber Sunset Glow</span>
              <span class="swatch-desc">Warm amber alert theme</span>
            </div>
          </div>

          <div class="theme-swatch-card" onclick="selectPaletteOption(this, 'purple')" data-theme="purple">
            <div class="swatch-visual">
              <div class="swatch-chunk swatch-purple-nav"></div>
              <div class="swatch-chunk swatch-purple-card"></div>
              <div class="swatch-chunk swatch-purple-accent"></div>
            </div>
            <div class="swatch-details">
              <span class="swatch-title">Violet Nightshade</span>
              <span class="swatch-desc">Deep purple dark theme</span>
            </div>
          </div>

          <div class="theme-swatch-card" onclick="selectPaletteOption(this, 'quantum')" data-theme="quantum">
            <div class="swatch-visual">
              <div class="swatch-chunk swatch-quantum-nav"></div>
              <div class="swatch-chunk swatch-quantum-card"></div>
              <div class="swatch-chunk swatch-quantum-accent"></div>
            </div>
            <div class="swatch-details">
              <span class="swatch-title">Quantum Blackhole</span>
              <span class="swatch-desc">Absolute pitch-black theme</span>
            </div>
          </div>

          <div class="theme-swatch-card" onclick="selectPaletteOption(this, 'ocean')" data-theme="ocean">
            <div class="swatch-visual">
              <div class="swatch-chunk swatch-ocean-nav"></div>
              <div class="swatch-chunk swatch-ocean-card"></div>
              <div class="swatch-chunk swatch-ocean-accent"></div>
            </div>
            <div class="swatch-details">
              <span class="swatch-title">Ocean Breeze Blue</span>
              <span class="swatch-desc">Vibrant clear sky palette</span>
            </div>
          </div>

          <div class="theme-swatch-card" onclick="selectPaletteOption(this, 'rose')" data-theme="rose">
            <div class="swatch-visual">
              <div class="swatch-chunk swatch-rose-nav"></div>
              <div class="swatch-chunk swatch-rose-card"></div>
              <div class="swatch-chunk swatch-rose-accent"></div>
            </div>
            <div class="swatch-details">
              <span class="swatch-title">Blossoming Rose</span>
              <span class="swatch-desc">Soft rose high-contrast theme</span>
            </div>
          </div>

          <div class="theme-swatch-card" onclick="selectPaletteOption(this, 'amber')" data-theme="amber">
            <div class="swatch-visual">
              <div class="swatch-chunk swatch-amber-nav"></div>
              <div class="swatch-chunk swatch-amber-card"></div>
              <div class="swatch-chunk swatch-amber-accent"></div>
            </div>
            <div class="swatch-details">
              <span class="swatch-title">Amber Gold</span>
              <span class="swatch-desc">Warm golden scholar palette</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;
  
  const footerHtml = `
    <button class="btn btn-bordered" onclick="closeSystemModal()">Cancel</button>
    <button class="btn btn-primary" onclick="applyThemeImmediate()">Apply System Theme</button>
  `;

  openSystemModal('EDA System Preferences', formHtml, footerHtml);
}

function selectPaletteOption(cardElement, themeName) {
  const cards = document.querySelectorAll('.theme-swatch-card');
  cards.forEach(c => c.classList.remove('selected'));
  cardElement.classList.add('selected');
  console.log('[THEME] Selected Palette Preset:', themeName);
}

function applyThemeImmediate() {
  const selectedCard = document.querySelector('.theme-swatch-card.selected');
  const theme = selectedCard ? selectedCard.getAttribute('data-theme') : 'navy';
  
  const root = document.documentElement;
  
  console.log('[THEME] Applying color scheme immediately:', theme);
  
  if (theme === 'graphite') {
    root.style.setProperty('--nav-bg', '#334155');
    root.style.setProperty('--card-bg', '#ffffff');
    root.style.setProperty('--text-main', '#334155');
    root.style.setProperty('--text-muted', '#64748b');
    root.style.setProperty('--text-inverse', '#ffffff');
    root.style.setProperty('--border-color', '#cbd5e1');
    root.style.setProperty('--border-dark', '#94a3b8');
    root.style.setProperty('--primary', '#475569');
    root.style.setProperty('--primary-hover', '#334155');
    root.style.setProperty('--bg-color', '#e2e8f0');
  } else if (theme === 'engineer') {
    root.style.setProperty('--nav-bg', '#e2e8f0');
    root.style.setProperty('--card-bg', '#ffffff');
    root.style.setProperty('--text-main', '#0f172a');
    root.style.setProperty('--text-muted', '#64748b');
    root.style.setProperty('--text-inverse', '#1e293b');
    root.style.setProperty('--border-color', '#cbd5e1');
    root.style.setProperty('--border-dark', '#94a3b8');
    root.style.setProperty('--primary', '#475569');
    root.style.setProperty('--primary-hover', '#334155');
    root.style.setProperty('--bg-color', '#f8fafc');
  } else if (theme === 'science') {
    root.style.setProperty('--nav-bg', '#065f46');
    root.style.setProperty('--card-bg', '#f0fdf4');
    root.style.setProperty('--text-main', '#064e3b');
    root.style.setProperty('--text-muted', '#047857');
    root.style.setProperty('--text-inverse', '#ffffff');
    root.style.setProperty('--border-color', '#bbf7d0');
    root.style.setProperty('--border-dark', '#10b981');
    root.style.setProperty('--primary', '#059669');
    root.style.setProperty('--primary-hover', '#047857');
    root.style.setProperty('--bg-color', '#dcfce7');
  } else if (theme === 'sunset') {
    root.style.setProperty('--nav-bg', '#9a3412');
    root.style.setProperty('--card-bg', '#fffbeb');
    root.style.setProperty('--text-main', '#7c2d12');
    root.style.setProperty('--text-muted', '#b45309');
    root.style.setProperty('--text-inverse', '#ffffff');
    root.style.setProperty('--border-color', '#fde68a');
    root.style.setProperty('--border-dark', '#d97706');
    root.style.setProperty('--primary', '#ea580c');
    root.style.setProperty('--primary-hover', '#c2410c');
    root.style.setProperty('--bg-color', '#fef3c7');
  } else if (theme === 'purple') {
    root.style.setProperty('--nav-bg', '#581c87');
    root.style.setProperty('--card-bg', '#f5f3ff');
    root.style.setProperty('--text-main', '#4c1d95');
    root.style.setProperty('--text-muted', '#6d28d9');
    root.style.setProperty('--text-inverse', '#ffffff');
    root.style.setProperty('--border-color', '#ddd6fe');
    root.style.setProperty('--border-dark', '#8b5cf6');
    root.style.setProperty('--primary', '#7c3aed');
    root.style.setProperty('--primary-hover', '#6d28d9');
    root.style.setProperty('--bg-color', '#ede9fe');
  } else if (theme === 'quantum') {
    root.style.setProperty('--nav-bg', '#000000');
    root.style.setProperty('--card-bg', '#0f172a');
    root.style.setProperty('--text-main', '#f1f5f9');
    root.style.setProperty('--text-muted', '#94a3b8');
    root.style.setProperty('--text-inverse', '#ffffff');
    root.style.setProperty('--border-color', '#334155');
    root.style.setProperty('--border-dark', '#475569');
    root.style.setProperty('--primary', '#3b82f6');
    root.style.setProperty('--primary-hover', '#2563eb');
    root.style.setProperty('--bg-color', '#020617');
  } else if (theme === 'ocean') {
    root.style.setProperty('--nav-bg', '#0369a1');
    root.style.setProperty('--card-bg', '#f0f9ff');
    root.style.setProperty('--text-main', '#0c4a6e');
    root.style.setProperty('--text-muted', '#0284c7');
    root.style.setProperty('--text-inverse', '#ffffff');
    root.style.setProperty('--border-color', '#bae6fd');
    root.style.setProperty('--border-dark', '#38bdf8');
    root.style.setProperty('--primary', '#0284c7');
    root.style.setProperty('--primary-hover', '#0369a1');
    root.style.setProperty('--bg-color', '#e0f2fe');
  } else if (theme === 'rose') {
    root.style.setProperty('--nav-bg', '#9f1239');
    root.style.setProperty('--card-bg', '#fff1f2');
    root.style.setProperty('--text-main', '#4c0519');
    root.style.setProperty('--text-muted', '#be123c');
    root.style.setProperty('--text-inverse', '#ffffff');
    root.style.setProperty('--border-color', '#fecdd3');
    root.style.setProperty('--border-dark', '#fb7185');
    root.style.setProperty('--primary', '#f43f5e');
    root.style.setProperty('--primary-hover', '#e11d48');
    root.style.setProperty('--bg-color', '#ffe4e6');
  } else if (theme === 'amber') {
    root.style.setProperty('--nav-bg', '#713f12');
    root.style.setProperty('--card-bg', '#fef9c3');
    root.style.setProperty('--text-main', '#422006');
    root.style.setProperty('--text-muted', '#a16207');
    root.style.setProperty('--text-inverse', '#ffffff');
    root.style.setProperty('--border-color', '#fef08a');
    root.style.setProperty('--border-dark', '#eab308');
    root.style.setProperty('--primary', '#ca8a04');
    root.style.setProperty('--primary-hover', '#a16207');
    root.style.setProperty('--bg-color', '#fef08a');
  } else {
    // Default: Deep Industrial Navy
    root.style.setProperty('--nav-bg', '#0f172a');
    root.style.setProperty('--card-bg', '#ffffff');
    root.style.setProperty('--text-main', '#334155');
    root.style.setProperty('--text-muted', '#64748b');
    root.style.setProperty('--text-inverse', '#ffffff');
    root.style.setProperty('--border-color', '#e2e8f0');
    root.style.setProperty('--border-dark', '#94a3b8');
    root.style.setProperty('--primary', '#2563eb');
    root.style.setProperty('--primary-hover', '#1d4ed8');
    root.style.setProperty('--bg-color', '#f1f5f9');
  }
  
  closeSystemModal();
}

function openAbout() {
  console.log('[UI] About modal opening.');
  
  const aboutBody = `
    <div style="text-align:center; padding: 12px 0;">
      <div style="font-size: 48px; margin-bottom: 16px;">⚡</div>
      <h2 style="font-size:18px; font-weight:700; color: var(--text-main); margin-bottom: 8px;">Sequential Circuit EDA Automation</h2>
      <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 24px;">
        An enterprise-grade, browser-based synthesis and layout tool for digital system engineering students.
      </p>
      <div style="background: var(--bg-color); padding: 12px; border-radius: 6px; font-size:12px; font-family: monospace; color:var(--text-main);">
        System Core Version: v4.2-r2026<br>
        Framework: Modular EDA Engine
      </div>
    </div>
  `;

  const aboutFooter = `
    <button class="btn btn-primary" onclick="closeSystemModal()">Understood</button>
  `;

  openSystemModal('About System', aboutBody, aboutFooter);
}