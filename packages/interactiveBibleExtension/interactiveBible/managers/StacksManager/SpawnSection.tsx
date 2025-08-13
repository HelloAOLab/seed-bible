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
 * StacksManager.SpawnSection({
 *   name: "Law",
 *   spawnPosition: new Vector3(1, 2, 3)
 * });
 */

import {SectionBookData} from "interactiveBible.managers.StacksManager.SectionBookData"

let sectionData;
const dimension = os.getCurrentDimension();
const jarvis = getBot("jarvis", true);
const jarvisPosition = getBotPosition(jarvis, dimension);


let {spawnPosition} = that;
const {name} = that;
let displayJarvisSpawnElementAnimation = false;
if(jarvis && !spawnPosition)
{
    spawnPosition = jarvisPosition;
    displayJarvisSpawnElementAnimation = true
}
const {arrangementIndex, testamentIndex, sectionIndex, found} = thisBot.GetSectionInfoPathByName({name});
if(found)
{
    sectionData = await thisBot.CreateSection({arrangementIndex, testamentIndex, sectionIndex});
    const desiredScaleZ = sectionData.creationInfo.amountOfChaptersInSection * StackElementMeasurements.SectionDesiredScaleZRatio;
    if(displayJarvisSpawnElementAnimation) await jarvis.SpawnElementStart({scales: new Vector3(
        StackElementMeasurements.SectionScales.x,
        StackElementMeasurements.SectionScales.y,
        desiredScaleZ
    )})
    const section = ObjectPooler.GetObjectFromPool({tag: sectionData instanceof SectionBookData ? ObjectPoolTags.Book : ObjectPoolTags.Section});
    const sectionMod = {
        typeOfElement               : sectionData instanceof SectionBookData ? BibleElementType.SectionBook : BibleElementType.Section,
        arrangementIndex,
        testamentIndex,
        sectionIndex,
        sectionName                 : name,
        amountOfChaptersInSection   : sectionData.creationInfo.amountOfChaptersInSection,
        numberOfChapters            : sectionData instanceof SectionBookData ? sectionData.creationInfo.amountOfChaptersInSection : null,
        bookInfo                    : sectionData instanceof SectionBookData ? sectionData.elementInfo.books[0] : null,
        bookName                    : sectionData instanceof SectionBookData ? sectionData.elementInfo.books[0].commonName : null,
        [dimension]                 : true,
        [dimension + "X"]           : spawnPosition.x,
        [dimension + "Y"]           : spawnPosition.y,
        [dimension + "Z"]           : spawnPosition.z,
        [dimension + "RotationZ"]   : 0,
        scaleX                      : StackElementMeasurements.SectionScales.x,
        scaleY                      : StackElementMeasurements.SectionScales.y,
        scaleZ                      : desiredScaleZ,
        initialScaleX               : StackElementMeasurements.SectionScales.x,
        initialScaleY               : StackElementMeasurements.SectionScales.y,
        hoveredScaleX               : (StackElementMeasurements.SectionScales.x) + StackElementMeasurements.SectionAditionalScaleOnHover,
        hoveredScaleY               : (StackElementMeasurements.SectionScales.y) + StackElementMeasurements.SectionAditionalScaleOnHover,
        initialScaleZ               : desiredScaleZ,
        color                       : sectionData.elementInfo.color,
        orginalColor                : sectionData.elementInfo.color,
        initialColor                : sectionData.elementInfo.color,
        initialExplodedViewScaleZ   : sectionData instanceof SectionBookData ? null : desiredScaleZ * (sectionData.elementInfo.customExplodedViewScaleFactor ?? 2),
        desiredExplodedViewScaleZ   : sectionData instanceof SectionBookData ? null : desiredScaleZ * (sectionData.elementInfo.customExplodedViewScaleFactor ?? 2),
        labelOpacity                : 0,
        formOpacity                 : 0.7,
        labelTextColor              : GetDarkerColor(sectionData.elementInfo.color),
        customColorRange            : sectionData instanceof SectionBookData ? null : sectionData.elementInfo.customColorRange,
        draggable                   : StacksManager.masks.areBibleElementsDraggable,
        desiredPositionZ            : spawnPosition.z,
        toErase                     : true,
        desiredScaleZ
    };
    section.OnSpawned({mod: sectionMod});
    sectionData.element = section;
    sectionData.isActive = true;
    setTagMask(section, 'highlightable', true);
    setTagMask(section, 'isOnTheGround', true);
    if(displayJarvisSpawnElementAnimation) await jarvis.SpawnElementEnd({scales: new Vector3(
        StackElementMeasurements.SectionScales.x,
        StackElementMeasurements.SectionScales.y,
        desiredScaleZ
    )})
}

return {sectionData}