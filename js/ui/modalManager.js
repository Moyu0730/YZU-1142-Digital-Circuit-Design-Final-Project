'use strict';

/**
 * Enterprise EDA Window & Overlay Lifecycle Manager
 * Handles multi-mode system popups and custom theme parameters settings.
 */

window.currentGridDensity = window.currentGridDensity || '20';
window.currentSelectedThemeActive = window.currentSelectedThemeActive || 'navy';

function ensureModalDOM() {
    if (!document.getElementById('systemModalBackdrop')) {
        console.log("[EDA DEBUG] Modal DOM not found, injecting dynamically...");
        const modalDom = document.createElement('div');
        modalDom.id = 'systemModalBackdrop';
        modalDom.className = 'modal-backdrop';
        modalDom.onclick = (e) => {
            if (e.target.id === 'systemModalBackdrop') closeSystemModal();
        };
        modalDom.innerHTML = `
            <div class="modal-content" id="systemModalContent">
                <div class="modal-header">
                    <h3 id="modalTitleText">System Alert</h3>
                    <button class="modal-close" onclick="closeSystemModal()">×</button>
                </div>
                <div class="modal-body" id="modalBodyContent"></div>
                <div class="modal-footer" id="modalFooterContent"></div>
            </div>
        `;
        document.body.appendChild(modalDom);
        console.log("[EDA DEBUG] Modal DOM successfully injected.");
    }
}

function openSystemModal(title, bodyHtml, footerHtml) {
    ensureModalDOM(); 
    const backdrop = document.getElementById('systemModalBackdrop');
    const content = document.getElementById('systemModalContent');
    const titleTxt = document.getElementById('modalTitleText');
    const body = document.getElementById('modalBodyContent');
    const footer = document.getElementById('modalFooterContent');

    if (backdrop && content) {
        content.classList.remove('modal-wide'); 
        body.classList.remove('pdf-mode'); 
        
        titleTxt.textContent = title;
        body.innerHTML = bodyHtml;
        footer.innerHTML = footerHtml;

        document.body.classList.add('modal-open');
        backdrop.classList.add('active');
    }
}

function openSystemModalWidened(title, bodyHtml, footerHtml) {
    ensureModalDOM();
    const backdrop = document.getElementById('systemModalBackdrop');
    const content = document.getElementById('systemModalContent');
    const titleTxt = document.getElementById('modalTitleText');
    const body = document.getElementById('modalBodyContent');
    const footer = document.getElementById('modalFooterContent');

    if (backdrop && content) {
        content.classList.add('modal-wide'); 
        titleTxt.textContent = title;
        body.innerHTML = bodyHtml;
        footer.innerHTML = footerHtml;

        document.body.classList.add('modal-open');
        backdrop.classList.add('active');
    }
}

function closeSystemModal() {
    const backdrop = document.getElementById('systemModalBackdrop');
    if (backdrop) {
        document.body.classList.remove('modal-open');
        backdrop.classList.remove('active');
    }
}

