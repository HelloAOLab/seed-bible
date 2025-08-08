// if(globalThis.CLEARABLE_LERPING){
//     thisBot.TryToUnlerp();
// }
// InstanceManager.TryClearVideoTimeout();
setTagMask(thisBot, "isBeingHovered", false);
shout("OnTestamentInteracted", {testament: thisBot, typeOfInteraction: StackElementInteractionType.HoverEnd});