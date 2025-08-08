/**
 * Toggles the stack visualization of the Bible. This method handles the animation
 * of the cross lines used in the visualization. It ensures that toggles cannot happen
 * while another animation is in progress or if the Bible state is not open.
 *
 * @param {Object} that - The object containing parameters for toggling the stack visualization.
 * @param {BibleData} that.bibleData - BibleData which Bible's visualization will be toggled.
 *
 * @example
 * StacksManager.TryToggleStackViz({ bibleData: someBibleData });
 */

const {bibleData} = that;
if( thisBot.masks.isBibleAnimating || 
    thisBot.masks.isTryingToToggleStackViz || 
    thisBot.masks.isStoppingStackVizToggle || 
    bibleData.currentState !== BibleState.Open) return;

setTagMask(thisBot, "isTryingToToggleStackViz", true);
thisBot.vars.lastInteractedBibleData = bibleData;
const firstAnimationDuration = 1;
const secondAnimationDuration = 0.25;
const endingColor = [255,255,255];
const crossLines = [bibleData.staticBibleElements.crossVerticalLine, bibleData.staticBibleElements.crossHorizontalLine];
await Promise.all(crossLines.map((crossLine) => {
    return LerpColorManager.LerpTagColor({
        startingColor: HexToRgb(crossLine.tags.initialColor), 
        endingColor, 
        durationInSeconds: firstAnimationDuration, 
        bot: crossLine, 
        tag: InterpolatableColorTags.Color
    });
})).then(() => {
    setTagMask(thisBot, "isTryingToToggleStackViz", false);
    thisBot.ToggleStackViz({bibleData});
    crossLines.forEach((crossLine) => {
        LerpColorManager.LerpTagColor({
            startingColor: endingColor, 
            endingColor: HexToRgb(crossLine.tags.initialColor), 
            durationInSeconds: secondAnimationDuration, 
            bot: crossLine, 
            tag: InterpolatableColorTags.Color
        })
    })
})