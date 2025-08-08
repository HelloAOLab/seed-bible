const dimension = os.getCurrentDimension();
const checkpointPosition = getBotPosition(thisBot.vars.lastCheckpoint, dimension);
await os.closeCircleWipe({
    color: "black",
    duration: 1
})
ControllerManager.DisableController();
await os.sleep(100);
setTagMask(thisBot.vars.character, dimension + "X", checkpointPosition.x)
setTagMask(thisBot.vars.character, dimension + "Y", checkpointPosition.y)
setTagMask(thisBot.vars.character, dimension + "Z", checkpointPosition.z + 0.1)
ControllerManager.EnableControllerForBot({bot: thisBot.vars.character})
await os.openCircleWipe({
    color: "black",
    duration: 1
})
shout("OnPlayerRespawned");