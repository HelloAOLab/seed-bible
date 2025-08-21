/**
 * Attempts to stop the toggle of the stack visualization. This method manages the
 * color transition of the cross lines used in the visualization, ensuring that the
 * toggle action is properly animated and preventing further toggles while the animation
 * is in progress.
 *
 * @param {Object} that - The object containing parameters for stopping the stack visualization toggle.
 * @param {StackBibleData} that.bibleData - StackBibleData which Bible's visualization will be toggled.
 *
 * @example
 * thisBot.TryStopStackVizToggle({ bibleData: someBibleData });
 */

const {bibleData} = that;
if(!thisBot.masks.isTryingToToggleStackViz || thisBot.masks.isStoppingStackVizToggle) return;

setTagMask(thisBot, "isStoppingStackVizToggle", true);
const animationDuration = 0.25;
const crossLines = [bibleData.staticBiblePieces.crossVerticalLine, bibleData.staticBiblePieces.crossHorizontalLine];
await Promise.all(crossLines.map((crossLine) => {
    return LerpColorManager.LerpTagColor({
        startingColor: BibleVizUtils.Functions.HexToRgb({hexColor: crossLine.masks.color ?? crossLine.tags.color}), 
        endingColor: BibleVizUtils.Functions.HexToRgb({hexColor: crossLine.tags.initialColor}), 
        durationInSeconds: animationDuration, 
        bot: crossLine, 
        tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color
    })
}));

setTagMask(thisBot, "isTryingToToggleStackViz", false);
setTagMask(thisBot, "isStoppingStackVizToggle", false);