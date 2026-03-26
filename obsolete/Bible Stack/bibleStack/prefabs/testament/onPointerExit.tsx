// if(globalThis.CLEARABLE_LERPING){
//     thisBot.TryToUnlerp();
// }
// InstanceManager.TryClearVideoTimeout();
setTagMask(thisBot, "isBeingHovered", false);
shout("OnStackTestamentInteracted", {testament: thisBot, typeOfInteraction: BibleVizUtils.Data.tags.InteractionType.HoverEnd});