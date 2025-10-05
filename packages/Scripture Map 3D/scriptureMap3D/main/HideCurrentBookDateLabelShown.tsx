const structureCurrentlyShowingInfoCard = thisBot.vars.layoutBooksStructure.find((structure) => {return structure.infoCardTransformer});
if(structureCurrentlyShowingInfoCard)
{
    ObjectPooler.ReleaseObject({obj: structureCurrentlyShowingInfoCard.infoCardTransformer, tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutBookInfoCardTransformer});
    ObjectPooler.ReleaseObject({obj: structureCurrentlyShowingInfoCard.infoCardContent, tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutBookInfoCardContent});
    ObjectPooler.ReleaseObject({obj: structureCurrentlyShowingInfoCard.infoCardBackground, tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutBookInfoCardBackground});

    structureCurrentlyShowingInfoCard.infoCardTransformer = null;
    structureCurrentlyShowingInfoCard.infoCardContent = null;
    structureCurrentlyShowingInfoCard.infoCardBackground = null;
}