import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import { GetCamRotationFocusPoint } from "bibleVizUtils.functions.index";
/**
 * Creates a new `StackBibleData` instance, sets up the Bible structure, and initializes it.
 *
 * @param {Object} that - Context containing various data properties.
 * @param {Object} that.position - The position where the Bible will be placed.
 *
 * @returns {StackBibleData} bibleData - The newly created `StackBibleData` object, including its testaments and static pieces.
 * @throws {Error} - If Bible structure creation or setup fails.
 *
 * @example
 * thisBot.CreateNewBible({position: {x: 0, y: 0}});
 */

let { position } = that;
const {
  setBibleAnimating = true,
  bibleType = BibleVizUtils.Data.tags.BibleType.Default,
  customArrangementIndex,
} = that;
const dimension = os.getCurrentDimension();
const jarvis = getBot("jarvis", true);
const jarvisPosition = jarvis ? getBotPosition(jarvis, dimension) : null;
let displayJarvisSpawnPieceAnimation = false;
if (
  jarvis &&
  !position &&
  bibleType === BibleVizUtils.Data.tags.BibleType.Default
) {
  position = { x: jarvisPosition.x, y: jarvisPosition.y };
  displayJarvisSpawnPieceAnimation = true;
}
if (displayJarvisSpawnPieceAnimation)
  await jarvis.SpawnPieceStart({ scales: new Vector3(3, 3, 3) });
shout("OnNewBibleStackCreated");
thisBot.vars.hasStackEverBeenSpawned = true;
// if(globalThis?.SetCanvasTools){
//     SetCanvasTools(tools => {
//         return tools.map(tool => {
//             if(tool.label === "Bible stack"){
//                 return {
//                     ...tool,
//                     active: false
//                 }
//             }else{
//                 return tool
//             }
//         })
//     })
// }
const arrangementIndex = !isNaN(customArrangementIndex)
  ? customArrangementIndex
  : BibleVizDataRepository.getCurrentArrangementIndex();
const bibleData = new StackBibleData({
  bibleType,
  arrangementIndex,
  currentCrossPosition: BibleVizUtils.Data.tags.CrossPosition.Top,
  currentStackVizState: BibleVizUtils.Data.tags.BibleVisualizationState.Regular,
  id: uuid(),
});
const { testamentsData, staticBiblePieces } =
  await thisBot.CreateBibleStructure({ arrangementIndex, bibleData });
const focusOnRotation = { x: 1.01229, y: 0.5 };
const focusOnDuration = 1;
const easing = { type: "sinusoidal", mode: "inout" };
testamentsData.forEach((testamentData) => {
  bibleData.AddChild(testamentData);
});
bibleData.staticBiblePieces = staticBiblePieces;
thisBot.vars.stackBiblesData.push(bibleData);
thisBot.vars.lastInteractedStackBibleData = bibleData;
thisBot.SetUpBible({ bibleData, position, bibleType });

const fixedPosition = new Vector3(position.x, position.y, 2);
const desiredFocusOnPosition = GetCamRotationFocusPoint({
  theta: focusOnRotation.y,
  phi: focusOnRotation.x,
  botPosition: fixedPosition,
});
os.focusOn(
  { x: desiredFocusOnPosition.x, y: desiredFocusOnPosition.y },
  {
    duration: focusOnDuration,
    easing,
    rotation: focusOnRotation,
    zoom: 8,
  }
);

if (displayJarvisSpawnPieceAnimation)
  await jarvis.SpawnPieceEnd({ scales: new Vector3(4.5, 4.5, 4.5) });

await thisBot.SetUpInitialBibleOpen({ bibleData });
if (setBibleAnimating) shout("OnStackBibleCreationComplete");
return { bibleData };
