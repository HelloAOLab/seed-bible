/**
    * Animates the elements of the Bible to perform an initial open animation.
    * This is called when the Bible is interacted for the first time.
    * 
    * @example
    * thisBot.DisplayInitialBibleOpenAnimation()
*/

shout("OnInitialBibleOpenAnimationStart")
const {bibleData} = that;
const dimension = os.getCurrentDimension();
const animationDuration = bibleData.bibleType === BibleType.PlatformerGame ? 0 : 2;
const lowerCoverPosition = getBotPosition(bibleData.staticBibleElements.lowerCover, dimension);
const lowerCoverScales = GetBotScales(bibleData.staticBibleElements.lowerCover);
const testamentsScales = bibleData.childrenData.map((testamentData) => {return GetBotScales(testamentData.element)});
// const testamentsPositionZ = [
//     lowerCoverPosition.z + lowerCoverScales.z + StackSpacing.BetweenArrangements,
//     lowerCoverPosition.z + lowerCoverScales.z + (StackSpacing.BetweenArrangements*2) + testamentsScales[0].z
// ];
const testamentsPositionZ = bibleData.childrenData.map((testamentData, index) => {
    return  lowerCoverPosition.z + lowerCoverScales.z + (StackSpacing.BetweenArrangements * (index + 1)) + (testamentsScales[0].z * index)
})
const upperCoverPositionZ = testamentsPositionZ[testamentsPositionZ.length - 1] + testamentsScales[testamentsPositionZ.length - 1].z + StackSpacing.BetweenArrangements;
const upperCoverScales = GetBotScales(bibleData.staticBibleElements.upperCover);
const crossPositionZ = upperCoverPositionZ + upperCoverScales.z + StackSpacing.CoverToCross;
const animations = [];

bibleData.childrenData.forEach((testamentData, index) => {
    setTag(testamentData.element, "desiredPositionZ", testamentsPositionZ[index]);
    animations.push(
        animateTag(testamentData.element, dimension + "Z", {
            toValue: testamentsPositionZ[index],
            duration: animationDuration,
            easing: {type: "sinusoidal", mode: "inout"}
        }),
    )
});
animations.push([
    animateTag(bibleData.staticBibleElements.leftCover, "scaleZ", {
        toValue: 0,
        duration: animationDuration,
        easing: {type: "sinusoidal", mode: "inout"}
    }),
    animateTag(bibleData.staticBibleElements.upperCover, dimension + "Z", {
        toValue: upperCoverPositionZ,
        duration: animationDuration,
        easing: {type: "sinusoidal", mode: "inout"}
    }),
    animateTag([bibleData.staticBibleElements.crossVerticalLine, bibleData.staticBibleElements.crossHorizontalLine], dimension + "Z", {
        toValue: crossPositionZ,
        duration: animationDuration,
        easing: {type: "sinusoidal", mode: "inout"}
    })
])

await Promise.all(animations)
    .then(() => {
        setTagMask(bibleData.childrenData.map((testamentData) => {return testamentData.element}), "highlightable", bibleData.bibleType === BibleType.Default);
        setTagMask(bibleData.childrenData.map((testamentData) => {return testamentData.element}), "draggable", bibleData.bibleType === BibleType.Default ? StacksManager.masks.areBibleElementsDraggable : false);
        setTagMask([bibleData.staticBibleElements.crossVerticalLine, bibleData.staticBibleElements.crossHorizontalLine], "pointable", bibleData.bibleType === BibleType.Default);
        setTag(bibleData.staticBibleElements.leftCover, dimension, false);
        return Promise.all(shout("OnInitialBibleOpenAnimationCompleted", {bibleData}));
    })
    .catch((error) => {
        console.log(error)
        shout('OnInitialBibleOpenAnimationFailed')
    });
