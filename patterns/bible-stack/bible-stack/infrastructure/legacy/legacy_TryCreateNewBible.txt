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

import {
  ClickModalities,
  type ClickModality,
  MouseButtonIds,
  type MouseButtonId,
} from "bibleVizUtils.models.casualos";

const {
  buttonId,
  position,
  modality,
}: {
  modality: ClickModality;
  position: {
    x: number;
    y: number;
  };
  buttonId: MouseButtonId;
} = that;
if (
  thisBot.masks.isBibleCreationActive &&
  ((modality === ClickModalities.mouse && buttonId === MouseButtonIds.left) ||
    modality === ClickModalities.touch) &&
  !thisBot.masks.isBibleAnimating
) {
  setTagMask(thisBot, "isBibleAnimating", true);
  thisBot.CreateNewBible({ position });
}
