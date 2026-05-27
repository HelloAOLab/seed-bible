if (thisBot.masks.initialized || typeof TabernacleManager !== "undefined")
  return;

setTagMask(thisBot, "initialized", true);

globalThis.TabernacleManager = thisBot;

globalThis.MeshState = {
  Hidden: "Hidden",
  Shown: "Shown",
  Translucent: "Translucent",
};

// Development purposes
thisBot.SetBotsVisibility({
  data: thisBot.tags.piecesKeys.map((key) => {
    return { key, value: MeshState.Hidden };
  }),
  customDimension: thisBot.tags.dimension,
});
// gridPortalBot.tags.portalBackgroundAddress = "https://publicos-link-filesbucket-404655125928.s3.amazonaws.com/ab-1/00471bdfd73c319edf496024c5349e51a6cf48589d29db12f17c5c71c7c9acbf"

thisBot.UpdateHighlightedWords();

thisBot.CreateHitboxes();