function openSettingsModal() {
    console.log("[EDA DEBUG] Opening Settings window...");
    const title = 'User Preferences & Color Themes';
    
    // Remember current grid density selection
    const is20 = window.currentGridDensity === '20' ? 'selected' : '';
    const is40 = window.currentGridDensity === '40' ? 'selected' : '';
    const is0  = window.currentGridDensity === '0'  ? 'selected' : '';
    
    const bodyHtml = `
        <form class="settings-form" onsubmit="event.preventDefault();">
            <div class="settings-group">
                <label>Workspace Grid Density</label>
                <select id="settingGridDensity">
                    <option value="20" ${is20}>Standard Engineering Grid (20px)</option>
                    <option value="40" ${is40}>Sparse Analytical Grid (40px)</option>
                    <option value="0" ${is0}>Disable Background Grid Canvas</option>
                </select>
            </div>
            
            <div class="settings-group">
                <label>Select Workspace Color Palette Accent</label>
                <p class="setting-desc-text">Applies system variables contrast schemes to headers, tables, and buttons.</p>
                
                <div class="swatch-grid">
                    <div class="theme-swatch-card" id="swatch-navy" onclick="selectThemeSwatch('navy')">
                        <div class="swatch-visual">
                            <div class="swatch-chunk swatch-navy-nav"></div>
                            <div class="swatch-chunk swatch-navy-card"></div>
                            <div class="swatch-chunk swatch-navy-accent"></div>
                        </div>
                        <div class="swatch-details">
                            <span class="swatch-title">Midnight Navy</span>
                            <span class="swatch-desc">Corporate Dark Scheme</span>
                        </div>
                    </div>

                    <div class="theme-swatch-card" id="swatch-graphite" onclick="selectThemeSwatch('graphite')">
                        <div class="swatch-visual">
                            <div class="swatch-chunk swatch-graphite-nav"></div>
                            <div class="swatch-chunk swatch-graphite-card"></div>
                            <div class="swatch-chunk swatch-graphite-accent"></div>
                        </div>
                        <div class="swatch-details">
                            <span class="swatch-title">Graphite Slate</span>
                            <span class="swatch-desc">Industrial Balanced Dark</span>
                        </div>
                    </div>

                    <div class="theme-swatch-card" id="swatch-eng" onclick="selectThemeSwatch('eng')">
                        <div class="swatch-visual">
                            <div class="swatch-chunk swatch-eng-nav"></div>
                            <div class="swatch-chunk swatch-eng-card"></div>
                            <div class="swatch-chunk swatch-eng-accent"></div>
                        </div>
                        <div class="swatch-details">
                            <span class="swatch-title">Classic Grey</span>
                            <span class="swatch-desc">Standard Technical CAD</span>
                        </div>
                    </div>

                    <div class="theme-swatch-card" id="swatch-sci" onclick="selectThemeSwatch('sci')">
                        <div class="swatch-visual">
                            <div class="swatch-chunk swatch-sci-nav"></div>
                            <div class="swatch-chunk swatch-sci-card"></div>
                            <div class="swatch-chunk swatch-sci-accent"></div>
                        </div>
                        <div class="swatch-details">
                            <span class="swatch-title">Science Green</span>
                            <span class="swatch-desc">High Contrast Lab Scheme</span>
                        </div>
                    </div>

                    <div class="theme-swatch-card" id="swatch-sunset" onclick="selectThemeSwatch('sunset')">
                        <div class="swatch-visual">
                            <div class="swatch-chunk swatch-sunset-nav"></div>
                            <div class="swatch-chunk swatch-sunset-card"></div>
                            <div class="swatch-chunk swatch-sunset-accent"></div>
                        </div>
                        <div class="swatch-details">
                            <span class="swatch-title">Sunset Terracotta</span>
                            <span class="swatch-desc">Warm Theoretical Tones</span>
                        </div>
                    </div>

                    <div class="theme-swatch-card" id="swatch-purple" onclick="selectThemeSwatch('purple')">
                        <div class="swatch-visual">
                            <div class="swatch-chunk swatch-purple-nav"></div>
                            <div class="swatch-chunk swatch-purple-card"></div>
                            <div class="swatch-chunk swatch-purple-accent"></div>
                        </div>
                        <div class="swatch-details">
                            <span class="swatch-title">Deep Amethyst</span>
                            <span class="swatch-desc">Scholarly Rigor Purple</span>
                        </div>
                    </div>

                    <div class="theme-swatch-card" id="swatch-quantum" onclick="selectThemeSwatch('quantum')">
                        <div class="swatch-visual">
                            <div class="swatch-chunk swatch-quantum-nav"></div>
                            <div class="swatch-chunk swatch-quantum-card"></div>
                            <div class="swatch-chunk swatch-quantum-accent"></div>
                        </div>
                        <div class="swatch-details">
                            <span class="swatch-title">Quantum Void</span>
                            <span class="swatch-desc">Extreme Dark OLED Mode</span>
                        </div>
                    </div>

                    <div class="theme-swatch-card" id="swatch-ocean" onclick="selectThemeSwatch('ocean')">
                        <div class="swatch-visual">
                            <div class="swatch-chunk swatch-ocean-nav"></div>
                            <div class="swatch-chunk swatch-ocean-card"></div>
                            <div class="swatch-chunk swatch-ocean-accent"></div>
                        </div>
                        <div class="swatch-details">
                            <span class="swatch-title">Oceanic Blue</span>
                            <span class="swatch-desc">Clean Azure Marine Accent</span>
                        </div>
                    </div>

                    <div class="theme-swatch-card" id="swatch-rose" onclick="selectThemeSwatch('rose')">
                        <div class="swatch-visual">
                            <div class="swatch-chunk swatch-rose-nav"></div>
                            <div class="swatch-chunk swatch-rose-card"></div>
                            <div class="swatch-chunk swatch-rose-accent"></div>
                        </div>
                        <div class="swatch-details">
                            <span class="swatch-title">Crimson Rose</span>
                            <span class="swatch-desc">Elegant Analytical Velvet</span>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    `;

    const footerHtml = `
        <button class="btn btn-bordered" onclick="closeSystemModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveSystemPreferencesConfigs()">Save & Apply Changes</button>
    `;

    openSystemModal(title, bodyHtml, footerHtml);

    // Initialize the active highlighted selected card outline
    window.currentSelectedThemeActive = document.body.getAttribute('data-theme') || 'navy';
    const activeCard = document.getElementById(`swatch-${window.currentSelectedThemeActive}`);
    if (activeCard) activeCard.classList.add('selected');
}

