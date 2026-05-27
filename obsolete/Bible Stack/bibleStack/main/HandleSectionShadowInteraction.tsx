/**
 * Called whenever a section shadow is interacted by clicking on its info label
 * It is in charge of deselecting the section shadow's owner section
 * @param {Object} that - Object that contains important data for the function
 * @param {Bot} that.sectionShadow - The section shadow that has been interacted
 * @param {String} that.typeOfInteraction - Represents the type of interaction. Possible values can be found at globalThis.CanvasInteractions
 * @example
 * thisBot.HandleSectionShadowInteraction({sectionShadow: someSectionShadow, typeOfInteraction: CanvasInteractions.Tap});
 */
import {
  CanvasInteractions,
  type CanvasInteraction,
} from "bibleVizUtils.models.canvas";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import type { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";

const {
  sectionShadow,
  typeOfInteraction,
}: {
  sectionShadow: Bot;
  typeOfInteraction: CanvasInteraction;
} = that;
const sectionData = (thisBot.vars.stackSectionsData as StackSectionData[]).find(
  (data) => {
    return data.isActive && data.id == sectionShadow.tags.sectionDataId;
  }
);
if (
  !sectionData ||
  !sectionData.isActive ||
  thisBot.masks.isBibleAnimating ||
  thisBot.masks.isASectionMakingTourGuide
)
  return;

switch (typeOfInteraction) {
  case CanvasInteractions.Tap:
    {
      thisBot.DeselectSection({ sectionData });
    }
    break;
  default:
    break;
}
