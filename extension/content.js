// Bootstrap by loading settings and embedding script.
chrome.storage.sync.get({
    // Default values.
    behavior: "NEGATIVE_ONLY",
    scoring: "RICHTER",
    richterThresholdPositive: -6,
    richterThresholdNegative: 2,
    richterLevelGood: 0,
    richterLevelBad: 5,
    balancedThresholdPositive: 5000,
    balancedThresholdNegative: -50,
    balancedLevelGood: 1,
    balancedLevelBad: -99 
}, (options) => {
    document.body.setAttribute("ratiod-settings", JSON.stringify(options));
    
    const s = document.createElement("script");
    s.src = chrome.runtime.getURL("script.js");
    s.onload = function() {
        this.remove();
    };

    (document.head || document.documentElement).appendChild(s);
});