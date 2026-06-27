'use strict';

// =========================================================
// modalManager.js — Modal Overlay Lifecycle Manager
// Provides a single shared modal DOM that is reused across all
// system dialogs (Settings, About, PDF Preview).
// Public API:
//   openSystemModal(title, bodyHtml, footerHtml)        — standard width
//   openSystemModalWidened(title, bodyHtml, footerHtml) — wide (960px)
//   closeSystemModal()
// =========================================================

// Persistent state across modal open/close cycles
window.currentGridDensity          = window.currentGridDensity          || '20';
window.currentSelectedThemeActive  = window.currentSelectedThemeActive  || 'navy';

// Lazily injects the shared modal skeleton into the DOM on first use.
// Re-using one DOM node (rather than creating it per call) avoids layout thrash
// and keeps z-index stacking predictable across all dialog types.
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

// Opens the shared modal at standard width, replacing any prior content.
// Strips pdf-mode and modal-wide classes so the modal resets to default sizing.
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

// Opens the shared modal with the modal-wide class (960px max-width) applied.
// Used by PDF Preview and About — dialogs that need more horizontal space.
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

// Hides the modal by removing the 'active' class; content is preserved in DOM
// so reopening the same dialog type is instant (no re-injection needed).
function closeSystemModal() {
    const backdrop = document.getElementById('systemModalBackdrop');
    if (backdrop) {
        document.body.classList.remove('modal-open');
        backdrop.classList.remove('active');
    }
}

