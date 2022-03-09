// Attributes.
const ATTR_SETTINGS = "ratiod-settings";
const ATTR_TOUCHED = "ratiod-touched";

// CSS Selectors.
const TWEET_SELECTOR = `article[data-testid="tweet"]:not([${ATTR_TOUCHED}="true"])`; // Any unmodified tweet.
const FEED_TWEET_REPLY_SELECTOR = `[data-testid="reply"] span > span > span`; // Reply button.
const FEED_TWEET_RETWEET_SELECTOR = `[data-testid="retweet"] span > span > span, [data-testid="unretweet"] span > span > span`; // Retweet button.
const FEED_TWEET_LIKE_SELECTOR = `[data-testid="like"] span > span > span, [data-testid="unlike"] span > span > span`; // Like button.
const TWEET_CONTENT_SELECTOR = "div:first-child > div:first-child > div:first-child > div:nth-child(2) > div:nth-child(2)"; // Sub-element of feed tweets that is nicely aligned.

// Regular expressions.
const SINGLE_TWEET_PATTERN = /\/\w{1,15}\/status\/[0-9]+$/g; // URL pattern for single tweet pages.

// Score modes.
const BALANCED_MODE = "BALANCED"; // ((retweets - replies) + 2 * (likes - replies)) / 3
const RICHTER_MODE = "RICHTER"; // ln(replies / likes) * log(replies)

// Display information dependent on score evaluation.
const LEVELS = {
    GOOD: {
        bg: "#2C5B34",
        fnt: "white",
        quip: "Very popular."
    },
    BAD: {
        bg: "#59442b",
        fnt: "white",
        quip: "Controversial."
    },
    TERRIBLE: {
        bg: "#592B2B",
        fnt: "white",
        quip: "Very controversial."
    }
};

let OPTIONS; // Supplied via content script.

/**
 * Tests a regular expression on a string, then resets the regex.
 * @param {RegExp} regex The regex to test for.
 * @param {string} str The string to test the regex on.
 * @returns Was the test successful?
 */
function regexTest(regex, str) {
    regex.lastIndex = 0;
    return regex.test(str);
}

/**
 * Determines the category/level a given score falls into.
 * @param {number} score The score to categorize.
 * @param {string} mode The mode this score was calculated with.
 * @returns {object} The level of this tweet, GOOD, BAD or TERRIBLE.
 */
function determineLevel(score, mode) {
    if (mode === RICHTER_MODE) {
        switch (true) {
            case score <= OPTIONS.richterLevelGood: return LEVELS.GOOD;
            case score <= OPTIONS.richterLevelBad: return LEVELS.BAD;
            default: return LEVELS.TERRIBLE;
        }
    }
    
    switch (true) {
        case score >= OPTIONS.balancedLevelGood: return LEVELS.GOOD;
        case score >= OPTIONS.balancedLevelBad: return LEVELS.BAD;
        default: return LEVELS.TERRIBLE;
    }
}

/**
 * Creates a ratio bar element to append to a tweet.
 * @param {number} score The score to use as a base for colors and texts.
 * @param {string} mode The mode the score is calculated with.
 * @returns {HTMLElement} The ratio bar, unattached.
 */
