/**
    * Creates a new `BibleData` instance, sets up the Bible structure, and initializes it.
    * 
    * @param {Object} that - Context containing various data properties.
    * @param {Object} that.position - The position where the Bible will be placed.
    * 
    * @returns {BibleData} bibleData - The newly created `BibleData` object, including its testaments and static elements.
    * @throws {Error} - If Bible structure creation or setup fails.
    * 
    * @example
    * StacksManager.CreateNewBible({position: {x: 0, y: 0}});
*/

import {BibleData} from 'interactiveBible.managers.StacksManager.BibleData'

let {position, setBibleAnimating = true, bibleType = BibleType.Default, customArrangementIndex} = that;
const dimension = os.getCurrentDimension();
const jarvis = getBot("jarvis", true);
const jarvisPosition = jarvis ? getBotPosition(jarvis, dimension) : null;
let displayJarvisSpawnElementAnimation = false;
if(jarvis && !position  && bibleType === BibleType.Default)
{
    position = {x: jarvisPosition.x, y: jarvisPosition.y}
    displayJarvisSpawnElementAnimation = true
}
if(displayJarvisSpawnElementAnimation) await jarvis.SpawnElementStart({scales: new Vector3(3, 3, 3)})
shout('OnCreateNewBible');
setTagMask(thisBot, "hasStackEverBeenSpawned", true);
if(globalThis?.SetCanvasTools){
    SetCanvasTools(tools => {
        return tools.map(tool => {
            if(tool.label === "Bible stack"){
                return {
                    ...tool,
                    active: false
                }
            }else{
                return tool
            }
        })
    })
}
const arrangementIndex = !isNaN(customArrangementIndex) ? customArrangementIndex : thisBot.GetCurrentArrangementIndex();
const bibleData = new BibleData({bibleType, arrangementIndex, currentCrossPosition: CrossPosition.Top, currentStackVizState: BibleVisualizationState.Regular, id: uuid()});
const {testamentsData, staticBibleElements} = await thisBot.CreateBibleStructure({arrangementIndex, bibleData});
const focusOnRotation = {x: 1.01229, y:0.5};
const focusOnDuration = 1;
const easing = {type: "sinusoidal", mode: "inout"};
testamentsData.forEach((testamentData) => {bibleData.AddChild(testamentData)});
bibleData.staticBibleElements = staticBibleElements;
thisBot.vars.biblesData.push(bibleData);
thisBot.vars.lastInteractedBibleData = bibleData;
thisBot.SetUpBible({bibleData, position, bibleType});


let fixedPosition = new Vector3(position.x, position.y, 2)
const desiredFocusOnPosition = GetFocusOnPositionFromRotation(
    focusOnRotation.y, 
    focusOnRotation.x, 
    fixedPosition
);
os.focusOn({x: desiredFocusOnPosition.x, y: desiredFocusOnPosition.y}, {
    duration: focusOnDuration,
    easing,
    rotation: focusOnRotation,
    zoom: 8
})


if(displayJarvisSpawnElementAnimation) await jarvis.SpawnElementEnd({scales: new Vector3(4.5, 4.5, 4.5)})

await thisBot.SetUpInitialBibleOpen({bibleData});
if(setBibleAnimating) shout('OnBibleCreationComplete');
return {bibleData}