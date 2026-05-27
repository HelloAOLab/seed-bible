import { ObjectPoolTags } from "bibleVizUtils.models.canvas";

const structureCurrentlyShowingInfoCard =
  thisBot.vars.layoutBooksStructure.find((structure) => {
    return structure.infoCardTransformer;
  });
if (structureCurrentlyShowingInfoCard) {
  ObjectPooler.ReleaseObject({
    obj: structureCurrentlyShowingInfoCard.infoCardTransformer,
    tag: ObjectPoolTags.LayoutBookInfoCardTransformer,
  });
  ObjectPooler.ReleaseObject({
    obj: structureCurrentlyShowingInfoCard.infoCardContent,
    tag: ObjectPoolTags.LayoutBookInfoCardContent,
  });
  ObjectPooler.ReleaseObject({
    obj: structureCurrentlyShowingInfoCard.infoCardBackground,
    tag: ObjectPoolTags.LayoutBookInfoCardBackground,
  });

  structureCurrentlyShowingInfoCard.infoCardTransformer = null;
  structureCurrentlyShowingInfoCard.infoCardContent = null;
  structureCurrentlyShowingInfoCard.infoCardBackground = null;
}