// Builds and opens the Settings dialog with the current grid density and theme
// pre-selected, so the user sees their active state at open time.
function openSettingsModal() {
    console.log("[EDA DEBUG] Opening Settings window...");
    const title = 'User Preferences & Color Themes';
    
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
        <div style="display: flex; justify-content: flex-end; gap: 12px; width: 100%;">
            <button class="btn btn-bordered" onclick="closeSystemModal()">Cancel</button>
            <button class="btn btn-primary" onclick="saveSystemPreferencesConfigs()">Save & Apply Changes</button>
        </div>
    `;

    openSystemModal(title, bodyHtml, footerHtml);

    window.currentSelectedThemeActive = document.body.getAttribute('data-theme') || 'navy';
    const activeCard = document.getElementById(`swatch-${window.currentSelectedThemeActive}`);
    if (activeCard) activeCard.classList.add('selected');
}

// Toggles the 'selected' CSS class to the clicked swatch and records the choice
// in currentSelectedThemeActive. The theme is not applied until Save is clicked.
function selectThemeSwatch(themeName) {
    document.querySelectorAll('.theme-swatch-card').forEach(card => card.classList.remove('selected'));
    const targetCard = document.getElementById(`swatch-${themeName}`);
    if (targetCard) {
        targetCard.classList.add('selected');
        window.currentSelectedThemeActive = themeName;
    }
}

// Reads grid density and selected theme from the Settings dialog, applies them
// immediately to the live DOM, and closes the modal.
// Theme is applied via data-theme attribute; CSS custom properties do the rest.
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

// Opens the About / System Information dialog in wide-modal mode.
// Shows product identity, action links, developer profile card, and architecture
// spec list. Avatar falls back to a monogram initial if img/avatar.png is missing.
function openAboutModal() {
    console.log("[EDA DEBUG] Opening System Information window...");
    const title = 'System Information';
    
    const repoUrl = "https://github.com/Moyu0730/YZU-1142-Digital-Circuit-Design-Final-Project";
    const profileUrl = "https://github.com/Moyu0730";
    const emailAddress = "mailto:s1131525@mail.yzu.edu.tw";
    const readmeUrl = "https://github.com/Moyu0730/YZU-1142-Digital-Circuit-Design-Final-Project#readme";

    const bodyHtml = `
        <div style="display: flex; flex-direction: column; gap: 24px; padding: 12px 0;">
            
            <div style="text-align: center;">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 72px; height: 72px; border-radius: 20px; background: rgba(37, 99, 235, 0.08); color: var(--primary); margin-bottom: 16px; border: 1px solid rgba(37, 99, 235, 0.15);">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="7" y="7" width="10" height="10" rx="1"/>
                        <path d="M9 7V4M12 7V4M15 7V4M9 17v3M12 17v3M15 17v3M7 9H4M7 12H4M7 15H4M17 9h3M17 12h3M17 15h3"/>
                    </svg>
                </div>
                <h2 style="font-size: 20px; font-weight: 800; color: var(--text-main); margin: 0 0 10px 0; letter-spacing: 0.5px; line-height: 1.3;">Sequential Circuit Design Automation System</h2>
                <div style="display: inline-flex; align-items: center; gap: 8px; padding: 4px 14px; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 20px; font-size: 12px; font-weight: 700; color: var(--text-muted);">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--success); box-shadow: 0 0 8px var(--success);"></span>
                    v1.9.0 &nbsp;|&nbsp; Academic Build
                </div>
            </div>

            <p style="text-align: center; font-size: 13px; line-height: 1.6; color: var(--text-muted); margin: 0; padding: 0 20px;">
                An educational CAD environment for synthesizing synchronous finite state machines — from state table input through Quine-McCluskey minimization, K-map visualization, to automated SVG gate-level schematic generation and PDF report export.
            </p>

            <div style="display: flex; justify-content: center; gap: 12px; margin-top: 4px; flex-wrap: wrap;">
                <a href="${repoUrl}" target="_blank" class="btn btn-bordered" style="display: flex; align-items: center; gap: 8px; text-decoration: none;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                    </svg>
                    GitHub Repository
                </a>
                <a href="${emailAddress}" class="btn btn-bordered" style="display: flex; align-items: center; gap: 8px; text-decoration: none;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    Contact Email
                </a>
                <a href="${readmeUrl}" target="_blank" class="btn btn-primary" style="display: flex; align-items: center; gap: 8px; text-decoration: none;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    System Documentation
                </a>
            </div>

            <div style="border-top: 1px solid var(--border-color); margin: 8px 0;"></div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                
                <a href="${profileUrl}" target="_blank" style="text-decoration: none; display: flex; flex-direction: column; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; height: 100%; transition: all 0.2s; position: relative; overflow: hidden;" onmouseover="this.style.borderColor='var(--primary)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--shadow-md)';" onmouseout="this.style.borderColor='var(--border-color)'; this.style.transform='none'; this.style.boxShadow='none';">
                    
                    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 32px; background: linear-gradient(90deg, rgba(37,99,235,0.05) 0%, rgba(37,99,235,0.1) 100%); border-bottom: 1px solid rgba(37,99,235,0.1);"></div>

                    <div style="position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <span style="font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: var(--text-muted); background: var(--bg-color); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-color); box-shadow: 0 1px 2px rgba(0,0,0,0.02);">Developer Profile</span>
                        <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: var(--primary); background: rgba(37,99,235,0.1); padding: 2px 8px; border-radius: 12px;">
                            @Moyu0730
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        </div>
                    </div>

                    <div style="position: relative; z-index: 1; display: flex; align-items: center; gap: 16px; flex: 1;">
                        <div style="width: 60px; height: 60px; border-radius: 50%; overflow: hidden; background: var(--card-bg); border: 2px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <img src="img/avatar.png" alt="Chen Po-Hao" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div style="display: none; width: 100%; height: 100%; background: var(--primary); align-items: center; justify-content: center;">
                                <span style="color: #ffffff; font-size: 24px; font-weight: 800;">C</span>
                            </div>
                        </div>
                        
                        <div style="flex: 1;">
                            <div style="font-size: 16px; font-weight: 800; color: var(--text-main); letter-spacing: -0.2px; display: flex; align-items: center; gap: 6px;">
                                Chen Po-Hao
                            </div>
                            <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-top: 2px;">CSIE & EE Double Major</div>
                            <div style="display: flex; align-items: center; gap: 6px; margin-top: 6px; flex-wrap: wrap;">
                                <div style="font-size: 10px; color: var(--text-main); background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px; font-weight: 600;">Yuan Ze Univ.</div>
                                <div style="font-size: 10px; color: var(--primary); background: rgba(37,99,235,0.05); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-weight: 700;">ID: S1131525</div>
                            </div>
                        </div>
                    </div>
                </a>

                <div style="background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; height: 100%;">
                    <div style="font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 12px;">Architecture Specs</div>
                    
                    <div style="display: flex; flex-direction: column; gap: 10px; flex: 1; justify-content: center;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="width: 4px; height: 14px; background: var(--danger); border-radius: 2px;"></span>
                            <span style="font-size: 12px; font-weight: 600; color: var(--text-main);">Quine-McCluskey FSM Engine</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="width: 4px; height: 14px; background: #8b5cf6; border-radius: 2px;"></span>
                            <span style="font-size: 12px; font-weight: 600; color: var(--text-main);">Karnaugh Map Synthesis</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="width: 4px; height: 14px; background: var(--primary); border-radius: 2px;"></span>
                            <span style="font-size: 12px; font-weight: 600; color: var(--text-main);">SVG Canvas Auto-Routing</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="width: 4px; height: 14px; background: var(--success); border-radius: 2px;"></span>
                            <span style="font-size: 12px; font-weight: 600; color: var(--text-main);">PDF Document Exporter</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="width: 4px; height: 14px; background: #fbbf24; border-radius: 2px;"></span>
                            <span style="font-size: 12px; font-weight: 600; color: var(--text-main);">Vanilla JS & CSS3 Layout</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    `;

    const footerHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <span style="font-size: 11px; color: var(--text-muted); font-weight: 600; letter-spacing: 0.5px;">Spring 2026 · Digital Circuit Design Final Project</span>
            <button class="btn btn-primary" onclick="closeSystemModal()">Close</button>
        </div>
    `;

    openSystemModalWidened(title, bodyHtml, footerHtml);
}