import { GetDarkerColor } from "bibleVizUtils.functions.index";
import { arrangementService } from "bibleVizUtils.services.index";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import { BiblePieces, ObjectPoolTags } from "bibleVizUtils.models.canvas";
import { Vector3 } from "../../../../typings/AuxLibraryDefinitions";
import { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";

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

const dimension = os.getCurrentDimension();
const jarvis = getBot("jarvis", true);
const jarvisPosition = getBotPosition(jarvis, dimension);

let {
  spawnPosition,
}: {
  spawnPosition: Vector3;
} = that;
const { name }: { name: string } = that;
let displayJarvisSpawnPieceAnimation = false;
if (jarvis && !spawnPosition) {
  spawnPosition = jarvisPosition;
  displayJarvisSpawnPieceAnimation = true;
}
const { arrangementIndex, testamentIndex, sectionIndex, found } =
  arrangementService.getSectionInfoPathByName(name);
if (!found) {
  console.error("section path not found at SpawnSection");
  return;
}
const sectionData: StackSectionData | StackSectionBookData =
  await thisBot.CreateSection({
    arrangementIndex,
    testamentIndex,
    sectionIndex,
  });
const desiredScaleZ =
  sectionData.getCreationParam("amountOfChaptersInSection") *
  BibleVizDataRepository.getStackPieceMeasurement("SectionDesiredScaleZRatio");
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
      ? ObjectPoolTags.StackBook
      : ObjectPoolTags.StackSection,
});
const sectionMod = {
  typeOfPiece:
    sectionData instanceof StackSectionBookData
      ? BiblePieces.StackSectionBook
      : BiblePieces.StackSection,
  arrangementIndex,
  testamentIndex,
  sectionIndex,
  sectionName: name,
  amountOfChaptersInSection: sectionData.getCreationParam(
    "amountOfChaptersInSection"
  ),
  numberOfChapters:
    sectionData instanceof StackSectionBookData
      ? sectionData.getCreationParam("amountOfChaptersInSection")
      : null,
  bookInfo:
    sectionData instanceof StackSectionBookData
      ? sectionData.getPieceInfoProperty("books")[0]
      : null,
  bookName:
    sectionData instanceof StackSectionBookData
      ? sectionData.getPieceInfoProperty("books")[0]?.commonName
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
  color: sectionData.getPieceInfoProperty("color"),
  orginalColor: sectionData.getPieceInfoProperty("color"),
  initialColor: sectionData.getPieceInfoProperty("color"),
  initialExplodedViewScaleZ:
    sectionData instanceof StackSectionBookData
      ? null
      : desiredScaleZ *
        (sectionData.getPieceInfoProperty("customExplodedViewScaleFactor") ??
          2),
  desiredExplodedViewScaleZ:
    sectionData instanceof StackSectionBookData
      ? null
      : desiredScaleZ *
        (sectionData.getPieceInfoProperty("customExplodedViewScaleFactor") ??
          2),
  labelOpacity: 0,
  formOpacity: 0.7,
  labelTextColor: GetDarkerColor(sectionData.getPieceInfoProperty("color")),
  customColorRange:
    sectionData instanceof StackSectionBookData
      ? null
      : sectionData.getPieceInfoProperty("customColorRange"),
  draggable: thisBot.masks.areBiblePiecesDraggable,
  desiredPositionZ: spawnPosition.z,
  toErase: true,
  desiredScaleZ,
};
section.OnSpawned({ mod: sectionMod });
sectionData.setPiece(section);
sectionData.activate();
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

return { sectionData };