function createRatioBar(score, mode) {
    const level = determineLevel(score, mode);

    // Base bar.
    const ratioBar = document.createElement("div");
    ratioBar.style.width = "100%";
    ratioBar.style.height = "25px";
    ratioBar.style.marginTop = "15px";
    ratioBar.style.backgroundColor = level.bg;
    ratioBar.style.color = level.fnt;
    ratioBar.style.display = "flex";
    ratioBar.style.flexDirection = "row";
    ratioBar.style.fontFamily = `TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
    ratioBar.style.alignItems = "center";
    ratioBar.style.borderRadius = "10px";
    ratioBar.style.boxSizing = "border-box";
    ratioBar.style.paddingLeft = "11px";
    ratioBar.style.paddingRight = "11px";
    
    // Static text - "RATIO:".
    const statusText = document.createElement("span");
    statusText.style.fontWeight = "500";
    statusText.style.marginRight = "5px";
    statusText.textContent = "RATIO:";

    ratioBar.appendChild(statusText);

    // Level text stating the quality of the tweet.
    const infoText = document.createElement("span");
    infoText.textContent = level.quip;

    ratioBar.appendChild(infoText);

    // Text at the end of the bar, stating the exact score.
    const scoreText = document.createElement("span");
    scoreText.textContent = `(${score.toFixed(1)}${mode === RICHTER_MODE ? " Ratio Richter" : ""})`;
    scoreText.style.marginLeft = "auto";

    ratioBar.appendChild(scoreText);

    return ratioBar;
}

/**
 * Depending on the mode, calculates if a ratio bar should be applied and applies it if needed.
 * @param {HTMLElement} tweetContent The element to append the bar to.
 * @param {object} ratios The ratios object generated by the makeScores function.
 * @param {string} mode The calculation method used for display. 
 */
function checkAndApplyRatioBar(tweetContent, ratios, mode) {
    const isRichter = mode === RICHTER_MODE;

    // We don't want to display a bar for every tweet, only the notable ones.
    // Therefore we have an "exclusion zone" of irrelevant scores, which changes depending
    // on the scale/mode of calculation that is used.
    const upperBound = isRichter ? OPTIONS.richterThresholdNegative :
        OPTIONS.balancedThresholdPositive;
    const lowerBound = isRichter ? OPTIONS.richterThresholdPositive :
        OPTIONS.balancedThresholdNegative;
    const score = isRichter ? ratios.ratioRichter : ratios.balancedScore;

    // In default mode, we only display negative tweets (because green bars are boring and no one's here for it).
    const isPositive = isRichter ? score <= OPTIONS.richterLevelGood : score >= OPTIONS.balancedLevelGood;
    const isBlocked = OPTIONS.behavior === "NEGATIVE_ONLY" && isPositive;

    if (!isBlocked && (score >= upperBound || score <= lowerBound)) {
        const ratioBar = createRatioBar(score, mode);
        tweetContent.appendChild(ratioBar);
    }
}

/**
 * Processes an array of feed-style tweets and applies ratio bars if needed.
 * @param {HTMLElement[]} tweets The tweets to process.
 */
function handleFeed(tweets) {
    tweets.forEach(tweet => {
        tweet.setAttribute(ATTR_TOUCHED, "true"); // Further passes will disregard this tweet now.

        const tweetContent = tweet.querySelector(TWEET_CONTENT_SELECTOR);
        const ratios = calculateFeedTweetScores(tweet);

        // Pseudo error handling.
        if (ratios.bailout) {
            console.error("Couldn't apply tweet ratios:", ratios.msg);
            return;
        }
        
        // Append element if necessary.
        checkAndApplyRatioBar(tweetContent, ratios, OPTIONS.scoring);
    });
}

/**
 * Calculates the scores from the three key metrics.
 * - Retweet Score: Difference between retweets and replies
 * - Like Score: Difference between likes and replies
 * - Balanced Score: Like Score and Retweet Score as a 2:1 average
 * - Ratio Richter: Logarithmic scale for the ratio of replies to likes (see: https://www.dataforprogress.org/the-ratio-richter-scale)
 * @param {number} retweets The amount of retweets a tweet has.
 * @param {number} likes The amount of likes a tweet has.
 * @param {number} replies The amount of replies a tweet has.
 * @returns {object} The calculated retweet, like and balanced scores, as well as the ratio richter.
 */
function makeScores(retweets, likes, replies) {
    const retweetScore = retweets - replies;
    const likeScore = likes - replies;
    const balancedScore = (retweetScore + 2 * likeScore) / 3;
    const ratioRichter = Math.log(Math.max(replies, 1) / Math.max(likes, 1)) * Math.log10(Math.max(replies, 1));

    return {
        retweetScore,
        likeScore,
        balancedScore,
        ratioRichter,
    };
}

/**
 * Extracts the scores from a tweet element.
 * @param {HTMLElement} tweet The tweet to process.
 * @returns {object} Either the scores or a bailout message.
 */
function calculateFeedTweetScores(tweet) {
    const replyButton = tweet.querySelector(FEED_TWEET_REPLY_SELECTOR);
    const likeButton = tweet.querySelector(FEED_TWEET_LIKE_SELECTOR);
    const retweetButton = tweet.querySelector(FEED_TWEET_RETWEET_SELECTOR);

    // If a tweet is not fully interactive, ratios will be skewed and it does not make sense to display a ratio bar.
    // We don't want people to get away with just disabling replies! >:)
    if (replyButton?.hasAttribute("aria-disabled") || likeButton?.hasAttribute("aria-disabled") || retweetButton?.hasAttribute("aria-disabled")) {
        return {bailout: true, msg: "Cannot calculate ratios for tweets which are not fully interactive."};
    }

    const replyButtonText = replyButton?.textContent;
    const likeButtonText = likeButton?.textContent;
    const retweetButtonText = retweetButton?.textContent;

    const replies = extractNumberFromFormattedText(replyButtonText);
    const likes = extractNumberFromFormattedText(likeButtonText);
    const retweets = extractNumberFromFormattedText(retweetButtonText);

    if (isNaN(replies) || isNaN(likes) || isNaN(retweets)) {
        return {bailout: true, msg: "Cannot calculate ratios for tweet due to unparseable text contents."};
    }

    return makeScores(retweets, likes, replies);
}

/**
 * Extracts a number from twitter-formatted text based on the locale set by the user.
 * @param text {string} The text to parse.
 * @return {number} The extracted value.
 */
function extractNumberFromFormattedText(text) {
    const baseText = text || "0";
    const lang = document.documentElement.lang;

    switch (lang) {
        case "en-GB":
        case "en": return extractNumberFormatEN(baseText);
        case "de": return extractNumberFormatDE(baseText);
        case "sv": return extractNumberFormatSV(baseText);
        case "es": return extractNumberFormatES(baseText);
        case "pt": return extractNumberFormatPT(baseText);
        case "it": return extractNumberFormatIT(baseText);
        case "uk": return extractNumberFormatUKR(baseText);
        default: {
            console.error("Ratio'd: Unsupported locale, defaulting to english format. Results will likely not be correct.");
            return extractNumberFormatEN(baseText);
        }
    }
}

/**
 * Extracts a twitter-formatted number using the English locale.
 * @param text {string} The text to parse.
 * @return {number} The extracted value.
 */
function extractNumberFormatEN(text) {
    text = text.replace(/,/g, "");

    const amplifierMap = {
        "K": 1000,
        "M": 1000000
    };

    const matchResults = /([0-9]+(\.[0-9]+)?)([KM])?/g.exec(text);
    let num = parseFloat(matchResults[1]);
    const amplifier = amplifierMap[matchResults[3]];
    if (amplifier) num *= amplifier;

    return num;
}

/**
 * Extracts a twitter-formatted number using the German locale.
 * @param text {string} The text to parse.
 * @return {number} The extracted value.
 */
function extractNumberFormatDE(text) {
    text = text.replace(/\./g, "");

    const amplifierMap = {
        "Mio": 1000000
    };

    const matchResults = /([0-9]+(,[0-9]+)?)(\s(Mio))?/g.exec(text);
    let num = parseFloat(matchResults[1].replace(/,/g, "."));
    const amplifier = amplifierMap[matchResults[4]];
    if (amplifier) num *= amplifier;

    return num;
}

/**
 * Extracts a twitter-formatted number using the Swedish locale.
 * @param text {string} The text to parse.
 * @return {number} The extracted value.
 */
function extractNumberFormatSV(text) {
    text = text.replace(/\s/g, "");

    const amplifierMap = {
        "tn": 1000,
        "mn": 1000000
    };

    const matchResults = /([0-9]+(,[0-9]+)?)(tn|mn)?/g.exec(text);
    let num = parseFloat(matchResults[1].replace(/,/g, "."));
    const amplifier = amplifierMap[matchResults[3]];
    if (amplifier) num *= amplifier;

    return num;
}

/**
 * Extracts a twitter-formatted number using the Spanish locale.
 * @param text {string} The text to parse.
 * @return {number} The extracted value.
 */
function extractNumberFormatES(text) {
    text = text.replace(/\./g, "");

    const amplifierMap = {
        "mil": 1000,
        "M": 1000000
    };

    const matchResults = /([0-9]+(,[0-9]+)?)(\s(mil|M))?/g.exec(text);
    let num = parseFloat(matchResults[1].replace(/,/g, "."));
    const amplifier = amplifierMap[matchResults[4]];
    if (amplifier) num *= amplifier;

    return num;
}

/**
 * Extracts a twitter-formatted number using the Portuguese locale.
 * @param text {string} The text to parse.
 * @return {number} The extracted value.
 */
function extractNumberFormatPT(text) {
    text = text.replace(/\./g, "");

    const amplifierMap = {
        "mil": 1000,
        "mi": 1000000
    };

    const matchResults = /([0-9]+(,[0-9]+)?)(\s(mil|mi))?/g.exec(text);
    let num = parseFloat(matchResults[1].replace(/,/g, "."));
    const amplifier = amplifierMap[matchResults[4]];
    if (amplifier) num *= amplifier;

    return num;
}

/**
 * Extracts a twitter-formatted number using the Italian locale.
 * @param text {string} The text to parse.
 * @return {number} The extracted value.
 */
function extractNumberFormatIT(text) {
    text = text.replace(/\./g, "");

    const amplifierMap = {
        "Mln": 1000000
    };

    const matchResults = /([0-9]+(,[0-9]+)?)(\s(Mln))?/g.exec(text);
    let num = parseFloat(matchResults[1].replace(/,/g, "."));
    const amplifier = amplifierMap[matchResults[4]];
    if (amplifier) num *= amplifier;

    return num;
}

/**
 * Extracts a twitter-formatted number using the Ukrainian locale.
 * @param text {string} The text to parse.
 * @return {number} The extracted value.
 */
function extractNumberFormatUKR(text) {
    text = text.replace(/[\.\s]/g, "");

    const amplifierMap = {
        "тис": 1000,
        "млн": 1000000
    };

    const matchResults = /([0-9]+(,[0-9]+)?)(тис|млн)?/g.exec(text);
    let num = parseFloat(matchResults[1].replace(/,/g, "."));
    const amplifier = amplifierMap[matchResults[3]];
    if (amplifier) num *= amplifier;

    return num;
}

/**
 * Checks the page for all currently unprocessed tweets and applies our changes to it.
 */
function performCheck() {
    const {pathname} = document.location;

    // Query all tweets available on the page and wrap in properly iterable array.
    const availableTweets = [...document.querySelectorAll(TWEET_SELECTOR)];
    
    // Currently we cannot process the "main tweet" if on a status page.
    // The idea here is to extend this in the future so we can both:
    // a) Show ratio bar on the "main tweet"
    // b) Show if a reply outperforms the original tweet

    if (regexTest(SINGLE_TWEET_PATTERN, pathname)) {
        // Main tweet is identified by a contained link to the current url.
        const mainTweet = availableTweets.find(tweet => {
            return tweet.querySelectorAll(`a[href="${pathname}"]`).length !== 0;
        });

        const otherTweets = availableTweets.filter(t => t !== mainTweet);
        
        handleFeed(otherTweets);
    } else {
        handleFeed(availableTweets);
    }
}

// Bootstrap.
if (!document.body.hasAttribute(ATTR_SETTINGS)) {
    throw new Error("Cannot load Ratio'd - settings are missing!");
}

OPTIONS = JSON.parse(document.body.getAttribute(ATTR_SETTINGS));

setInterval(() => {
    performCheck();
}, 500);
