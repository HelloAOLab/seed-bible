const mainWord = getBot("isMainWord", true);
if(!introductionManager.masks.isASectionMakingTourGuide && !mainWord.masks.isInBibleAnimation)
{
    const landBetweenManager = getBot("isLandBetweenManager", true);
    setTag(configBot, "gridPortal", null);
    setTag(configBot, "mapPortal", "theLandBetween");
    shout("clearUi")
    landBetweenManager.initializeLandBetween();
}
else
{
    os.toast("Wait for the animation to finish and then try again!");
}