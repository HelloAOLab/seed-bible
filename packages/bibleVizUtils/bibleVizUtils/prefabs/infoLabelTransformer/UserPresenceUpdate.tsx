if(!thisBot.tags.isBaseInfoLabelTransformer && thisBot.tags.isInUse && !thisBot.masks.isHiding)
{
    BibleVizUtils.Functions.UpdateUsersColorOnPiece({piece: thisBot, manager: BibleStackManager});
}