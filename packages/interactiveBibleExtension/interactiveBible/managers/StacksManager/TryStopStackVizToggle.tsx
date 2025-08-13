/**
 * Attempts to stop the toggle of the stack visualization. This method manages the
 * color transition of the cross lines used in the visualization, ensuring that the
 * toggle action is properly animated and preventing further toggles while the animation
 * is in progress.
 *
 * @param {Object} that - The object containing parameters for stopping the stack visualization toggle.
 * @param {BibleData} that.bibleData - BibleData which Bible's visualization will be toggled.
 *
 * @example
 * StacksManager.TryStopStackVizToggle({ bibleData: someBibleData });
 */

const {bibleData} = that;
if(!thisBot.masks.isTryingToToggleStackViz || thisBot.masks.isStoppingStackVizToggle) return;

setTagMask(thisBot, "isStoppingStackVizToggle", true);
const animationDuration = 0.25;
const crossLines = [bibleData.staticBibleElements.crossVerticalLine, bibleData.staticBibleElements.crossHorizontalLine];
await Promise.all(crossLines.map((crossLine) => {
    return LerpColorManager.LerpTagColor({
        startingColor: HexToRgb(crossLine.masks.color ?? crossLine.tags.color), 
        endingColor: HexToRgb(crossLine.tags.initialColor), 
        durationInSeconds: animationDuration, 
        bot: crossLine, 
        tag: InterpolatableColorTags.Color
    })
}));

setTagMask(thisBot, "isTryingToToggleStackViz", false);
setTagMask(thisBot, "isStoppingStackVizToggle", false);