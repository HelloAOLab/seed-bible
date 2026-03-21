import { updateIndicators } from "bibleVizUtils.controllers.userPresence.activityIndicatorsController";
import { BiblePiece } from "bibleVizUtils.models.canvas";

if (thisBot.tags.typeOfPiece === BiblePiece.StackSectionShadow) {
  // console.log(`[Debug] UserPresenceUpdate`, {
  //     "!thisBot.tags.isBaseInfoLabelTransformer": !thisBot.tags.isBaseInfoLabelTransformer,
  //     "thisBot.tags.isInUse": thisBot.tags.isInUse,
  //     "!thisBot.masks.isHiding": !thisBot.masks.isHiding
  // })
} else {
  // console.log(`[Debug] UserPresenceUpdate is being called on infoLabelTransformers, but not in StackSectionShadow labels`)
}

if (
  !thisBot.tags.isBaseInfoLabelTransformer &&
  thisBot.tags.isInUse &&
  !thisBot.masks.isHiding
) {
  updateIndicators(thisBot);
}
