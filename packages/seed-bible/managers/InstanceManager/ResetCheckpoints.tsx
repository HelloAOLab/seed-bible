thisBot.vars.lastCheckpoint = null;
const checkpoints = getBots(byTag("isCheckpoint", true));
const fallBoundary = getBot(byTag("isFallBoundary", true))
checkpoints.forEach((checkpoint) => {
    checkpoint.Deactivate();
})
if(fallBoundary) destroy(fallBoundary);