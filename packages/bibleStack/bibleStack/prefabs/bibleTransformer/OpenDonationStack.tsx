// // that parameters: {duration: float, easing: {type: string, mode: string}}

// const {duration = 0.5, easing = {type: "sinusoidal", mode: "inout"}} = that ?? {};
// const dimension = os.getCurrentDimension();
// const lowerCover = getBot("isLowerCover", true);
// const upperCover = getBot("isUpperCover", true);
// const crossVerticalLine = getBot("isCrossVerticalLine", true);
// const crossHorizontalLine = getBot("isCrossHorizontalLine", true);
// const bibleTransformerPosition = getBotPosition(thisBot, dimension);
// const lowerCoverPosition = getBotPosition(lowerCover, dimension);
// const lowerCoverScales = BibleVizUtils.Functions.GetBotScales(lowerCover);
// const containerScaleXYFactor = 0.81;
// const containerInitialScaleZ = 0;
// const containerScales = {x: lowerCoverScales.x * containerScaleXYFactor, y: lowerCoverScales.y * containerScaleXYFactor};
// const focusOnRotation = {x: 1.01229, y:0.5};
// const focusOnPositionOffsetZ = 12
// const desiredFocusOnPosition = GetFocusOnPositionFromRotation({
//     theta: focusOnRotation.y, 
//     phi: focusOnRotation.x, 
//     botPosition: new Vector3(bibleTransformerPosition.x, bibleTransformerPosition.y, (bibleTransformerPosition.z) + focusOnPositionOffsetZ)
// });
// const continerScaleZFactor = 0.02;
// const containerInitialPositionZ = 0;
// const animations = [];
// let nextPositionZ = lowerCoverPosition.z + lowerCoverScales.z + BibleVizUtils.Data.tags.StackSpacing.BetweenArrangements;
// const containers = [];
// let upperCoverOpenedPositionZ;
// let crossOpenedPositionZ;
// let i = 0;

// os.focusOn({x: desiredFocusOnPosition.x, y: desiredFocusOnPosition.y}, {
//     duration,
//     easing,
//     rotation: focusOnRotation,
//     zoom: 5
// })


// for(const testamentData of StackManager.vars.bibleStructure)
// {
//     nextPositionZ += BibleVizUtils.Data.tags.StackSpacing.BetweenSections;
//     for(const sectionData of testamentData.sectionsData)
//     {
//         const desiredScaleZ = sectionData.section.tags.amountOfChaptersInSection * continerScaleZFactor;
//         const container = ObjectPooler.GetObjectFromPool({tag: BibleVizUtils.Data.tags.ObjectPoolTags.DonationContainer});
        
//         if(container)
//         {
//             const containerMod = {
//                 [dimension]: true,
//                 [dimension + "X"]: 0,
//                 [dimension + "Y"]: 0,
//                 [dimension + "Z"]: containerInitialPositionZ,
//                 scaleX: containerScales.x,
//                 scaleY: containerScales.y,
//                 scaleZ: containerInitialScaleZ,
//                 desiredPositionZ: nextPositionZ,
//                 testamentName: testamentData.testament.tags.testamentName,
//                 sectionName: sectionData.section.tags.sectionName,
//                 transformer: getID(thisBot),
//                 containerIndex: i,
//                 creator: null,
//                 desiredScaleZ
//             }
//             container.OnSpawned({mod: containerMod});
//             containers.push(container);
//             i++;
//             animations.push(
//                 animateTag(container, {
//                     fromValue: {
//                         [dimension + 'Z']: containerInitialPositionZ,
//                         scaleZ: containerInitialScaleZ
//                     },
//                     toValue: {
//                         [dimension + 'Z']: nextPositionZ,
//                         scaleZ: desiredScaleZ
//                     },
//                     duration,
//                     easing
//                 })
//             )
//             nextPositionZ += (desiredScaleZ + BibleVizUtils.Data.tags.StackSpacing.BetweenSections);
//         }
//     }
//     nextPositionZ += BibleVizUtils.Data.tags.StackSpacing.BetweenArrangements
// }

// animations.push(
//     animateTag(upperCover, dimension + "Z", {
//         toValue: nextPositionZ,
//         duration,
//         easing
//     })
// );

// nextPositionZ += (lowerCoverScales.z + BibleVizUtils.Data.tags.StackSpacing.CoverToCross);

// animations.push(
//     animateTag([crossVerticalLine, crossHorizontalLine], dimension + "Z", {
//         toValue: nextPositionZ,
//         duration,
//         easing
//     })
// );

// await Promise.allSettled(animations);

// setTagMask(thisBot, "isBibleClosed", false);

// StackManager.TrySetPiecesRenderOrder(containers);

// return true;