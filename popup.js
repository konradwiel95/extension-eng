// popup.js – saves target language to chrome.storage.sync

const select = document.getElementById("targetLang");
const savedMsg = document.getElementById("saved");

// Load saved value
chrome.storage.sync.get({ targetLang: "pl" }, (data) => {
    select.value = data.targetLang;
});

// Save on change
select.addEventListener("change", () => {
    const lang = select.value;
    chrome.storage.sync.set({ targetLang: lang }, () => {
        savedMsg.classList.add("show");
        setTimeout(() => savedMsg.classList.remove("show"), 1500);
    });
});
