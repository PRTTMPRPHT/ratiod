const BEHAVIOR_DEFAULT = "NEGATIVE_ONLY";
const SCORING_DEFAULT = "RICHTER";
const RICHTER_THRESHOLD_POSITIVE_DEFAULT = -6;
const RICHTER_THRESHOLD_NEGATIVE_DEFAULT = 2;
const RICHTER_LEVEL_GOOD_DEFAULT = 0;
const RICHTER_LEVEL_BAD_DEFAULT = 5;
const BALANCED_THRESHOLD_POSITIVE_DEFAULT = 5000;
const BALANCED_THRESHOLD_NEGATIVE_DEFAULT = -50;
const BALANCED_LEVEL_GOOD_DEFAULT = 1;
const BALANCED_LEVEL_BAD_DEFAULT = -99;

function saveOptions() {
    const behavior = document.getElementById("only-negative").checked ? "NEGATIVE_ONLY" : "BOTH";
    const scoring = document.getElementById("richter").checked ? "RICHTER" : "BALANCED";

    const richterThresholdPositive = parseInt(document.getElementById("richter-threshold-positive").value, 10)
    const richterThresholdNegative = parseInt(document.getElementById("richter-threshold-negative").value, 10)
    const richterLevelGood = parseInt(document.getElementById("richter-threshold-good-tweet-max").value, 10)
    const richterLevelBad = parseInt(document.getElementById("richter-threshold-bad-tweet-max").value, 10)

    const balancedThresholdPositive = parseInt(document.getElementById("balanced-threshold-positive").value, 10)
    const balancedThresholdNegative = parseInt(document.getElementById("balanced-threshold-negative").value, 10)
    const balancedLevelGood = parseInt(document.getElementById("balanced-threshold-good-tweet-min").value, 10)
    const balancedLevelBad = parseInt(document.getElementById("balanced-threshold-bad-tweet-min").value, 10)
    
    chrome.storage.sync.set({
        behavior,
        scoring,
        richterThresholdPositive,
        richterThresholdNegative,
        richterLevelGood,
        richterLevelBad,
        balancedThresholdPositive,
        balancedThresholdNegative,
        balancedLevelGood,
        balancedLevelBad
    }, () => {
      // Update status to let user know options were saved.
      const status = document.getElementById("status");
      status.textContent = "Options saved. Changes require reload of twitter pages.";
      setTimeout(() => status.textContent = "", 1000);
    });

    restoreOptionsFromStorage(); // To ensure it is really perfectly synced now.
}

function restoreDefaults() {
    document.getElementById("only-negative").checked = true;
    document.getElementById("richter").checked = true;

    document.getElementById("richter-threshold-positive").value = RICHTER_THRESHOLD_POSITIVE_DEFAULT;
    document.getElementById("richter-threshold-negative").value = RICHTER_THRESHOLD_NEGATIVE_DEFAULT;
    document.getElementById("richter-threshold-good-tweet-max").value = RICHTER_LEVEL_GOOD_DEFAULT;
    document.getElementById("richter-threshold-bad-tweet-max").value = RICHTER_LEVEL_BAD_DEFAULT;
    
    document.getElementById("balanced-threshold-positive").value = BALANCED_THRESHOLD_POSITIVE_DEFAULT;
    document.getElementById("balanced-threshold-negative").value = BALANCED_THRESHOLD_NEGATIVE_DEFAULT;
    document.getElementById("balanced-threshold-good-tweet-min").value = BALANCED_LEVEL_GOOD_DEFAULT;
    document.getElementById("balanced-threshold-bad-tweet-min").value = BALANCED_LEVEL_BAD_DEFAULT;

    saveOptions();
}

function restoreOptionsFromStorage() {
    chrome.storage.sync.get({
        // Default values.
        behavior: BEHAVIOR_DEFAULT,
        scoring: SCORING_DEFAULT,
        richterThresholdPositive: RICHTER_THRESHOLD_POSITIVE_DEFAULT,
        richterThresholdNegative: RICHTER_THRESHOLD_NEGATIVE_DEFAULT,
        richterLevelGood: RICHTER_LEVEL_GOOD_DEFAULT,
        richterLevelBad: RICHTER_LEVEL_BAD_DEFAULT,
        balancedThresholdPositive: BALANCED_THRESHOLD_POSITIVE_DEFAULT,
        balancedThresholdNegative: BALANCED_THRESHOLD_NEGATIVE_DEFAULT,
        balancedLevelGood: BALANCED_LEVEL_GOOD_DEFAULT,
        balancedLevelBad: BALANCED_LEVEL_BAD_DEFAULT 
    }, (items) => {
        if (items.behavior === "NEGATIVE_ONLY") {
            document.getElementById("only-negative").checked = true;
        } else {
            document.getElementById("both").checked = true;
        }

        if (items.scoring === "RICHTER") {
            document.getElementById("richter").checked = true;
        } else {
            document.getElementById("balanced").checked = true;
        }

        document.getElementById("richter-threshold-positive").value = items.richterThresholdPositive;
        document.getElementById("richter-threshold-negative").value = items.richterThresholdNegative;
        document.getElementById("richter-threshold-good-tweet-max").value = items.richterLevelGood;
        document.getElementById("richter-threshold-bad-tweet-max").value = items.richterLevelBad;
        
        document.getElementById("balanced-threshold-positive").value = items.balancedThresholdPositive;
        document.getElementById("balanced-threshold-negative").value = items.balancedThresholdNegative;
        document.getElementById("balanced-threshold-good-tweet-min").value = items.balancedLevelGood;
        document.getElementById("balanced-threshold-bad-tweet-min").value = items.balancedLevelBad;
    });
}

document.addEventListener("DOMContentLoaded", restoreOptionsFromStorage);
document.getElementById("save").addEventListener("click", saveOptions);
document.getElementById("restore").addEventListener("click", restoreDefaults);