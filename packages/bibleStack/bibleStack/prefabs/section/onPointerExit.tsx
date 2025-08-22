InstanceManager.TryClearVideoTimeout();
setTagMask(thisBot, "isBeingHovered", false);
shout("OnSectionInteracted", {section: thisBot, typeOfInteraction: StackElementInteractionType.HoverEnd});