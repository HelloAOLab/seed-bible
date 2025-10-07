if (
  thisBot.tags.typeOfPiece ===
  BibleVizUtils.Data.tags.BiblePieceType.StackSectionShadow
) {
  console.log(`[Debug] UserPresenceUpdate`, {
    "!thisBot.tags.isBaseInfoLabelTransformer":
      !thisBot.tags.isBaseInfoLabelTransformer,
    "thisBot.tags.isInUse": thisBot.tags.isInUse,
    "!thisBot.masks.isHiding": !thisBot.masks.isHiding,
  });
} else {
  console.log(
    `[Debug] UserPresenceUpdate is being called on infoLabelTransformers, but not in StackSectionShadow labels`
  );
}

if (
  !thisBot.tags.isBaseInfoLabelTransformer &&
  thisBot.tags.isInUse &&
  !thisBot.masks.isHiding
) {
  BibleVizUtils.Functions.UpdateUsersColorOnPiece({
    source: "UserPresenceUpdate",
    piece: thisBot,
    manager: BibleStackManager,
  });
}
