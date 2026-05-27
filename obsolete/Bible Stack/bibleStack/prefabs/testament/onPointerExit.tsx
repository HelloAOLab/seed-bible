// if(globalThis.CLEARABLE_LERPING){
//     thisBot.TryToUnlerp();
// }
// InstanceManager.TryClearVideoTimeout();

import { CanvasInteractions } from "bibleVizUtils.models.canvas";

setTagMask(thisBot, "isBeingHovered", false);
shout("OnStackTestamentInteracted", {
  testament: thisBot,
  typeOfInteraction: CanvasInteractions.HoverEnd,
});
