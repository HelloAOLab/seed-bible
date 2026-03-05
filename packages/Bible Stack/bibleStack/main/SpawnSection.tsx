import { GetDarkerColor } from "bibleVizUtils.functions.index";
import { arrangementService } from "bibleVizUtils.services.index";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";

/**
 * Spawns a section (or section book) in the current dimension with specified properties and initializes it.
 *
 * @param {Object} that - The object containing section information.
 * @param {string} that.name - The name of the section to spawn.
 * @param {Vector3} that.spawnPosition - Is optional and is the position where the section will be spawned, defaults to Vector3(0,0,0).
 *
 * @returns {Promise<void>} - A promise that resolves after the section has been spawned and initialized.
 *
 * @example
 * thisBot.SpawnSection({
 *   name: "Law",
 *   spawnPosition: new Vector3(1, 2, 3)
 * });
 */

let sectionData;
const dimension = os.getCurrentDimension();
const jarvis = getBot("jarvis", true);
const jarvisPosition = getBotPosition(jarvis, dimension);

let { spawnPosition } = that;
const { name } = that;
let displayJarvisSpawnPieceAnimation = false;
if (jarvis && !spawnPosition) {
  spawnPosition = jarvisPosition;
  displayJarvisSpawnPieceAnimation = true;
}
const { arrangementIndex, testamentIndex, sectionIndex, found } =
  arrangementService.getSectionInfoPathByName(name);
if (found) {
  sectionData = await thisBot.CreateSection({
    arrangementIndex,
    testamentIndex,
    sectionIndex,
  });
  const desiredScaleZ =
    sectionData.creationInfo.amountOfChaptersInSection *
    BibleVizDataRepository.getStackPieceMeasurement(
      "SectionDesiredScaleZRatio"
    );
  if (displayJarvisSpawnPieceAnimation)
    await jarvis.SpawnPieceStart({
      scales: new Vector3(
        BibleVizDataRepository.getStackPieceMeasurement("SectionScales").x,
        BibleVizDataRepository.getStackPieceMeasurement("SectionScales").y,
        desiredScaleZ
      ),
    });
  const section = ObjectPooler.GetObjectFromPool({
    tag:
      sectionData instanceof StackSectionBookData
        ? BibleVizUtils.Data.tags.ObjectPoolTags.StackBook
        : BibleVizUtils.Data.tags.ObjectPoolTags.StackSection,
  });
  const sectionMod = {
    typeOfPiece:
      sectionData instanceof StackSectionBookData
        ? BibleVizUtils.Data.tags.BiblePieceType.StackSectionBook
        : BibleVizUtils.Data.tags.BiblePieceType.StackSection,
    arrangementIndex,
    testamentIndex,
    sectionIndex,
    sectionName: name,
    amountOfChaptersInSection:
      sectionData.creationInfo.amountOfChaptersInSection,
    numberOfChapters:
      sectionData instanceof StackSectionBookData
        ? sectionData.creationInfo.amountOfChaptersInSection
        : null,
    bookInfo:
      sectionData instanceof StackSectionBookData
        ? sectionData.pieceInfo.books[0]
        : null,
    bookName:
      sectionData instanceof StackSectionBookData
        ? sectionData.pieceInfo.books[0].commonName
        : null,
    [dimension]: true,
    [dimension + "X"]: spawnPosition.x,
    [dimension + "Y"]: spawnPosition.y,
    [dimension + "Z"]: spawnPosition.z,
    [dimension + "RotationZ"]: 0,
    scaleX: BibleVizDataRepository.getStackPieceMeasurement("SectionScales").x,
    scaleY: BibleVizDataRepository.getStackPieceMeasurement("SectionScales").y,
    scaleZ: desiredScaleZ,
    initialScaleX:
      BibleVizDataRepository.getStackPieceMeasurement("SectionScales").x,
    initialScaleY:
      BibleVizDataRepository.getStackPieceMeasurement("SectionScales").y,
    hoveredScaleX:
      BibleVizDataRepository.getStackPieceMeasurement("SectionScales").x +
      BibleVizDataRepository.getStackPieceMeasurement(
        "SectionAditionalScaleOnHover"
      ),
    hoveredScaleY:
      BibleVizDataRepository.getStackPieceMeasurement("SectionScales").y +
      BibleVizDataRepository.getStackPieceMeasurement(
        "SectionAditionalScaleOnHover"
      ),
    initialScaleZ: desiredScaleZ,
    color: sectionData.pieceInfo.color,
    orginalColor: sectionData.pieceInfo.color,
    initialColor: sectionData.pieceInfo.color,
    initialExplodedViewScaleZ:
      sectionData instanceof StackSectionBookData
        ? null
        : desiredScaleZ *
          (sectionData.pieceInfo.customExplodedViewScaleFactor ?? 2),
    desiredExplodedViewScaleZ:
      sectionData instanceof StackSectionBookData
        ? null
        : desiredScaleZ *
          (sectionData.pieceInfo.customExplodedViewScaleFactor ?? 2),
    labelOpacity: 0,
    formOpacity: 0.7,
    labelTextColor: GetDarkerColor({ color: sectionData.pieceInfo.color }),
    customColorRange:
      sectionData instanceof StackSectionBookData
        ? null
        : sectionData.pieceInfo.customColorRange,
    draggable: thisBot.masks.areBiblePiecesDraggable,
    desiredPositionZ: spawnPosition.z,
    toErase: true,
    desiredScaleZ,
  };
  section.OnSpawned({ mod: sectionMod });
  sectionData.piece = section;
  sectionData.isActive = true;
  setTagMask(section, "highlightable", true);
  setTagMask(section, "isOnTheGround", true);
  if (displayJarvisSpawnPieceAnimation)
    await jarvis.SpawnPieceEnd({
      scales: new Vector3(
        BibleVizDataRepository.getStackPieceMeasurement("SectionScales").x,
        BibleVizDataRepository.getStackPieceMeasurement("SectionScales").y,
        desiredScaleZ
      ),
    });
}

return { sectionData };