function selectThemeSwatch(themeName) {
    document.querySelectorAll('.theme-swatch-card').forEach(card => card.classList.remove('selected'));
    const targetCard = document.getElementById(`swatch-${themeName}`);
    if (targetCard) {
        targetCard.classList.add('selected');
        window.currentSelectedThemeActive = themeName;
    }
}

function saveSystemPreferencesConfigs() {
    const gridDensityValue = document.getElementById('settingGridDensity').value;
    window.currentGridDensity = gridDensityValue;
    const canvasArea = document.getElementById('svg-container');
    
    if (canvasArea) {
        if (parseInt(gridDensityValue) === 0) {
            canvasArea.style.backgroundImage = 'none';
        } else {
            canvasArea.style.backgroundImage = 'radial-gradient(var(--border-color) 1px, transparent 1px)';
            canvasArea.style.backgroundSize = `${gridDensityValue}px ${gridDensityValue}px`;
        }
    }

    if (window.currentSelectedThemeActive) {
        document.body.setAttribute('data-theme', window.currentSelectedThemeActive);
        console.log(`[EDA DEBUG] System theme changed to: ${window.currentSelectedThemeActive}`);
    }

    closeSystemModal();
}

function openAboutModal() {
    const title = 'About Sequential Circuit EDA';
    const bodyHtml = `
        <div style="text-align: center; padding: 10px 0;">
            <span style="font-size: 48px;">⚡</span>
            <h4 style="margin: 12px 0 6px 0; font-size:16px;">Sequential Circuit EDA Platform</h4>
            <span style="color: var(--text-muted); font-size:12px;">Version 2.4.0 (Enterprise Academic Build)</span>
            <p style="margin-top: 16px; text-align: left; font-size:13px; line-height: 1.6; color: var(--text-main);">
                An advanced educational Computer-Aided Design (CAD) environment tailored specifically for synthesizing synchronous finite state machines, drawing automated logic gate schematics, and evaluating truth-tables with zero compilation latency.
            </p>
        </div>
    `;
    const footerHtml = `<button class="btn btn-primary" onclick="closeSystemModal()">Acknowledge</button>`;
    openSystemModal(title, bodyHtml, footerHtml);
}