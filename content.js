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
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 50%;
      background: #4a6cf7;
      color: #fff;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      opacity: 0; transform: scale(0.7);
      transition: opacity .15s ease, transform .15s ease;
      pointer-events: auto;
      border: none; padding: 0;
    }
    #${ICON_ID}.visible {
      opacity: 1; transform: scale(1);
    }
    #${ICON_ID}:hover {
      background: #3b5de7;
      transform: scale(1.1);
    }

    /* ── Tooltip panel ── */
    #${TOOLTIP_ID} {
      position: absolute;
      z-index: 2147483647;
      max-width: 420px; min-width: 200px;
      border-radius: 10px;
      background: rgba(10, 10, 30, 0.88);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: #fff;
      font: 14px/1.5 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      pointer-events: auto;
      user-select: text;
      box-shadow: 0 6px 24px rgba(0,0,0,0.4);
      opacity: 0; transform: translateY(6px);
      transition: opacity .18s ease, transform .18s ease;
      overflow: hidden;
    }
    #${TOOLTIP_ID}.visible {
      opacity: 1; transform: translateY(0);
    }

    /* Tooltip inner layout */
    .${PREFIX}header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px 6px;
      font-size: 11px; text-transform: uppercase; letter-spacing: .5px;
      color: rgba(255,255,255,0.4);
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .${PREFIX}body { padding: 10px 14px 14px; }
    .${PREFIX}row {
      display: flex; align-items: flex-start; gap: 8px;
      margin-bottom: 8px;
    }
    .${PREFIX}row:last-child { margin-bottom: 0; }
    .${PREFIX}label {
      flex-shrink: 0;
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .4px;
      color: rgba(255,255,255,0.35);
      padding-top: 3px; min-width: 30px;
    }
    .${PREFIX}text {
      font-size: 14px; line-height: 1.5;
      word-break: break-word;
    }
    .${PREFIX}translated {
      color: #4ecdc4; font-weight: 500;
    }
    .${PREFIX}original {
      color: rgba(255,255,255,0.7);
    }
    .${PREFIX}speak {
      flex-shrink: 0;
      background: none; border: none; color: rgba(255,255,255,0.45);
      cursor: pointer; padding: 2px; border-radius: 4px;
      display: flex; align-items: center; justify-content: center;
      transition: color .15s, background .15s;
    }
    .${PREFIX}speak:hover {
      color: #fff; background: rgba(255,255,255,0.1);
    }
    .${PREFIX}speak.speaking {
      color: #4ecdc4;
    }
    .${PREFIX}error {
      color: #ff6b6b; font-size: 13px; padding: 12px 14px;
    }
    .${PREFIX}loading {
      display: flex; align-items: center; gap: 10px;
      padding: 14px;
    }
    .${PREFIX}spinner {
      width: 18px; height: 18px;
      border: 2px solid rgba(255,255,255,0.15);
      border-top-color: #4a6cf7;
      border-radius: 50%;
      animation: ${PREFIX}spin .6s linear infinite;
    }
    @keyframes ${PREFIX}spin {
      to { transform: rotate(360deg); }
    }

    /* ── Save button ── */
    .${PREFIX}save-btn {
      display: flex; align-items: center; gap: 6px;
      margin-top: 8px; padding: 6px 12px;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 6px;
      color: rgba(255,255,255,0.6);
      font-size: 12px; cursor: pointer;
      transition: all .15s ease;
      width: 100%;
      justify-content: center;
    }
    .${PREFIX}save-btn:hover {
      background: rgba(255,255,255,0.12);
      color: #fff;
      border-color: rgba(255,255,255,0.2);
    }
    .${PREFIX}save-btn.saved {
      color: #4ecdc4;
      border-color: rgba(78,205,196,0.3);
      background: rgba(78,205,196,0.08);
    }
  `;
    document.head.appendChild(style);

    // ── State ──────────────────────────────────────────────────────
    let iconEl = null;
    let tooltipEl = null;
    let currentText = "";
    let currentRect = null;

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
        icon.style.left = `${rect.right + scrollX + 6}px`;
        icon.style.top = `${rect.top + scrollY + (rect.height - 32) / 2}px`;
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
        utter.rate = 0.95;
        window.speechSynthesis.speak(utter);
        return utter;
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
            `<div class="${PREFIX}loading"><div class="${PREFIX}spinner"></div> Tłumaczę…</div>`,
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
                    <button class="${PREFIX}save-btn" data-src="${escapeAttr(text)}" data-translated="${escapeAttr(translated)}" data-src-lang="${escapeAttr(srcLang)}" data-tgt-lang="${escapeAttr(targetLang)}" title="Zapisz do kolekcji">
                        ${SVG_SAVE} <span>Zapisz</span>
                    </button>
                </div>`;

            showTooltip(html, rect);

            // Attach TTS handlers
            tooltipEl.querySelectorAll(`.${PREFIX}speak`).forEach((btn) => {
                btn.addEventListener("click", (ev) => {
                    ev.stopPropagation();
                    const t = btn.getAttribute("data-text");
                    const l = btn.getAttribute("data-lang");
                    btn.classList.add("speaking");
                    const utter = speak(t, l);
                    utter.onend = () => btn.classList.remove("speaking");
                    utter.onerror = () => btn.classList.remove("speaking");
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
                    saveBtn.innerHTML = `${SVG_SAVE_CHECK} <span>Zapisano!</span>`;
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
})();
