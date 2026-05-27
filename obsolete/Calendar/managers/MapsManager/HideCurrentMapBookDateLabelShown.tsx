const structureCurrentlyShowingInfoCard = thisBot.vars.mapBooksStructure.find((structure) => {return structure.infoCardTransformer});
if(structureCurrentlyShowingInfoCard)
{
    ObjectPooler.ReleaseObject({obj: structureCurrentlyShowingInfoCard.infoCardTransformer, tag: ObjectPoolTags.MapBookInfoCardTransformer});
    ObjectPooler.ReleaseObject({obj: structureCurrentlyShowingInfoCard.infoCardContent, tag: ObjectPoolTags.MapBookInfoCardContent});
    ObjectPooler.ReleaseObject({obj: structureCurrentlyShowingInfoCard.infoCardBackground, tag: ObjectPoolTags.MapBookInfoCardBackground});

    structureCurrentlyShowingInfoCard.infoCardTransformer = null;
    structureCurrentlyShowingInfoCard.infoCardContent = null;
    structureCurrentlyShowingInfoCard.infoCardBackground = null;
}