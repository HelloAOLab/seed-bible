/**
 * Initiates an await animation for the Bible if not already in progress.
 * Sets the 'isInAwaitAnimation' mask to true and displays float and spin animations.
 * @example
 * thisBot.DisplayInitialAwaitAnimation();
 */

if(thisBot.masks.isInAwaitAnimation) return;

setTagMask(thisBot, "isInAwaitAnimation", true);

thisBot.DisplayFloatAnimation();
thisBot.DisplaySpinAnimation();