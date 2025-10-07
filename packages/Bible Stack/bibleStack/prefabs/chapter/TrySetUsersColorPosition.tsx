if (
  thisBot.masks.isExpanded &&
  !thisBot.masks.isDeselecting &&
  !thisBot.masks.isSelecting
)
  BibleVizUtils.Functions.UpdateUsersColorOnPiece({
    source: "TrySetUsersColorPosition",
    piece: thisBot,
    manager: BibleStackManager,
  });
