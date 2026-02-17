// popup.js – Settings, saved words list, filtering & export (Anki / CSV)

// ── Elements ──────────────────────────────────────────────────────
const select = document.getElementById("targetLang");
const savedMsg = document.getElementById("saved");
const wordListEl = document.getElementById("wordList");
const statsEl = document.getElementById("stats");

// ── Tab switching ─────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
        document
            .querySelectorAll(".tab")
            .forEach((t) => t.classList.remove("active"));
        document
            .querySelectorAll(".tab-content")
            .forEach((c) => c.classList.remove("active"));
        tab.classList.add("active");
        document
            .getElementById("tab-" + tab.dataset.tab)
            .classList.add("active");
        if (tab.dataset.tab === "words") loadWords();
    });
});

// ── Settings: load & save language ────────────────────────────────
chrome.storage.sync.get({ targetLang: "pl" }, (data) => {
    select.value = data.targetLang;
});

select.addEventListener("change", () => {
    chrome.storage.sync.set({ targetLang: select.value }, () => {
        savedMsg.classList.add("show");
        setTimeout(() => savedMsg.classList.remove("show"), 1500);
    });
});

// ── Filter state ──────────────────────────────────────────────────
let currentFilter = "all";

document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        document
            .querySelectorAll(".filter-btn")
            .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        loadWords();
    });
});

// ── Time helpers ──────────────────────────────────────────────────
function startOfDay() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}
function startOfWeek() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
    return d.getTime();
}
function startOfMonth() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(1);
    return d.getTime();
}

// ── Filter words ──────────────────────────────────────────────────
function filterWords(words) {
    switch (currentFilter) {
        case "today":
            return words.filter((w) => w.timestamp >= startOfDay());
        case "week":
            return words.filter((w) => w.timestamp >= startOfWeek());
        case "month":
            return words.filter((w) => w.timestamp >= startOfMonth());
        case "new":
            return words.filter((w) => !w.downloaded);
        default:
            return words;
    }
}

// ── Load & render words ───────────────────────────────────────────
function loadWords() {
    chrome.storage.local.get({ savedWords: [] }, (data) => {
        const all = data.savedWords || [];
        const filtered = filterWords(all);

        statsEl.textContent = `${filtered.length} z ${all.length} słów`;

        if (filtered.length === 0) {
            wordListEl.innerHTML = `
                <div class="empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                    <div>Brak zapisanych słów</div>
                </div>`;
            return;
        }

        // Sort newest first
        const sorted = [...filtered].sort((a, b) => b.timestamp - a.timestamp);

        wordListEl.innerHTML = sorted
            .map((w, i) => {
                const date = new Date(w.timestamp).toLocaleDateString("pl-PL", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                });
                const isNew = !w.downloaded ? " new-item" : "";
                return `<div class="word-item${isNew}" data-index="${i}">
                    <div class="wi-texts">
                        <div class="wi-original">${escapeHtml(w.original)}</div>
                        <div class="wi-translated">${escapeHtml(w.translated)}</div>
                        <div class="wi-meta">${date} · ${(w.srcLang || "?").toUpperCase()}→${(w.tgtLang || "?").toUpperCase()}</div>
                    </div>
                    <button class="wi-delete" data-original="${escapeAttr(w.original)}" data-ts="${w.timestamp}" title="Usuń">✕</button>
                </div>`;
            })
            .join("");

        // Delete handlers
        wordListEl.querySelectorAll(".wi-delete").forEach((btn) => {
            btn.addEventListener("click", () => {
                const orig = btn.dataset.original;
                const ts = parseInt(btn.dataset.ts);
                deleteWord(orig, ts);
            });
        });
    });
}

// ── Delete word ───────────────────────────────────────────────────
function deleteWord(original, timestamp) {
    chrome.storage.local.get({ savedWords: [] }, (data) => {
        const words = data.savedWords.filter(
            (w) => !(w.original === original && w.timestamp === timestamp),
        );
        chrome.storage.local.set({ savedWords: words }, loadWords);
    });
}

// ── Export: Anki (.txt tab-separated) ─────────────────────────────
document.getElementById("exportAnki").addEventListener("click", () => {
    chrome.storage.local.get({ savedWords: [] }, (data) => {
        const words = filterWords(data.savedWords || []);
        if (words.length === 0) return;

        // Anki format: front<TAB>back (one card per line)
        const lines = words.map((w) => `${w.original}\t${w.translated}`);
        const content = lines.join("\n");
        downloadFile(content, `anki-export-${dateTag()}.txt`, "text/plain");

        // Mark as downloaded
        markAsDownloaded(words, data.savedWords);
    });
});

// ── Export: CSV (Excel) ───────────────────────────────────────────
document.getElementById("exportCsv").addEventListener("click", () => {
    chrome.storage.local.get({ savedWords: [] }, (data) => {
        const words = filterWords(data.savedWords || []);
        if (words.length === 0) return;

        // BOM for Excel UTF-8
        const BOM = "\uFEFF";
        const header = "Oryginał;Tłumaczenie;Język źr.;Język doc.;Data;URL";
        const rows = words.map((w) => {
            const date = new Date(w.timestamp).toLocaleString("pl-PL");
            return [
                csvCell(w.original),
                csvCell(w.translated),
                w.srcLang || "",
                w.tgtLang || "",
                date,
                w.url || "",
            ].join(";");
        });
        const content = BOM + header + "\n" + rows.join("\n");
        downloadFile(
            content,
            `translator-export-${dateTag()}.csv`,
            "text/csv;charset=utf-8",
        );

        // Mark as downloaded
        markAsDownloaded(words, data.savedWords);
    });
});

// ── Clear visible words ───────────────────────────────────────────
document.getElementById("clearAll").addEventListener("click", () => {
    if (!confirm("Usunąć widoczne słowa?")) return;
    chrome.storage.local.get({ savedWords: [] }, (data) => {
        const toRemove = new Set(
            filterWords(data.savedWords).map(
                (w) => w.original + "|" + w.timestamp,
            ),
        );
        const remaining = data.savedWords.filter(
            (w) => !toRemove.has(w.original + "|" + w.timestamp),
        );
        chrome.storage.local.set({ savedWords: remaining }, loadWords);
    });
});

// ── Mark exported words as downloaded ─────────────────────────────
function markAsDownloaded(exportedWords, allWords) {
    const exportedSet = new Set(
        exportedWords.map((w) => w.original + "|" + w.timestamp),
    );
    const updated = allWords.map((w) => {
        if (exportedSet.has(w.original + "|" + w.timestamp)) {
            return { ...w, downloaded: true };
        }
        return w;
    });
    chrome.storage.local.set({ savedWords: updated }, loadWords);
}

// ── Download helper ───────────────────────────────────────────────
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ── Utils ─────────────────────────────────────────────────────────
function dateTag() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function csvCell(str) {
    if (str.includes(";") || str.includes('"') || str.includes("\n")) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

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
