/**
 * Quick Translator – Content Script
 * Google Translate free API · TTS · floating translate icon + tooltip
 */

(() => {
    "use strict";

    // ── Constants ──────────────────────────────────────────────────
    const PREFIX = "__qt_";
    const ICON_ID = PREFIX + "icon";
    const TOOLTIP_ID = PREFIX + "tooltip";

    // ── SVG icons (inline) ─────────────────────────────────────────
    const SVG_TRANSLATE = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/></svg>`;

    const SVG_SPEAKER = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;

    const SVG_SAVE = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
    const SVG_SAVE_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#4ecdc4" stroke="#4ecdc4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;

    // ── CSS injection ──────────────────────────────────────────────
    const style = document.createElement("style");
    style.textContent = `
    /* ── Translate icon button ── */
    #${ICON_ID} {
      position: absolute;
      z-index: 2147483647;
      width: 34px; height: 34px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 12px;
      background: rgba(74, 108, 247, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: #fff;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(74,108,247,0.35), 0 0 0 1px rgba(255,255,255,0.1) inset;
      opacity: 0; transform: scale(0.6);
      transition: opacity .18s ease, transform .18s cubic-bezier(.34,1.56,.64,1);
      pointer-events: auto;
      border: 1px solid rgba(255,255,255,0.15);
      padding: 0;
    }
    #${ICON_ID}.visible {
      opacity: 1; transform: scale(1);
    }
    #${ICON_ID}:hover {
      background: rgba(59, 93, 231, 0.95);
      transform: scale(1.1);
      box-shadow: 0 6px 24px rgba(74,108,247,0.45), 0 0 0 1px rgba(255,255,255,0.15) inset;
    }

    /* ── Tooltip panel ── */
    #${TOOLTIP_ID} {
      position: absolute;
      z-index: 2147483647;
      max-width: 420px; min-width: 220px;
      border-radius: 16px;
      background: rgba(15, 15, 35, 0.75);
      backdrop-filter: blur(20px) saturate(1.4);
      -webkit-backdrop-filter: blur(20px) saturate(1.4);
      color: #fff;
      font: 14px/1.5 'Inter', -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      pointer-events: auto;
      user-select: text;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08) inset;
      border: 1px solid rgba(255,255,255,0.08);
      opacity: 0; transform: translateY(8px) scale(0.96);
      transition: opacity .2s ease, transform .2s cubic-bezier(.34,1.3,.64,1);
      overflow: hidden;
    }
    #${TOOLTIP_ID}.visible {
      opacity: 1; transform: translateY(0) scale(1);
    }

    /* Tooltip inner layout */
    .${PREFIX}header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px 8px;
      font-size: 11px; text-transform: uppercase; letter-spacing: .8px;
      font-weight: 600;
      color: rgba(255,255,255,0.35);
      border-bottom: 1px solid rgba(255,255,255,0.06);
      background: rgba(255,255,255,0.02);
    }
    .${PREFIX}body { padding: 12px 14px 14px; }
    .${PREFIX}row {
      display: flex; align-items: flex-start; gap: 8px;
      margin-bottom: 8px;
    }
    .${PREFIX}row:last-child { margin-bottom: 0; }
    .${PREFIX}label {
      flex-shrink: 0;
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .4px;
      color: rgba(255,255,255,0.3);
      padding-top: 3px; min-width: 30px;
    }
    .${PREFIX}text {
      font-size: 14px; line-height: 1.5;
      word-break: break-word;
    }
    .${PREFIX}translated {
      color: #4ecdc4; font-weight: 600;
    }
    .${PREFIX}original {
      color: rgba(255,255,255,0.65);
    }
    .${PREFIX}speak {
      flex-shrink: 0;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.4);
      cursor: pointer; padding: 4px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      transition: all .2s ease;
    }
    .${PREFIX}speak:hover {
      color: #fff; background: rgba(255,255,255,0.1);
      border-color: rgba(255,255,255,0.15);
    }
    .${PREFIX}speak.speaking {
      color: #4ecdc4;
      border-color: rgba(78,205,196,0.3);
      background: rgba(78,205,196,0.1);
    }
    .${PREFIX}error {
      color: #ff6b6b; font-size: 13px; padding: 12px 14px;
    }
    .${PREFIX}loading {
      display: flex; align-items: center; gap: 10px;
      padding: 14px;
      color: rgba(255,255,255,0.5);
      font-size: 13px;
    }
    .${PREFIX}spinner {
      width: 18px; height: 18px;
      border: 2px solid rgba(255,255,255,0.1);
      border-top-color: #4a6cf7;
      border-radius: 50%;
      animation: ${PREFIX}spin .6s linear infinite;
    }
    @keyframes ${PREFIX}spin {
      to { transform: rotate(360deg); }
    }

    /* ── Save button (icon-only in header) ── */
    .${PREFIX}save-btn {
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.35);
      cursor: pointer; padding: 4px; border-radius: 8px;
      transition: all .2s ease;
      flex-shrink: 0;
    }
    .${PREFIX}save-btn:hover {
      color: #fff;
      background: rgba(255,255,255,0.1);
      border-color: rgba(255,255,255,0.15);
      transform: scale(1.1);
    }
    .${PREFIX}save-btn.saved {
      color: #4ecdc4;
      border-color: rgba(78,205,196,0.3);
      background: rgba(78,205,196,0.1);
    }

    /* ── YouTube CC subtitle click-to-translate ── */
    .ytp-caption-segment.${PREFIX}clickable {
      cursor: pointer !important;
      border-radius: 3px;
      transition: background .15s ease, box-shadow .15s ease;
      position: relative;
    }
    .ytp-caption-segment.${PREFIX}clickable:hover {
      background: rgba(74, 108, 247, 0.45) !important;
      box-shadow: 0 0 0 3px rgba(74, 108, 247, 0.3);
    }
    .ytp-caption-segment.${PREFIX}clickable::after {
      content: '⟶';
      position: absolute;
      right: -20px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 12px;
      color: rgba(74, 108, 247, 0.8);
      opacity: 0;
      transition: opacity .15s ease;
      pointer-events: none;
    }
    .ytp-caption-segment.${PREFIX}clickable:hover::after {
      opacity: 1;
    }

    /* YouTube subtitle tooltip adjustments */
    .${PREFIX}yt-sub-hint {
      position: fixed;
      z-index: 2147483647;
      bottom: 90px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(74, 108, 247, 0.9);
      color: #fff;
      font-size: 12px;
      padding: 6px 14px;
      border-radius: 20px;
      pointer-events: none;
      opacity: 0;
      transition: opacity .4s ease;
      white-space: nowrap;
    }
    .${PREFIX}yt-sub-hint.visible {
      opacity: 1;
    }
  `;
    document.head.appendChild(style);

    // ── State ──────────────────────────────────────────────────────
    let iconEl = null;
    let tooltipEl = null;
    let currentText = "";
    let currentRect = null;
    let lastMouseX = 0;
    let lastMouseY = 0;

    // Track mouse position for smart icon placement
    document.addEventListener("mousemove", (e) => {
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    // ── Helpers: Icon ──────────────────────────────────────────────
    function getIcon() {
        if (iconEl) return iconEl;
        iconEl = document.createElement("div");
        iconEl.id = ICON_ID;
        iconEl.innerHTML = SVG_TRANSLATE;
        iconEl.title = "Przetłumacz";
        document.body.appendChild(iconEl);
        iconEl.addEventListener("click", onIconClick);
        return iconEl;
    }

    function showIcon(rect) {
        const icon = getIcon();
        icon.classList.remove("visible");

        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        const ICON_SIZE = 34;
        const GAP = 8;
        const vpW = document.documentElement.clientWidth;
        const vpH = document.documentElement.clientHeight;

        // Mouse position in page coords
        const mx = lastMouseX;
        const my = lastMouseY;

        // Selection rect in viewport coords
        const selTop = rect.top;
        const selBottom = rect.bottom;
        const selLeft = rect.left;
        const selRight = rect.right;

        // Try positions in order: right of mouse, left of mouse, below, above
        // Always avoid overlapping the selected text rect
        let bestX = mx + GAP;
        let bestY = my - ICON_SIZE / 2;

        // Check if icon at (bestX, bestY) overlaps selection
        function overlapsSelection(ix, iy) {
            const iconRight = ix + ICON_SIZE;
            const iconBottom = iy + ICON_SIZE;
            return !(
                ix > selRight ||
                iconRight < selLeft ||
                iy > selBottom ||
                iconBottom < selTop
            );
        }

        // Strategy 1: Right of mouse, vertically centered on mouse
        if (bestX + ICON_SIZE <= vpW && !overlapsSelection(bestX, bestY)) {
            // good
        }
        // Strategy 2: Left of mouse
        else if (
            mx - GAP - ICON_SIZE >= 0 &&
            !overlapsSelection(mx - GAP - ICON_SIZE, bestY)
        ) {
            bestX = mx - GAP - ICON_SIZE;
        }
        // Strategy 3: Below selection, horizontally near mouse
        else if (selBottom + GAP + ICON_SIZE <= vpH) {
            bestX = Math.max(
                4,
                Math.min(mx - ICON_SIZE / 2, vpW - ICON_SIZE - 4),
            );
            bestY = selBottom + GAP;
        }
        // Strategy 4: Above selection
        else if (selTop - GAP - ICON_SIZE >= 0) {
            bestX = Math.max(
                4,
                Math.min(mx - ICON_SIZE / 2, vpW - ICON_SIZE - 4),
            );
            bestY = selTop - GAP - ICON_SIZE;
        }
        // Fallback: right of selection
        else {
            bestX = selRight + GAP;
            bestY = selTop + (rect.height - ICON_SIZE) / 2;
        }

        // Clamp to viewport
        bestX = Math.max(4, Math.min(bestX, vpW - ICON_SIZE - 4));
        bestY = Math.max(4, Math.min(bestY, vpH - ICON_SIZE - 4));

        icon.style.left = `${bestX + scrollX}px`;
        icon.style.top = `${bestY + scrollY}px`;

        requestAnimationFrame(() => icon.classList.add("visible"));
    }

    function hideIcon() {
        if (iconEl) iconEl.classList.remove("visible");
    }

    // ── Helpers: Tooltip ───────────────────────────────────────────
    function getTooltip() {
        if (tooltipEl) return tooltipEl;
        tooltipEl = document.createElement("div");
        tooltipEl.id = TOOLTIP_ID;
        document.body.appendChild(tooltipEl);
        return tooltipEl;
    }

    function showTooltip(html, rect) {
        const tip = getTooltip();
        tip.innerHTML = html;
        tip.classList.remove("visible");

        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        const gap = 10;

        tip.style.left = "0px";
        tip.style.top = "0px";

        const tipRect = tip.getBoundingClientRect();

        let left = rect.left + scrollX + (rect.width - tipRect.width) / 2;
        let top = rect.top + scrollY - tipRect.height - gap;

        left = Math.max(
            scrollX + 4,
            Math.min(
                left,
                scrollX +
                    document.documentElement.clientWidth -
                    tipRect.width -
                    4,
            ),
        );

        if (top < scrollY + 4) {
            top = rect.bottom + scrollY + gap;
        }

        tip.style.left = `${left}px`;
        tip.style.top = `${top}px`;

        requestAnimationFrame(() => tip.classList.add("visible"));
    }

    function hideTooltip() {
        if (tooltipEl) {
            tooltipEl.classList.remove("visible");
            setTimeout(() => {
                if (tooltipEl) tooltipEl.innerHTML = "";
            }, 180);
        }
    }

    function hideAll() {
        hideIcon();
        hideTooltip();
    }

    // ── Google Translate (free, no key) ────────────────────────────
    async function googleTranslate(text, targetLang) {
        const url =
            "https://translate.googleapis.com/translate_a/single" +
            "?client=gtx&sl=auto&tl=" +
            encodeURIComponent(targetLang) +
            "&dt=t&q=" +
            encodeURIComponent(text);

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // data[0] is array of [translatedChunk, originalChunk, …]
        const translated = data[0].map((s) => s[0]).join("");
        const detectedLang = data[2] || "auto";
        return { translated, detectedLang };
    }

    // ── TTS (Web Speech API) ───────────────────────────────────────
    function speak(text, lang) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = lang;

        // Apply stored voice/pitch/rate settings
        return new Promise((resolve) => {
            if (chrome?.storage?.sync) {
                chrome.storage.sync.get(
                    { speechVoice: "", speechRate: 0.95 },
                    (data) => {
                        utter.rate = data.speechRate;
                        if (data.speechVoice) {
                            const voices = window.speechSynthesis.getVoices();
                            const match = voices.find(
                                (v) => v.name === data.speechVoice,
                            );
                            if (match) utter.voice = match;
                        }
                        window.speechSynthesis.speak(utter);
                        resolve(utter);
                    },
                );
            } else {
                utter.rate = 0.95;
                window.speechSynthesis.speak(utter);
                resolve(utter);
            }
        });
    }

    // ── Target language from settings ──────────────────────────────
    function getTargetLang() {
        return new Promise((resolve) => {
            if (chrome?.storage?.sync) {
                chrome.storage.sync.get({ targetLang: "pl" }, (d) =>
                    resolve(d.targetLang),
                );
            } else {
                resolve("pl");
            }
        });
    }

    // ── Language code → display name ───────────────────────────────
    const LANG_NAMES = {
        pl: "PL",
        en: "EN",
        de: "DE",
        fr: "FR",
        es: "ES",
        it: "IT",
        pt: "PT",
        uk: "UK",
        ru: "RU",
        cs: "CZ",
        nl: "NL",
        sv: "SV",
        ja: "JA",
        ko: "KO",
        zh: "ZH",
        ar: "AR",
        hi: "HI",
        tr: "TR",
    };

    function langTag(code) {
        return LANG_NAMES[code] || code?.toUpperCase() || "?";
    }

    // ── Icon click → translate ─────────────────────────────────────
    async function onIconClick(e) {
        e.stopPropagation();
        e.preventDefault();

        if (!currentText || !currentRect) return;

        const text = currentText;
        const rect = currentRect;

        hideIcon();

        // Show loading
        showTooltip(
            `<div class="${PREFIX}loading"><div class="${PREFIX}spinner">`,
            rect,
        );

        try {
            const targetLang = await getTargetLang();
            const { translated, detectedLang } = await googleTranslate(
                text,
                targetLang,
            );

            const srcLang =
                typeof detectedLang === "string" ? detectedLang : "auto";

            const html = `
                <div class="${PREFIX}header">
                    <span>${langTag(srcLang)} → ${langTag(targetLang)}</span>
                    <button class="${PREFIX}save-btn" data-src="${escapeAttr(text)}" data-translated="${escapeAttr(translated)}" data-src-lang="${escapeAttr(srcLang)}" data-tgt-lang="${escapeAttr(targetLang)}" title="Zapisz do kolekcji">${SVG_SAVE}</button>
                </div>
                <div class="${PREFIX}body">
                    <div class="${PREFIX}row">
                        <span class="${PREFIX}label">${langTag(srcLang)}</span>
                        <span class="${PREFIX}text ${PREFIX}original">${escapeHtml(text)}</span>
                        <button class="${PREFIX}speak" data-text="${escapeAttr(text)}" data-lang="${escapeAttr(srcLang)}" title="Odczytaj oryginał">${SVG_SPEAKER}</button>
                    </div>
                    <div class="${PREFIX}row">
                        <span class="${PREFIX}label">${langTag(targetLang)}</span>
                        <span class="${PREFIX}text ${PREFIX}translated">${escapeHtml(translated)}</span>
                        <button class="${PREFIX}speak" data-text="${escapeAttr(translated)}" data-lang="${escapeAttr(targetLang)}" title="Odczytaj tłumaczenie">${SVG_SPEAKER}</button>
                    </div>
                </div>`;

            showTooltip(html, rect);

            // Attach TTS handlers
            tooltipEl.querySelectorAll(`.${PREFIX}speak`).forEach((btn) => {
                btn.addEventListener("click", (ev) => {
                    ev.stopPropagation();
                    const t = btn.getAttribute("data-text");
                    const l = btn.getAttribute("data-lang");
                    btn.classList.add("speaking");
                    speak(t, l).then((utter) => {
                        utter.onend = () => btn.classList.remove("speaking");
                        utter.onerror = () => btn.classList.remove("speaking");
                    });
                });
            });

            // Attach save handler
            const saveBtn = tooltipEl.querySelector(`.${PREFIX}save-btn`);
            if (saveBtn) {
                saveBtn.addEventListener("click", (ev) => {
                    ev.stopPropagation();
                    saveWord({
                        original: saveBtn.getAttribute("data-src"),
                        translated: saveBtn.getAttribute("data-translated"),
                        srcLang: saveBtn.getAttribute("data-src-lang"),
                        tgtLang: saveBtn.getAttribute("data-tgt-lang"),
                        url: window.location.href,
                        timestamp: Date.now(),
                        downloaded: false,
                    });
                    saveBtn.innerHTML = SVG_SAVE_CHECK;
                    saveBtn.classList.add("saved");
                });
            }
        } catch (err) {
            console.error("[Quick Translator]", err);
            showTooltip(
                `<div class="${PREFIX}error">⚠ ${escapeHtml(err.message)}</div>`,
                rect,
            );
        }
    }

    // ── Selection listener (mouseup covers both dblclick & drag) ──
    document.addEventListener("mouseup", (e) => {
        // Ignore clicks inside our own UI
        if (iconEl?.contains(e.target) || tooltipEl?.contains(e.target)) return;

        // Small delay to let selection finalize
        setTimeout(() => {
            const selection = window.getSelection();
            const text = selection?.toString().trim();

            if (!text || text.length === 0 || text.length > 5000) {
                hideAll();
                return;
            }

            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) return;

            currentText = text;
            currentRect = rect;

            hideTooltip();
            showIcon(rect);
        }, 10);
    });

    // ── Click-away to dismiss ──────────────────────────────────────
    document.addEventListener("mousedown", (e) => {
        if (iconEl?.contains(e.target) || tooltipEl?.contains(e.target)) return;
        hideAll();
    });

    // ── Escape to dismiss ──────────────────────────────────────────
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") hideAll();
    });

    // ── Save word to storage ───────────────────────────────────────
    function saveWord(entry) {
        if (!chrome?.storage?.local) return;
        chrome.storage.local.get({ savedWords: [] }, (data) => {
            const words = data.savedWords || [];
            // Avoid exact duplicates (same original + translated)
            const exists = words.some(
                (w) =>
                    w.original === entry.original &&
                    w.translated === entry.translated,
            );
            if (!exists) {
                words.push(entry);
                chrome.storage.local.set({ savedWords: words });
            }
        });
    }

    // ── Utils ──────────────────────────────────────────────────────
    function escapeHtml(str) {
        const d = document.createElement("div");
        d.textContent = str;
        return d.innerHTML;
    }

    function escapeAttr(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    // ══════════════════════════════════════════════════════════════
    // ── YouTube CC Subtitle Click-to-Translate ────────────────────
    // ══════════════════════════════════════════════════════════════

    const isYouTube = window.location.hostname.includes("youtube.com");

    if (isYouTube) {
        let ytHintEl = null;
        let ytHintTimer = null;

        function showYTHint(msg) {
            if (!ytHintEl) {
                ytHintEl = document.createElement("div");
                ytHintEl.className = `${PREFIX}yt-sub-hint`;
                document.body.appendChild(ytHintEl);
            }
            ytHintEl.textContent = msg;
            ytHintEl.classList.add("visible");
            clearTimeout(ytHintTimer);
            ytHintTimer = setTimeout(() => {
                ytHintEl.classList.remove("visible");
            }, 3000);
        }

        // Translation cache to avoid repeated API calls on hover
        let ytTranslateCache = new Map();
        let ytHoverTimer = null;
        let ytIsHovering = false;
        let ytWasPlayingBeforeHover = false;

        async function cachedTranslate(text, targetLang) {
            const key = `${text}|${targetLang}`;
            if (ytTranslateCache.has(key)) return ytTranslateCache.get(key);
            const result = await googleTranslate(text, targetLang);
            ytTranslateCache.set(key, result);
            if (ytTranslateCache.size > 200) {
                const first = ytTranslateCache.keys().next().value;
                ytTranslateCache.delete(first);
            }
            return result;
        }

        // Build tooltip HTML
        function buildYTTooltipHtml(
            srcLang,
            targetLang,
            original,
            translated,
            fullLine,
            fullTranslated,
        ) {
            let fullLineHtml = "";
            if (fullLine && fullTranslated) {
                fullLineHtml = `
                    <div class="${PREFIX}row" style="margin-top:6px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.1);">
                        <span class="${PREFIX}label">ALL</span>
                        <span class="${PREFIX}text ${PREFIX}original" style="font-size:12px;">${escapeHtml(fullLine)}</span>
                    </div>
                    <div class="${PREFIX}row">
                        <span class="${PREFIX}label"></span>
                        <span class="${PREFIX}text ${PREFIX}translated" style="font-size:12px;">${escapeHtml(fullTranslated)}</span>
                    </div>`;
            }
            return `
                <div class="${PREFIX}header">
                    <span>${langTag(srcLang)} → ${langTag(targetLang)}</span>
                    <button class="${PREFIX}save-btn" data-src="${escapeAttr(original)}" data-translated="${escapeAttr(translated)}" data-src-lang="${escapeAttr(srcLang)}" data-tgt-lang="${escapeAttr(targetLang)}" title="Zapisz do kolekcji">${SVG_SAVE}</button>
                </div>
                <div class="${PREFIX}body">
                    <div class="${PREFIX}row">
                        <span class="${PREFIX}label">${langTag(srcLang)}</span>
                        <span class="${PREFIX}text ${PREFIX}original">${escapeHtml(original)}</span>
                        <button class="${PREFIX}speak" data-text="${escapeAttr(original)}" data-lang="${escapeAttr(srcLang)}" title="Odczytaj oryginał">${SVG_SPEAKER}</button>
                    </div>
                    <div class="${PREFIX}row">
                        <span class="${PREFIX}label">${langTag(targetLang)}</span>
                        <span class="${PREFIX}text ${PREFIX}translated">${escapeHtml(translated)}</span>
                        <button class="${PREFIX}speak" data-text="${escapeAttr(translated)}" data-lang="${escapeAttr(targetLang)}" title="Odczytaj tłumaczenie">${SVG_SPEAKER}</button>
                    </div>
                    ${fullLineHtml}
                </div>`;
        }

        // Attach TTS + save handlers to tooltip buttons
        function attachYTTooltipHandlers() {
            if (!tooltipEl) return;
            tooltipEl.querySelectorAll(`.${PREFIX}speak`).forEach((btn) => {
                btn.addEventListener("click", (ev) => {
                    ev.stopPropagation();
                    const t = btn.getAttribute("data-text");
                    const l = btn.getAttribute("data-lang");
                    btn.classList.add("speaking");
                    speak(t, l).then((utter) => {
                        utter.onend = () => btn.classList.remove("speaking");
                        utter.onerror = () => btn.classList.remove("speaking");
                    });
                });
            });
            const saveBtn = tooltipEl.querySelector(`.${PREFIX}save-btn`);
            if (saveBtn) {
                saveBtn.addEventListener("click", (ev) => {
                    ev.stopPropagation();
                    saveWord({
                        original: saveBtn.getAttribute("data-src"),
                        translated: saveBtn.getAttribute("data-translated"),
                        srcLang: saveBtn.getAttribute("data-src-lang"),
                        tgtLang: saveBtn.getAttribute("data-tgt-lang"),
                        url: window.location.href,
                        timestamp: Date.now(),
                        downloaded: false,
                    });
                    saveBtn.innerHTML = SVG_SAVE_CHECK;
                    saveBtn.classList.add("saved");
                });
            }
        }

        // Make subtitle segment interactive: HOVER = translate, CLICK = speak + full sentence
        function makeSubtitleClickable(el) {
            if (el.dataset[PREFIX + "bound"]) return;
            el.dataset[PREFIX + "bound"] = "1";
            el.classList.add(`${PREFIX}clickable`);

            // ── HOVER → translate fragment ──
            el.addEventListener("mouseenter", async () => {
                ytIsHovering = true;
                clearTimeout(ytHoverTimer);

                // Pause video on hover
                const video = document.querySelector("video");
                if (video && !video.paused) {
                    ytWasPlayingBeforeHover = true;
                    video.pause();
                }

                const word = el.textContent.trim();
                if (!word) return;

                const rect = el.getBoundingClientRect();
                currentText = word;
                currentRect = rect;

                // Debounce 250ms to avoid flicker
                ytHoverTimer = setTimeout(async () => {
                    if (!ytIsHovering) return;

                    showTooltip(
                        `<div class="${PREFIX}loading"><div class="${PREFIX}spinner"></div> Tłumaczę…</div>`,
                        rect,
                    );

                    try {
                        const targetLang = await getTargetLang();
                        const { translated, detectedLang } =
                            await cachedTranslate(word, targetLang);
                        const srcLang =
                            typeof detectedLang === "string"
                                ? detectedLang
                                : "auto";

                        if (!ytIsHovering) return;

                        const html = buildYTTooltipHtml(
                            srcLang,
                            targetLang,
                            word,
                            translated,
                            null,
                            null,
                        );
                        showTooltip(html, rect);
                        attachYTTooltipHandlers();
                    } catch (err) {
                        console.error("[Quick Translator – YT CC hover]", err);
                        showTooltip(
                            `<div class="${PREFIX}error">⚠ ${escapeHtml(err.message)}</div>`,
                            rect,
                        );
                    }
                }, 250);
            });

            el.addEventListener("mouseleave", () => {
                ytIsHovering = false;
                clearTimeout(ytHoverTimer);
                // Delay hiding so user can interact with tooltip
                setTimeout(() => {
                    if (!ytIsHovering && !tooltipEl?.matches(":hover")) {
                        hideTooltip();
                        // Resume video if it was playing before hover
                        if (ytWasPlayingBeforeHover) {
                            ytWasPlayingBeforeHover = false;
                            const video = document.querySelector("video");
                            if (video && video.paused) video.play();
                        }
                    }
                }, 400);
            });

            // ── CLICK → speak fragment + translate full sentence ──
            el.addEventListener("click", async (e) => {
                e.stopPropagation();
                e.preventDefault();
                ytIsHovering = true; // keep tooltip visible
                clearTimeout(ytHoverTimer);

                const clickedWord = el.textContent.trim();
                if (!clickedWord) return;

                // Gather full line from all segments
                const container =
                    el.closest(".captions-text") ||
                    el.closest(".ytp-caption-window-container") ||
                    el.parentElement;
                const segments = container
                    ? container.querySelectorAll(".ytp-caption-segment")
                    : [el];
                const fullLine = Array.from(segments)
                    .map((s) => s.textContent)
                    .join(" ")
                    .trim();

                // Pause the video
                const video = document.querySelector("video");
                const wasPlaying = video && !video.paused;
                if (wasPlaying) video.pause();

                const rect = el.getBoundingClientRect();
                currentText = clickedWord;
                currentRect = rect;

                try {
                    const targetLang = await getTargetLang();
                    const { translated: wordTranslated, detectedLang } =
                        await cachedTranslate(clickedWord, targetLang);
                    const srcLang =
                        typeof detectedLang === "string"
                            ? detectedLang
                            : "auto";

                    // Speak the clicked fragment immediately
                    speak(clickedWord, srcLang);

                    // Show loading for full sentence
                    showTooltip(
                        `<div class="${PREFIX}loading"><div class="${PREFIX}spinner"></div> Tłumaczę całe zdanie…</div>`,
                        rect,
                    );

                    // Translate full line
                    let fullTranslated = null;
                    const showFullLine = fullLine && fullLine !== clickedWord;
                    if (showFullLine) {
                        const result = await cachedTranslate(
                            fullLine,
                            targetLang,
                        );
                        fullTranslated = result.translated;
                    }

                    const html = buildYTTooltipHtml(
                        srcLang,
                        targetLang,
                        clickedWord,
                        wordTranslated,
                        showFullLine ? fullLine : null,
                        fullTranslated,
                    );

                    showTooltip(html, rect);
                    attachYTTooltipHandlers();
                } catch (err) {
                    console.error("[Quick Translator – YT CC click]", err);
                    showTooltip(
                        `<div class="${PREFIX}error">⚠ ${escapeHtml(err.message)}</div>`,
                        rect,
                    );
                }
            });
        }

        // Observe DOM for subtitle elements appearing
        function observeSubtitles() {
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType !== 1) continue;
                        // Direct match
                        if (node.classList?.contains("ytp-caption-segment")) {
                            makeSubtitleClickable(node);
                        }
                        // Children match

                        const segments =
                            node.querySelectorAll?.(".ytp-caption-segment") ||
                            [];
                        segments.forEach(makeSubtitleClickable);
                    }
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });

            // Also process any subtitles already on the page
            document
                .querySelectorAll(".ytp-caption-segment")
                .forEach(makeSubtitleClickable);
        }

        // Start observing when YouTube player is ready
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => {
                observeSubtitles();
                showYTHint(
                    "Najedź na napisy CC = tłumaczenie · Kliknij = wymów + całe zdanie ✨",
                );
            });
        } else {
            observeSubtitles();
            showYTHint(
                "Najedź na napisy CC = tłumaczenie · Kliknij = wymów + całe zdanie ✨",
            );
        }

        // Re-observe on YouTube SPA navigation
        let lastUrl = location.href;
        new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                setTimeout(() => {
                    document
                        .querySelectorAll(".ytp-caption-segment")
                        .forEach(makeSubtitleClickable);
                }, 2000);
            }
        }).observe(document.body, { childList: true, subtree: true });
    }
})();
