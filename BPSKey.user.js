// ==UserScript==
// @name         work.ink bypass
// @namespace    https://github.com/MinhPhuc-Dev/BPSKey
// @version      2025-10-26.1
// @description  bypasses work.ink shortened links
// @author       Dora
// @match        https://work.ink/*
// @match        https://key.volcano.wtf/*
// @run-at       document-start
// @icon         https://www.google.com/s2/favicons?sz=64&domain=work.ink
// @homepageURL  https://github.com/MinhPhuc-Dev/BPSKey
// @supportURL   https://github.com/MinhPhuc-Dev/BPSKey/issues
// @downloadURL  https://github.com/MinhPhuc-Dev/BPSKey/raw/refs/heads/main/BPSKey.user.js
// @updateURL    https://github.com/MinhPhuc-Dev/BPSKey/raw/refs/heads/main/BPSKey.user.js
// @grant        unsafeWindow
// @noframes
// @inject-into  page
// ==/UserScript==

(function() {
    "use strict";

    const DEBUG = false; // debug logging

    // Preserve original console methods in case the site overrides them
    const oldLog = unsafeWindow.console.log;
    const oldWarn = unsafeWindow.console.warn;
    const oldError = unsafeWindow.console.error;

    // Wrapper functions prepend a tag and only log when DEBUG is true
    function log(...args) { if (DEBUG) oldLog("[UnShortener]", ...args); }
    function warn(...args) { if (DEBUG) oldWarn("[UnShortener]", ...args); }
    function error(...args) { if (DEBUG) oldError("[UnShortener]", ...args); }

    // Override console.clear in DEBUG mode to prevent the site from erasing debug logs
    if (DEBUG) unsafeWindow.console.clear = function() {};

    const container = unsafeWindow.document.createElement("div");
    container.style.position = "fixed";
    container.style.bottom = "10px";
    container.style.left = "10px";
    container.style.zIndex = 999999;

    // Attach closed shadow root
    const shadow = container.attachShadow({ mode: "closed" });

    // (Removed legacy hint badge to consolidate everything in the new panel)

    // Modern process panel (fluent UI) in shadow root
    const ui = unsafeWindow.document.createElement("div");
    ui.setAttribute("data-ui", "bypass-panel");
    Object.assign(ui.style, {
        position: "fixed",
        left: "12px",
        bottom: "56px",
        width: "min(360px, calc(100vw - 24px))",
        color: "#e6e6e6",
        background: "rgba(16,16,20,0.9)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "14px",
        boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
        overflow: "hidden",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial",
        display: "none",
        zIndex: 2,
        opacity: "0",
        transform: "translateY(12px)",
        transition: "opacity 360ms cubic-bezier(.25,.8,.25,1), transform 360ms cubic-bezier(.25,.8,.25,1)",
        willChange: "opacity, transform, left, top"
    });

    // Style sheet for animations
    const styleEl = unsafeWindow.document.createElement('style');
    styleEl.textContent = `
      :host, * { box-sizing: border-box; }
      .visible { opacity: 1 !important; transform: translateY(0) !important; }
      .enter { animation: popIn 700ms cubic-bezier(.16,.84,.44,1) forwards; }
      @keyframes popIn {
        0%   { opacity: 0; transform: translateY(12px) scale(.985); }
        65%  { opacity: 1; transform: translateY(-2px) scale(1.015); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      .dragging { transform: translateY(0) scale(1.02) !important; box-shadow: 0 18px 40px rgba(0,0,0,0.45) !important; }
      .release { animation: release 360ms cubic-bezier(.16,.84,.44,1) forwards; }
      @keyframes release { from { transform: translateY(0) scale(1.02); } to { transform: translateY(0) scale(1); } }
      .log-item { opacity: 0; transform: translateY(8px); animation: logIn 420ms cubic-bezier(.2,.8,.2,1) forwards; }
      @keyframes logIn { to { opacity: 1; transform: translateY(0); } }
      .ripple { position: absolute; border-radius: 999px; pointer-events: none; transform: scale(0); background: rgba(255,255,255,0.35); animation: ripple 560ms cubic-bezier(.2,.8,.2,1) forwards; }
      @keyframes ripple { to { transform: scale(9); opacity: 0; } }
      .step-done::marker { content: '✔ '; color: #86efac; }
      /* Progress shimmer */
      .progress-shimmer { background: linear-gradient(90deg, rgba(96,165,250,0.6), rgba(52,211,153,0.9), rgba(96,165,250,0.6)); background-size: 200% 100%; animation: shimmer 2.2s linear infinite; }
      @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: 0 0; } }
    `;

    // Theme config (editable via localStorage key 'bypass_theme')
    // Example: localStorage.setItem('bypass_theme', JSON.stringify({ mode: 'image', url: 'https://picsum.photos/800/600?blur=2' }))
    function readTheme() {
        try { return JSON.parse(unsafeWindow.localStorage.getItem('bypass_theme') || 'null') || { mode: 'solid', url: '' }; } catch { return { mode: 'solid', url: '' }; }
    }
    function applyTheme(layer, theme) {
        try {
            layer.style.background = 'none';
            layer.style.backgroundSize = 'cover';
            layer.style.backgroundPosition = 'center';
            layer.innerHTML = '';
            if (theme.mode === 'image' && theme.url) {
                layer.style.backgroundImage = `url(${theme.url})`;
                layer.style.opacity = '0.25';
            } else if (theme.mode === 'motion' && theme.url) {
                const video = unsafeWindow.document.createElement('video');
                Object.assign(video, { src: theme.url, autoplay: true, loop: true, muted: true, playsInline: true });
                Object.assign(video.style, { width: '100%', height: '100%', objectFit: 'cover', opacity: '0.25' });
                layer.appendChild(video);
            } else {
                layer.style.background = 'linear-gradient(135deg, rgba(96,165,250,0.15), rgba(52,211,153,0.12))';
            }
        } catch {}
    }

    const uiHeader = unsafeWindow.document.createElement("div");
    Object.assign(uiHeader.style, {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
        padding: "12px 14px",
        background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        fontWeight: 700,
        fontSize: "14px",
        letterSpacing: "0.2px"
    });
    const uiTitle = unsafeWindow.document.createElement("div");
    uiTitle.textContent = "Bypass in progress";
    const uiClose = unsafeWindow.document.createElement("button");
    uiClose.textContent = "✕";
    Object.assign(uiClose.style, {
        background: "transparent",
        color: "#cfcfcf",
        border: "none",
        cursor: "pointer",
        fontSize: "14px",
        padding: "4px 8px",
        borderRadius: "8px"
    });
    uiClose.addEventListener("mouseenter", () => { uiClose.style.background = "rgba(255,255,255,0.08)"; });
    uiClose.addEventListener("mouseleave", () => { uiClose.style.background = "transparent"; });
    uiClose.addEventListener("click", () => { ui.style.display = "none"; });
    // Make panel draggable by its header
    uiHeader.style.cursor = "move";
    let _dragging = false, _startX = 0, _startY = 0, _startLeft = 0, _startTop = 0, _raf = 0, _mx = 0, _my = 0;
    let _curLeft = 0, _curTop = 0, _targetLeft = 0, _targetTop = 0;
    function _applyDrag() {
        _raf = 0;
        const dx = _mx - _startX;
        const dy = _my - _startY;
        _targetLeft = Math.max(8, _startLeft + dx);
        _targetTop = Math.max(8, _startTop + dy);
        // lerp for smooth motion
        const lerp = (a, b, t) => a + (b - a) * t;
        _curLeft = lerp(_curLeft, _targetLeft, 0.25);
        _curTop = lerp(_curTop, _targetTop, 0.25);
        ui.style.left = `${_curLeft}px`;
        ui.style.top = `${_curTop}px`;
        // keep animating while moving
        if (Math.abs(_curLeft - _targetLeft) > 0.5 || Math.abs(_curTop - _targetTop) > 0.5) {
            _raf = unsafeWindow.requestAnimationFrame(_applyDrag);
        }
    }

    // Auto captcha solving helpers (best-effort, non-invasive)
    function isVisible(el) {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.width > 8 && r.height > 8 && r.bottom > 0 && r.right > 0 && r.left < unsafeWindow.innerWidth && r.top < unsafeWindow.innerHeight;
    }
    function simulateClick(el) {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const cx = Math.floor(r.left + r.width / 2);
        const cy = Math.floor(r.top + r.height / 2);
        const evInit = { bubbles: true, cancelable: true, view: unsafeWindow, clientX: cx, clientY: cy, button: 0 };
        try { el.dispatchEvent(new unsafeWindow.MouseEvent('pointerdown', evInit)); } catch {}
        try { el.dispatchEvent(new unsafeWindow.MouseEvent('mousedown', evInit )); } catch {}
        try { el.dispatchEvent(new unsafeWindow.MouseEvent('mouseup',   evInit )); } catch {}
        try { el.dispatchEvent(new unsafeWindow.MouseEvent('click',    evInit )); } catch {}
        try { el.click?.(); } catch {}
        return true;
    }

    // Initialize per-host behaviors early for non-work.ink pages (mid-bridge)
    // Removed mid-bridge host initialization to focus solely on Work.ink

    function _onMove(e) {
        if (!_dragging) return;
        _mx = e.clientX; _my = e.clientY;
        if (!_raf) _raf = unsafeWindow.requestAnimationFrame(_applyDrag);
    }
    function _onUp() {
        _dragging = false;
        unsafeWindow.document.removeEventListener("mousemove", _onMove, { passive: true });
        try { ui.classList.remove('dragging'); ui.classList.add('release'); setTimeout(()=>ui.classList.remove('release'), 320); } catch {}
    }
    uiHeader.addEventListener("mousedown", (e) => {
        _dragging = true;
        const rect = ui.getBoundingClientRect();
        // Switch to top-based positioning for free movement
        ui.style.bottom = "auto";
        ui.style.top = `${rect.top}px`;
        _startX = e.clientX; _startY = e.clientY;
        _startLeft = rect.left; _startTop = rect.top;
        _curLeft = rect.left; _curTop = rect.top;
        _targetLeft = rect.left; _targetTop = rect.top;
        unsafeWindow.document.addEventListener("mousemove", _onMove, { passive: true });
        unsafeWindow.document.addEventListener("mouseup", _onUp, { once: true });
        try { ui.classList.add('dragging'); } catch {}
    });

    uiHeader.appendChild(uiTitle);
    uiHeader.appendChild(uiClose);

    const uiBody = unsafeWindow.document.createElement("div");
    Object.assign(uiBody.style, {
        padding: "12px 14px",
        display: "grid",
        gap: "10px",
        fontSize: "13px",
        lineHeight: 1.5
    });

    const rowTop = unsafeWindow.document.createElement("div");
    Object.assign(rowTop.style, {display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px"});
    const destLabel = unsafeWindow.document.createElement("div");
    destLabel.style.color = "#b5d6ff";
    destLabel.textContent = "Destination: —";
    const countdownLabel = unsafeWindow.document.createElement("div");
    countdownLabel.style.color = "#bbb";
    countdownLabel.textContent = "Redirect in —s";
    rowTop.appendChild(destLabel);
    rowTop.appendChild(countdownLabel);

    const progressWrap = unsafeWindow.document.createElement("div");
    Object.assign(progressWrap.style, {width: "100%", height: "8px", background: "rgba(255,255,255,0.06)", borderRadius: "999px", overflow: "hidden"});
    const progressBar = unsafeWindow.document.createElement("div");
    Object.assign(progressBar.style, {height: "100%", width: "0%", borderRadius: "999px", transition: "width 320ms cubic-bezier(.2,.8,.2,1)"});
    progressBar.className = 'progress-shimmer';
    progressWrap.appendChild(progressBar);

    const statusList = unsafeWindow.document.createElement("ul");
    Object.assign(statusList.style, {margin: "0", padding: "0 0 0 16px", color: "#cfcfcf"});
    statusList.innerHTML = "<li>Waiting for captcha (if any)</li><li>Bypassing checks</li><li>Preparing destination</li>";

    const uiActions = unsafeWindow.document.createElement("div");
    Object.assign(uiActions.style, { display: "flex", justifyContent: "flex-end", gap: "8px", padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" });
    const btnHide = unsafeWindow.document.createElement("button");
    btnHide.textContent = "Hide";
    Object.assign(btnHide.style, {background: "transparent", color: "#cfcfcf", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", padding: "8px 12px", fontSize: "13px", cursor: "pointer"});
    btnHide.addEventListener("click", () => { ui.style.display = "none"; });

    uiActions.appendChild(btnHide);

    uiBody.appendChild(rowTop);
    uiBody.appendChild(progressWrap);
    uiBody.appendChild(statusList);

    ui.appendChild(uiHeader);
    ui.appendChild(uiBody);
    ui.appendChild(uiActions);
    // Themed background layer and splash logo
    const themeLayer = unsafeWindow.document.createElement('div');
    Object.assign(themeLayer.style, { position: 'absolute', inset: '0', zIndex: '0', pointerEvents: 'none', borderRadius: '14px', overflow: 'hidden' });
    applyTheme(themeLayer, readTheme());

    // Glass grain overlay
    const grain = unsafeWindow.document.createElement('div');
    Object.assign(grain.style, {
        position: 'absolute', inset: '0', zIndex: '1', pointerEvents: 'none', opacity: '.18', borderRadius: '14px',
        backgroundImage:
          'repeating-linear-gradient(0deg, rgba(255,255,255,.03) 0, rgba(255,255,255,.03) 2px, transparent 2px, transparent 4px),'+
          'repeating-linear-gradient(90deg, rgba(255,255,255,.02) 0, rgba(255,255,255,.02) 2px, transparent 2px, transparent 4px)'
    });

    const splash = unsafeWindow.document.createElement('div');
    Object.assign(splash.style, { position: 'absolute', inset: '0', display: 'grid', placeItems: 'center', zIndex: '3', background: 'transparent', opacity: '0' });
    const logo = unsafeWindow.document.createElement('div');
    logo.textContent = '🌋';
    Object.assign(logo.style, { fontSize: '40px', filter: 'drop-shadow(0 12px 24px rgba(249,115,22,0.35))', transform: 'scale(0.9)', transition: 'opacity 520ms cubic-bezier(.2,.8,.2,1), transform 520ms cubic-bezier(.2,.8,.2,1)' });
    splash.appendChild(logo);

    // Cursor glow inside UI
    const cursorGlow = unsafeWindow.document.createElement('div');
    cursorGlow.className = 'cursor-glow';
    Object.assign(cursorGlow.style, {
        position: 'absolute', width: '140px', height: '140px', borderRadius: '999px', pointerEvents: 'none',
        left: '0', top: '0', transform: 'translate(-9999px, -9999px)', opacity: '.0', zIndex: '2',
        background: 'radial-gradient(circle closest-side, rgba(99,102,241,.28), rgba(59,130,246,.18) 60%, rgba(0,0,0,0) 70%)',
        filter: 'blur(14px)', transition: 'transform 160ms cubic-bezier(.2,.8,.2,1), opacity 220ms ease'
    });

    shadow.appendChild(styleEl);
    ui.appendChild(themeLayer);
    ui.appendChild(grain);
    ui.appendChild(cursorGlow);
    shadow.appendChild(ui);
    unsafeWindow.document.documentElement.appendChild(container);

    const NAME_MAP = {
        onLinkInfo: ["onLinkInfo"],
        onLinkDestination: ["onLinkDestination"]
    };

    // UI helpers (non-invasive)
    let _ui_lastUrl = null;
    let _bypassTriggered = false;
    let _captchaSolved = false;
    let _lastLogMsg = "";
    const MAX_LOG_ITEMS = 30;
    function uiLog(msg) {
        try {
            if (msg === _lastLogMsg) return; // coalesce duplicates
            _lastLogMsg = msg;
            const li = unsafeWindow.document.createElement("li");
            li.textContent = msg;
            li.style.color = "#cfcfcf";
            li.className = 'log-item';
            statusList.appendChild(li);
            // Cap total log entries
            while (statusList.children.length > MAX_LOG_ITEMS) {
                statusList.removeChild(statusList.firstChild);
            }
        } catch {}
    }
    function uiShow() {
        const reveal = () => {
            ui.style.display = 'block';
            // splash intro then reveal
            try {
                ui.appendChild(splash);
                requestAnimationFrame(() => {
                    splash.style.opacity = '1';
                    logo.style.transform = 'scale(1)';
                    setTimeout(() => {
                        splash.style.opacity = '0';
                        ui.classList.add('visible');
                        ui.classList.add('enter');
                        setTimeout(() => splash.remove(), 520);
                    }, 540);
                });
            } catch { requestAnimationFrame(() => ui.classList.add('visible')); }
        };
        const isWorkInk = /(^|\.)work\.ink$/i.test(unsafeWindow.location.host);
        if (isWorkInk) {
            // Show immediately on work.ink for snappy UX
            reveal();
        } else {
            // Defer to window load for smoother animation on other hosts
            if (unsafeWindow.document.readyState === 'complete') reveal();
            else unsafeWindow.addEventListener('load', reveal, { once: true });
        }
    }

    // Cursor glow follow within UI
    ui.addEventListener('mouseenter', (e) => { try { cursorGlow.style.opacity = '.9'; } catch {} });
    ui.addEventListener('mouseleave', (e) => { try { cursorGlow.style.opacity = '.0'; } catch {} });
    ui.addEventListener('mousemove', (e) => {
        try {
            const rect = ui.getBoundingClientRect();
            const x = e.clientX - rect.left - 70; // center glow (140/2)
            const y = e.clientY - rect.top - 70;
            cursorGlow.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
        } catch {}
    });
    function uiSetCountdown(sec) { countdownLabel.textContent = `Redirect in ${Math.max(0, Math.ceil(sec))}s`; }
    function uiSetDest(url) {
        _ui_lastUrl = url;
        try { destLabel.textContent = `Destination: ${new URL(url).host}`; } catch { destLabel.textContent = `Destination: ${url}`; }
    }
    function uiSetProgress(p) { progressBar.style.width = `${Math.max(0, Math.min(100, p))}%`; }
    function uiEnableOpenNow(_) { /* no-op (Open Now removed) */ }
    function uiMarkStep(index) {
        // Visually mark completed steps
        const lis = statusList.querySelectorAll("li");
        lis.forEach((li, i) => {
            if (i <= index) {
                li.style.color = "#9ae6b4";
                li.classList.add('step-done');
            }
        });
    }
    // uiEnableOpenNow is a no-op now (Open now removed)
    function uiEnableOpenNow(_) { /* no-op */ }

    // Minimal helpers for Volcano continuation (no captcha auto-solve)
    function isCaptchaTokenPresent() {
        const doc = unsafeWindow.document;
        const el = doc.querySelector('input[name="cf-turnstile-response"]');
        return !!(el && typeof el.value === 'string' && el.value.trim().length > 0);
    }
    function getPrimaryButton() {
        const doc = unsafeWindow.document;
        return doc.querySelector('#primaryButton, form button[type="submit"], button.btn[type="submit"], .btn[type="submit"]');
    }
    function isPrimaryEnabled() {
        const btn = getPrimaryButton();
        return !!(btn && !btn.disabled);
    }

    function continueIfPossible() {
        const btn = getPrimaryButton();
        if (btn) {
            try {
                if (btn.disabled) btn.disabled = false;
                btn.click();
                uiLog('Continuing to next step');
                return;
            } catch {}
        }
        try {
            const doc = unsafeWindow.document;
            const form = doc.querySelector('#checkpointForm, form[action*="/checkpoint"], form');
            const tokenEl = doc.querySelector('input[name="cf-turnstile-response"]');
            if (form && tokenEl && tokenEl.value) {
                form.submit();
                uiLog('Submitting form to continue');
            }
        } catch {}
    }

    function startVolcanoHeartbeat() {
        try {
            let ticks = 0; const maxTicks = 200; // ~60s
            const id = unsafeWindow.setInterval(() => {
                try {
                    if (_captchaSolved) { unsafeWindow.clearInterval(id); return; }
                    if (isCaptchaTokenPresent() || isPrimaryEnabled()) {
                        markCaptchaSolved(isCaptchaTokenPresent() ? 'volcano-token' : 'volcano-button');
                        continueIfPossible();
                        unsafeWindow.clearInterval(id);
                        return;
                    }
                    if (++ticks >= maxTicks) unsafeWindow.clearInterval(id);
                } catch {}
            }, 300);
        } catch {}
    }

    // Re-enable Volcano init without any captcha automation
    (function initPerHost() {
        try {
            const host = unsafeWindow.location.host;
            if (/key\.volcano\.wtf$/i.test(host)) {
                try {
                    uiTitle.textContent = 'Checkpoint (Volcano)';
                    uiShow();
                    uiSetProgress(10);
                    uiMarkStep(0);
                    uiLog('Waiting for captcha to initialize');
                } catch {}
                // Start heartbeat and observers for token/button ready
                try { startVolcanoHeartbeat(); } catch {}
                try {
                    const doc = unsafeWindow.document;
                    const tokenEl = doc.querySelector('input[name="cf-turnstile-response"]');
                    if (tokenEl) {
                        const moToken = new MutationObserver(() => {
                            try { if (tokenEl.value) { markCaptchaSolved('volcano-token-observer'); continueIfPossible(); moToken.disconnect(); } } catch {}
                        });
                        moToken.observe(tokenEl, { attributes: true, attributeFilter: ['value'] });
                    }
                    const btn = getPrimaryButton();
                    if (btn) {
                        const moBtn = new MutationObserver(() => {
                            try { if (!btn.disabled) { markCaptchaSolved('volcano-button-enabled'); continueIfPossible(); moBtn.disconnect(); } } catch {}
                        });
                        moBtn.observe(btn, { attributes: true, attributeFilter: ['disabled'] });
                    }
                } catch {}
            }
        } catch {}
    })();

    function safeTriggerBypass() {
        if (_bypassTriggered) return;
        if (!_sessionController || !_sessionController.linkInfo || typeof _sendMessage !== 'function') return;
        _bypassTriggered = true;
        try {
            uiTitle.textContent = "Bypassing checks...";
            uiMarkStep(1);
            uiSetProgress(40);
            uiLog("Sending bypass signals");
        } catch {}

        const clientPacketTypes = getClientPacketTypes();
        // Socials
        try {
            for (const social of _sessionController.linkInfo.socials || []) {
                _sendMessage.call(_sessionController, clientPacketTypes.SOCIAL_STARTED, { url: social.url });
            }
        } catch {}
        // Monetizations
        try {
            for (const monetization of _sessionController.linkInfo.monetizations || []) {
                switch (monetization) {
                    case 22: // readArticles2
                        _sendMessage.call(_sessionController, clientPacketTypes.MONETIZATION, { type: "readArticles2", payload: { event: "read" } });
                        break;
                    case 25: // operaGX
                        _sendMessage.call(_sessionController, clientPacketTypes.MONETIZATION, { type: "operaGX", payload: { event: "start" } });
                        _sendMessage.call(_sessionController, clientPacketTypes.MONETIZATION, { type: "operaGX", payload: { event: "installClicked" } });
                        fetch('https://work.ink/_api/v2/callback/operaGX', { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ 'noteligible': true }) });
                        break;
                    case 34: // norton
                        _sendMessage.call(_sessionController, clientPacketTypes.MONETIZATION, { type: "norton", payload: { event: "start" } });
                        _sendMessage.call(_sessionController, clientPacketTypes.MONETIZATION, { type: "norton", payload: { event: "installClicked" } });
                        break;
                    case 71: // externalArticles
                        _sendMessage.call(_sessionController, clientPacketTypes.MONETIZATION, { type: "externalArticles", payload: { event: "start" } });
                        _sendMessage.call(_sessionController, clientPacketTypes.MONETIZATION, { type: "externalArticles", payload: { event: "installClicked" } });
                        break;
                    case 45: // pdfeditor
                        _sendMessage.call(_sessionController, clientPacketTypes.MONETIZATION, { type: "pdfeditor", payload: { event: "installed" } });
                        break;
                    case 57: // betterdeals
                        _sendMessage.call(_sessionController, clientPacketTypes.MONETIZATION, { type: "betterdeals", payload: { event: "installed" } });
                        break;
                    default:
                        log("Unknown monetization type:", typeof monetization, monetization);
                }
            }
        } catch {}
        try { uiSetProgress(50); } catch {}
    }

    // Removed captcha solving and volcano helpers to keep script lean

    function markCaptchaSolved(source = 'detected') {
        if (_captchaSolved) return;
        _captchaSolved = true;
        try {
            uiLog(`Captcha solved (${source})`);
            uiTitle.textContent = "Captcha solved, bypassing...";
            uiMarkStep(1);
            uiSetProgress(45);
            uiShow();
        } catch {}
        // Trigger bypass if not already
        try { safeTriggerBypass(); } catch {}
    }

    function resolveName(obj, candidates) {
        for (let i = 0; i < candidates.length; i++) {
            const name = candidates[i];
            if (typeof obj[name] === "function") {
                return { fn: obj[name], index: i, name };
            }
        }
        return { fn: null, index: -1, name: null };
    }

    function resolveWriteFunction(obj) {
        for (let i in obj) {
            if (typeof obj[i] == "function" && obj[i].length == 2) {
                return { fn: obj[i], name: i };
            }
        }
        return { fn: null, index: -1, name: null };
    }

    // Global state
    let _sessionController = undefined;
    let _sendMessage = undefined;
    let _onLinkInfo = undefined;
    let _onLinkDestination = undefined;

    // Constants
    function getClientPacketTypes() {
        return {
            ANNOUNCE: "c_announce",
            MONETIZATION: "c_monetization",
            SOCIAL_STARTED: "c_social_started",
            RECAPTCHA_RESPONSE: "c_recaptcha_response",
            HCAPTCHA_RESPONSE: "c_hcaptcha_response",
            TURNSTILE_RESPONSE: "c_turnstile_response",
            ADBLOCKER_DETECTED: "c_adblocker_detected",
            FOCUS_LOST: "c_focus_lost",
            OFFERS_SKIPPED: "c_offers_skipped",
            FOCUS: "c_focus",
            WORKINK_PASS_AVAILABLE: "c_workink_pass_available",
            WORKINK_PASS_USE: "c_workink_pass_use",
            PING: "c_ping"
        };
    }

    const startTime = Date.now();

    function createSendMessageProxy() {
        const clientPacketTypes = getClientPacketTypes();

        return function(...args) {
            const packet_type = args[0];
            const packet_data = args[1];

            if (packet_type !== clientPacketTypes.PING) {
                log("Sent message:", packet_type, packet_data);
            }

            if (packet_type === clientPacketTypes.ADBLOCKER_DETECTED) {
                warn("Blocked adblocker detected message to avoid false positive.");
                return;
            }

            const isCaptchaSolved = (
                packet_type === clientPacketTypes.TURNSTILE_RESPONSE ||
                packet_type === clientPacketTypes.RECAPTCHA_RESPONSE ||
                packet_type === clientPacketTypes.HCAPTCHA_RESPONSE
            );

            if (_sessionController.linkInfo && isCaptchaSolved) {
                const ret = _sendMessage.apply(this, args);

                // Update modern UI instead of legacy hint
                try {
                    uiTitle.textContent = "Captcha solved, bypassing...";
                    if (typeof uiMarkStep === 'function') uiMarkStep(1);
                    if (typeof uiSetProgress === 'function') uiSetProgress(35);
                    if (typeof uiShow === 'function') uiShow();
                } catch {}

                // Mark internal state and ensure bypass path proceeds
                try { markCaptchaSolved('packet'); } catch {}

                // Send bypass messages
                for (const social of _sessionController.linkInfo.socials) {
                    _sendMessage.call(this, clientPacketTypes.SOCIAL_STARTED, {
                        url: social.url
                    });
                }

                for (const monetizationIdx in _sessionController.linkInfo.monetizations) {
                    const monetization = _sessionController.linkInfo.monetizations[monetizationIdx];

                    switch (monetization) {
                        case 22: { // readArticles2
                            _sendMessage.call(this, clientPacketTypes.MONETIZATION, {
                                type: "readArticles2",
                                payload: {
                                    event: "read"
                                }
                            });
                            break;
                        }

                        case 25: { // operaGX
                            _sendMessage.call(this, clientPacketTypes.MONETIZATION, {
                                type: "operaGX",
                                payload: {
                                    event: "start"
                                }
                            });
                            _sendMessage.call(this, clientPacketTypes.MONETIZATION, {
                                type: "operaGX",
                                payload: {
                                    event: "installClicked"
                                }
                            });
                            fetch('https://work.ink/_api/v2/callback/operaGX', {
                                method: 'POST',
                                mode: 'no-cors',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    'noteligible': true
                                })
                            });
                            break;
                        }

                        case 34: { // norton
                            _sendMessage.call(this, clientPacketTypes.MONETIZATION, {
                                type: "norton",
                                payload: {
                                    event: "start"
                                }
                            });
                            _sendMessage.call(this, clientPacketTypes.MONETIZATION, {
                                type: "norton",
                                payload: {
                                    event: "installClicked"
                                }
                            });
                            break;
                        }

                        case 71: { // externalArticles
                            _sendMessage.call(this, clientPacketTypes.MONETIZATION, {
                                type: "externalArticles",
                                payload: {
                                    event: "start"
                                }
                            });
                            _sendMessage.call(this, clientPacketTypes.MONETIZATION, {
                                type: "externalArticles",
                                payload: {
                                    event: "installClicked"
                                }
                            });
                            break;
                        }

                        case 45: { // pdfeditor
                            _sendMessage.call(this, clientPacketTypes.MONETIZATION, {
                                type: "pdfeditor",
                                payload: {
                                    event: "installed"
                                }
                            });
                            break;
                        }

                        case 57: { // betterdeals
                            _sendMessage.call(this, clientPacketTypes.MONETIZATION, {
                                type: "betterdeals",
                                payload: {
                                    event: "installed"
                                }
                            });
                            break;
                        }

                        default: {
                            log("Unknown monetization type:", typeof monetization, monetization);
                            break;
                        }
                    }
                }

                return ret;
            }

            return _sendMessage.apply(this, args);
        };
    }

    function createOnLinkInfoProxy() {
        return function(...args) {
            const linkInfo = args[0];

            log("Link info received:", linkInfo);

            Object.defineProperty(linkInfo, "isAdblockEnabled", {
                get() { return false },
                set(newValue) {
                    log("Attempted to set isAdblockEnabled to:", newValue);
                },
                configurable: false,
                enumerable: true
            });

            // Update modern UI with basic info
            try {
                uiTitle.textContent = "Bypass in progress";
                uiSetProgress(15);
                uiMarkStep(0);
                uiEnableOpenNow(false);
                uiShow();
                // Immediately trigger bypass on Work.ink for speed
                safeTriggerBypass();
            } catch (e) { warn("ui linkInfo", e); }

            return _onLinkInfo.apply(this, args);
        };
    }

    function updateHint(waitLeft) {
        try {
            uiTitle.textContent = "Destination ready";
            uiSetCountdown(waitLeft);
            uiShow();
        } catch {}
    }

    function redirect(url) {
        try { uiTitle.textContent = "Redirecting..."; } catch {}
        window.location.href = url;
    }

    function startCountdown(url, waitLeft) {
        updateHint(waitLeft);

        const interval = setInterval(() => {
            waitLeft -= 1;
            if (waitLeft > 0) {
                updateHint(waitLeft);
                // mirror countdown to modern UI (non-breaking)
                try { uiSetCountdown(waitLeft); uiSetProgress(50 + Math.min(40, (30 - waitLeft) * (40 / 30))); } catch {}
            } else {
                clearInterval(interval);
                redirect(url);
            }
        }, 1000);
    }

    // Smart delay calculator to avoid breaking destination load
    function computeSmartDelayMs(destUrl) {
        try {
            const min = 5000;   // minimum delay (5s)
            const max = 8000;   // maximum delay (~8s)
            let score = 0;     // 0..1 higher means slower network -> longer wait
            // Network info
            const c = unsafeWindow.navigator.connection || {};
            const eff = (c.effectiveType || '').toLowerCase();
            const rtt = Number(c.rtt || 0);
            if (eff.includes('2g')) score += 0.7; else if (eff.includes('3g')) score += 0.45; else if (eff.includes('4g')) score += 0.25; else score += 0.2;
            if (rtt > 300) score += 0.4; else if (rtt > 150) score += 0.2; else score += 0.05;
            // Time spent on page — if extremely fast, add a bit of buffer
            const elapsedMs = Date.now() - startTime;
            if (elapsedMs < 1200) score += 0.3; else if (elapsedMs < 2500) score += 0.15;
            // If tab is hidden, prefer slightly longer delay
            if (unsafeWindow.document.hidden) score += 0.1;
            // Host-based heuristic (some hosts initialize heavy scripts)
            try { const host = new URL(destUrl).host; if (/^linkvertise\.|mediafire\.|mega\.nz|google\./i.test(host)) score += 0.15; } catch {}
            // Bound score 0..1
            score = Math.max(0, Math.min(1, score));
            // Map to range and add tiny jitter
            const base = min + Math.round((max - min) * score);
            const jitter = Math.floor(Math.random() * 120) - 60; // ±60ms
            return Math.max(min, Math.min(max, base + jitter));
        } catch { return 5000; }
    }

    function createOnLinkDestinationProxy() {
        return function (...args) {
            const payload = args[0];
            log("Link destination received:", payload);
            // Compute a smart delay with a minimum of 5s to avoid breaking the next site load
            const delayMs = computeSmartDelayMs(payload.url);
            const waitTimeSeconds = Math.max(0, Math.ceil(delayMs / 1000));

            // Update UI with destination and progress
            try {
                uiSetDest(payload.url);
                uiEnableOpenNow(true);
                uiSetProgress(60);
                uiMarkStep(2);
                uiSetCountdown(waitTimeSeconds);
                uiShow();
            } catch (e) { warn("ui destination", e); }

            // Drive countdown and redirect via startCountdown for accurate UX
            startCountdown(payload.url, waitTimeSeconds);

            return _onLinkDestination.apply(this, args);
        };
    }

    function setupSessionControllerProxy() {
        const sendMessage = resolveWriteFunction(_sessionController);
        const onLinkInfo = resolveName(_sessionController, NAME_MAP.onLinkInfo);
        const onLinkDestination = resolveName(_sessionController, NAME_MAP.onLinkDestination);

        _sendMessage = sendMessage.fn;
        _onLinkInfo = onLinkInfo.fn;
        _onLinkDestination = onLinkDestination.fn;

        const sendMessageProxy = createSendMessageProxy();
        const onLinkInfoProxy = createOnLinkInfoProxy();
        const onLinkDestinationProxy = createOnLinkDestinationProxy();

        // Patch the actual property name that exists
        Object.defineProperty(_sessionController, sendMessage.name, {
            get() { return sendMessageProxy },
            set(newValue) { _sendMessage = newValue },
            configurable: false,
            enumerable: true
        });

        Object.defineProperty(_sessionController, onLinkInfo.name, {
            get() { return onLinkInfoProxy },
            set(newValue) { _onLinkInfo = newValue },
            configurable: false,
            enumerable: true
        });

        Object.defineProperty(_sessionController, onLinkDestination.name, {
            get() { return onLinkDestinationProxy },
            set(newValue) { _onLinkDestination = newValue },
            configurable: false,
            enumerable: true
        });

        log(`SessionController proxies installed: ${sendMessage.name}, ${onLinkInfo.name}, ${onLinkDestination.name}`);
    }

    function checkForSessionController(target, prop, value, receiver) {
        log("Checking property set:", prop, value);

        if (
            value &&
            typeof value === "object" &&
            resolveWriteFunction(value).fn &&
            resolveName(value, NAME_MAP.onLinkInfo).fn &&
            resolveName(value, NAME_MAP.onLinkDestination).fn &&
            !_sessionController
        ) {
            _sessionController = value;
            log("Intercepted session controller:", _sessionController);
            setupSessionControllerProxy();
        }

        return Reflect.set(target, prop, value, receiver);
    }

    function createComponentProxy(component) {
        return new Proxy(component, {
            construct(target, args) {
                const result = Reflect.construct(target, args);
                log("Intercepted SvelteKit component construction:", target, args, result);

                result.$$.ctx = new Proxy(result.$$.ctx, {
                    set: checkForSessionController
                });

                return result;
            }
        });
    }

    function createNodeResultProxy(result) {
        return new Proxy(result, {
            get(target, prop, receiver) {
                if (prop === "component") {
                    return createComponentProxy(target.component);
                }
                return Reflect.get(target, prop, receiver);
            }
        });
    }

    function createNodeProxy(oldNode) {
        return async (...args) => {
            const result = await oldNode(...args);
            log("Intercepted SvelteKit node result:", result);
            return createNodeResultProxy(result);
        };
    }

    function createKitProxy(kit) {
      	if (typeof kit !== "object" || !kit) return [false, kit];

        const originalStart = "start" in kit && kit.start;
        if (!originalStart) return [false, kit];

        const kitProxy = new Proxy(kit, {
            get(target, prop, receiver) {
                if (prop === "start") {
                    return function(...args) {
                        const appModule = args[0];
                        const options = args[2];

                        if (typeof appModule === "object" &&
                            typeof appModule.nodes === "object" &&
                            typeof options === "object" &&
                            typeof options.node_ids === "object") {

                            const oldNode = appModule.nodes[options.node_ids[1]];
                            appModule.nodes[options.node_ids[1]] = createNodeProxy(oldNode);
                        }

                        log("kit.start intercepted!", options);
                        return originalStart.apply(this, args);
                    };
                }
                return Reflect.get(target, prop, receiver);
            }
        });

        return [true, kitProxy];
    }

    function setupSvelteKitInterception() {
        const originalPromiseAll = unsafeWindow.Promise.all;
        let intercepted = false;

        unsafeWindow.Promise.all = async function(promises) {
            const result = originalPromiseAll.call(this, promises);

            if (!intercepted) {
                intercepted = true;

                return await new Promise((resolve) => {
                    result.then(([kit, app, ...args]) => {
                        log("SvelteKit modules loaded");

                        const [success, wrappedKit] = createKitProxy(kit);
                        if (success) {
                            // Restore original Promise.all
                            unsafeWindow.Promise.all = originalPromiseAll;

                            log("Wrapped kit ready:", wrappedKit, app);
                        }

                        resolve([wrappedKit, app, ...args]);
                    });
                });
            }

            return await result;
        };
    }

    // Initialize the bypass
    setupSvelteKitInterception();

    // Patched in 2 cpu cycles atp
    window.googletag = {cmd: [], _loaded_: true};

    // Define blocked ad classes and ids
    const blockedClasses = [
        "adsbygoogle",
        "adsense-wrapper",
        "inline-ad",
        "gpt-billboard-container"
    ];

    const blockedIds = [
        "billboard-1",
        "billboard-2",
        "billboard-3",
        "sidebar-ad-1",
        "skyscraper-ad-1"
    ];

    // Remove injected ads
    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (node.nodeType === 1) {
                    // Block by class
                    blockedClasses.forEach((cls) => {
                        // Direct match
                        if (node.classList?.contains(cls)) {
                            node.remove();
                            log("Removed injected ad by class:", node);
                        }
                        // Or children inside the node
                        node.querySelectorAll?.(`.${cls}`).forEach((el) => {
                            el.remove();
                            log("Removed nested ad:", el);
                        });
                    });
                    // Block by id
                    blockedIds.forEach((id) => {
                        // Direct match
                        if (node.id === id) {
                            node.remove();
                            log("Removed injected ad by id:", node);
                        }
                        // Or children inside the node
                        node.querySelectorAll?.(`#${id}`).forEach((el) => {
                            el.remove();
                            log("Removed nested ad:", el);
                        });
                    });
                }
            }
        }
    });

    // Start observing the document for changes
    observer.observe(unsafeWindow.document.documentElement, { childList: true, subtree: true });
})();
