setTagMask(thisBot, "isBeingHovered", true);
shout("OnBookInteracted", {book: thisBot, typeOfInteraction: StackElementInteractionType.HoverEnd});

InstanceManager.TryClearVideoTimeout();
if(globalThis.CLEARABLE_LERPING){
    thisBot.TryToUnlerp();
}