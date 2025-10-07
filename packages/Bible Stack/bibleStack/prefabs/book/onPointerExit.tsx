setTagMask(thisBot, "isBeingHovered", true);
shout("OnStackBookInteracted", {
  book: thisBot,
  typeOfInteraction: BibleVizUtils.Data.tags.InteractionType.HoverEnd,
});

// InstanceManager.TryClearVideoTimeout();
if (globalThis.CLEARABLE_LERPING) {
  thisBot.TryToUnlerp();
}
