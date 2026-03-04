const currentInfoLabelTransformer = getBot(
  byTag("isInfoLabelTransformer", true),
  byTag("ownerBotId", getID(thisBot)),
  not(byTag("isInteractLabelTransformer", true))
);
if (currentInfoLabelTransformer) {
  const currentInfoLabel = getBot(
    byTag("isInfoLabel", true),
    byTag("transformer", getID(currentInfoLabelTransformer))
  );
  const currentInfoLabelTail = getBot(
    byTag("isInfoLabelTail", true),
    byTag("transformer", getID(currentInfoLabelTransformer))
  );
  const duration = 0.15;
  const easing = { type: "sinusoidal", mode: "inout" };

  setTagMask([currentInfoLabel, currentInfoLabelTail], "pointable", false);
  await Promise.all([
    animateTag([currentInfoLabel, currentInfoLabelTail], "formOpacity", {
      toValue: 0,
      duration,
      easing,
    }),
    animateTag(currentInfoLabel, "labelOpacity", {
      toValue: 0,
      duration,
      easing,
    }),
  ]);

  ObjectPooler.ReleaseObject({
    obj: currentInfoLabelTransformer,
    tag: currentInfoLabelTransformer.tags.poolTag,
  });
}
