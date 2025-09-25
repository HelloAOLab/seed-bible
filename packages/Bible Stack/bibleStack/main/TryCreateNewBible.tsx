/**
 * Attempts to create a new Bible if the creation is active and the input modality is valid (mouse left click or touch).
 * It also ensures that no other animations are currently in progress.
 * 
 * @param {Object} that - The object containing parameters for the operation.
 * @param {number} that.buttonId - The ID of the button used for the click.
 * @param {Vector3} that.position - The position where the new Bible should be created.
 * @param {string} that.modality - The modality of the input (e.g., mouse or touch).
 * 
 * @example
 * thisBot.TryCreateNewBible({buttonId: 0, position: new Vector2(0, 0), modality: "mouse"});
 */

const {buttonId, position, modality} = that;
if(thisBot.masks.isBibleCreationActive && ((modality === BibleVizUtils.Data.tags.ClickModality.mouse && buttonId === BibleVizUtils.Data.tags.MouseButtonId.left) || modality === BibleVizUtils.Data.tags.ClickModality.touch) && !thisBot.masks.isBibleAnimating)
{
    setTagMask(thisBot, "isBibleAnimating", true);
    thisBot.CreateNewBible({position});
}