ControllerManager.DisableController();
thisBot.SetGameState({state: GameState.WaitingToStart})
await thisBot.ShowPlatformerGameLoadingScreen();
await os.sleep(100)
gridPortalBot.masks.portalCameraType = "orthographic"
thisBot.ResetCheckpoints();
thisBot.ResetCharacter();
thisBot.ResetCountdownTimer();
thisBot.ResetGameTime();
await os.focusOn(thisBot.vars.platformerGameBibleData.staticBibleElements.bibleTransformer, {
    duration: 0,
    zoom: 10,
    rotation: {x: 0.75, y: 0.7853982}
})
gridPortalBot.masks.portalCameraType = "perspective"
await os.sleep(500);
await thisBot.HidePlatformerGameLoadingScreen();
thisBot.SetGameState({state: GameState.CountdownToStart})
ControllerManager.EnableControllerForBot({bot: thisBot.vars.character});