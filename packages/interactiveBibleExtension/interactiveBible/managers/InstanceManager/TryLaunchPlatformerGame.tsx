const targetDimension = "platformerGame"
if(!thisBot.masks.isPlatformerGameInitialized)
{
    setTagMask(thisBot, "isPlatformerGameInitialized", true);
    thisBot.SetGameState({state: GameState.WaitingToStart})
    await thisBot.ShowPlatformerGameLoadingScreen();
    os.goToDimension(targetDimension);
    await os.sleep(100)
    gridPortalBot.masks.portalCameraType = "perspective"
    const biblePosition = {x: 0, y: 0}
    const {bibleData} = await StacksManager.CreateNewBible({position: biblePosition, bibleType: BibleType.PlatformerGame, customArrangementIndex: 4});
    thisBot.vars.platformerGameBibleData = bibleData;
    bibleData.currentStackVizState = BibleVisualizationState.Expanded;
    await StacksManager.SelectAllSections({bibleData, isInstantaneous: true});
    await StacksManager.UpdateStacks({isInstantaneous: true});
    thisBot.SpawnCheckpoints();
    thisBot.SpawnGoalZone();
    await thisBot.HidePlatformerGameLoadingScreen();
    const character = thisBot.SpawnCharacter({dimension: targetDimension});
    thisBot.ResetCharacter()
    try
    {
        await os.focusOn(bibleData.staticBibleElements.upperCover, {
            duration: 0,
            rotation: {x: 0.75, y: 3.926991}
        })
        await os.sleep(1000)
        await os.focusOn(bibleData.staticBibleElements.bibleTransformer, {
            duration: 5,
            easing: {type: "sinusoidal", mode: "inout"},
            rotation: {x: 0.75, y: 0.7853982}
        })
    }
    catch(error){console.log(error)}
    await thisBot.ShowHUD();
    thisBot.ResetCountdownTimer()
    thisBot.SetGameState({state: GameState.CountdownToStart})
    ControllerManager.EnableControllerForBot({bot: character});
}