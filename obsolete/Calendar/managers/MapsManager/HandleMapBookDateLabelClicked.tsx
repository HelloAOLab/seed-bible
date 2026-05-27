import { GetDialogBotScaleY } from "bibleVizUtils.functions.index";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";

if (thisBot.masks.isAnimatingMap) return;

const { label } = that;
const dimension = os.getCurrentDimension();
const contentMarginBottom = 2;
const backgroundPadding = 1;

const mapBookStructure = thisBot.vars.mapBooksStructure.find((structure) => {
  return structure.dateLabel.id === label.id;
});
const { author, relativeDateRange, numberOfChapters } =
  StacksManager.tags.booksStaticInfo[
    mapBookStructure.mapBookData.elementInfo.commonName
  ];
const date = `${Math.abs(relativeDateRange.min)}${relativeDateRange.min != relativeDateRange.max ? `-${Math.abs(relativeDateRange.max)}` : ``} ${relativeDateRange.min < 0 ? "B.C." : "A.D."}`;
const contentLabel = `Author: ${author}
Date: ${date}
Chapters: ${numberOfChapters}`;

const mapData =
  mapBookStructure.mapBookData.parentDataIds &&
  mapBookStructure.mapBookData.parentDataIds.mapId
    ? thisBot.GetMapDataById({
        mapId: mapBookStructure.mapBookData.parentDataIds.mapId,
      })
    : null;

if (mapBookStructure && (!mapData || !mapData.currentPlaylistShownId)) {
  const structureCurrentlyShowingInfoCard = thisBot.vars.mapBooksStructure.find(
    (structure) => {
      return structure.infoCardTransformer;
    }
  );
  if (structureCurrentlyShowingInfoCard) {
    if (structureCurrentlyShowingInfoCard.id === mapBookStructure.id) {
      ObjectPooler.ReleaseObject({
        obj: structureCurrentlyShowingInfoCard.infoCardTransformer,
        tag: ObjectPoolTags.MapBookInfoCardTransformer,
      });
      ObjectPooler.ReleaseObject({
        obj: structureCurrentlyShowingInfoCard.infoCardContent,
        tag: ObjectPoolTags.MapBookInfoCardContent,
      });
      ObjectPooler.ReleaseObject({
        obj: structureCurrentlyShowingInfoCard.infoCardBackground,
        tag: ObjectPoolTags.MapBookInfoCardBackground,
      });
    } else {
      const { scaleY } = GetDialogBotScaleY({
        scaleXLimit: 5,
        line: contentLabel,
        paddingX: 0,
        paddingY: 0,
        font: BibleVizDataRepository.getFont("Roboto"),
      });
      const contentScales = new Vector3(6, scaleY, 0.2);
      const backgroundScales = new Vector3(
        contentScales.x + backgroundPadding * 2,
        contentScales.y + backgroundPadding * 2,
        0.1
      );
      const contentPosition = new Vector3(
        0,
        contentMarginBottom + contentScales.y / 2,
        0
      );
      const dateLabelPosition = getBotPosition(
        mapBookStructure.dateLabel,
        dimension
      );
      const dateLabelScales = GetBotScales(mapBookStructure.dateLabel);
      const transformerMod = {
        [dimension]: true,
        [dimension + "X"]: dateLabelPosition.x,
        [dimension + "Y"]: dateLabelPosition.y,
        [dimension + "Z"]: dateLabelPosition.z + dateLabelScales.z,
      };
      const contentMod = {
        transformer: structureCurrentlyShowingInfoCard.infoCardTransformer.id,
        [dimension]: true,
        [dimension + "X"]: contentPosition.x,
        [dimension + "Y"]: contentPosition.y,
        [dimension + "Z"]: contentPosition.z,
        scaleX: contentScales.x,
        scaleY: contentScales.y,
        scaleZ: contentScales.z,
        label: contentLabel,
      };
      const backgroundMod = {
        transformer: structureCurrentlyShowingInfoCard.infoCardTransformer.id,
        [dimension]: true,
        [dimension + "X"]: contentPosition.x,
        [dimension + "Y"]: contentPosition.y,
        [dimension + "Z"]: contentPosition.z,
        scaleX: backgroundScales.x,
        scaleY: backgroundScales.y,
        scaleZ: backgroundScales.z,
      };
      applyMod(
        structureCurrentlyShowingInfoCard.infoCardTransformer,
        transformerMod
      );
      applyMod(structureCurrentlyShowingInfoCard.infoCardContent, contentMod);
      applyMod(
        structureCurrentlyShowingInfoCard.infoCardBackground,
        backgroundMod
      );
      mapBookStructure.infoCardTransformer =
        structureCurrentlyShowingInfoCard.infoCardTransformer;
      mapBookStructure.infoCardContent =
        structureCurrentlyShowingInfoCard.infoCardContent;
      mapBookStructure.infoCardBackground =
        structureCurrentlyShowingInfoCard.infoCardBackground;
    }
    structureCurrentlyShowingInfoCard.infoCardTransformer = null;
    structureCurrentlyShowingInfoCard.infoCardContent = null;
    structureCurrentlyShowingInfoCard.infoCardBackground = null;
  } else {
    const { scaleY } = GetDialogBotScaleY({
      scaleXLimit: 5,
      line: contentLabel,
      paddingX: 0,
      paddingY: 0,
      font: BibleVizDataRepository.getFont("Roboto"),
    });
    const contentScales = new Vector3(6, scaleY, 0.2);
    const backgroundScales = new Vector3(
      contentScales.x + backgroundPadding * 2,
      contentScales.y + backgroundPadding * 2,
      0.1
    );
    const contentPosition = new Vector3(
      0,
      contentMarginBottom + contentScales.y / 2,
      0
    );
    const infoCardTransformer = ObjectPooler.GetObjectFromPool({
      tag: ObjectPoolTags.MapBookInfoCardTransformer,
    });
    const infoCardContent = ObjectPooler.GetObjectFromPool({
      tag: ObjectPoolTags.MapBookInfoCardContent,
    });
    const infoCardBackground = ObjectPooler.GetObjectFromPool({
      tag: ObjectPoolTags.MapBookInfoCardBackground,
    });
    const dateLabelPosition = getBotPosition(
      mapBookStructure.dateLabel,
      dimension
    );
    const dateLabelScales = GetBotScales(mapBookStructure.dateLabel);
    const transformerMod = {
      [dimension]: true,
      [dimension + "X"]: dateLabelPosition.x,
      [dimension + "Y"]: dateLabelPosition.y,
      [dimension + "Z"]: dateLabelPosition.z + dateLabelScales.z,
    };
    const contentMod = {
      transformer: infoCardTransformer.id,
      [dimension]: true,
      [dimension + "X"]: contentPosition.x,
      [dimension + "Y"]: contentPosition.y,
      [dimension + "Z"]: contentPosition.z,
      scaleX: contentScales.x,
      scaleY: contentScales.y,
      scaleZ: contentScales.z,
      label: contentLabel,
    };
    const backgroundMod = {
      transformer: infoCardTransformer.id,
      [dimension]: true,
      [dimension + "X"]: contentPosition.x,
      [dimension + "Y"]: contentPosition.y,
      [dimension + "Z"]: contentPosition.z,
      scaleX: backgroundScales.x,
      scaleY: backgroundScales.y,
      scaleZ: backgroundScales.z,
    };
    infoCardTransformer.OnSpawned({ mod: transformerMod });
    infoCardContent.OnSpawned({ mod: contentMod });
    infoCardBackground.OnSpawned({ mod: backgroundMod });

    mapBookStructure.infoCardTransformer = infoCardTransformer;
    mapBookStructure.infoCardContent = infoCardContent;
    mapBookStructure.infoCardBackground = infoCardBackground;
  }
}
