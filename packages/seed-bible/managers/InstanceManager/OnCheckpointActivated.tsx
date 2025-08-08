const {checkpoint} = that;
const dimension = os.getCurrentDimension();
const currCheckpointPosition = getBotPosition(checkpoint, dimension);
const lastCheckpointPosition = thisBot.vars.lastCheckpoint ? getBotPosition(thisBot.vars.lastCheckpoint, dimension) : null;
if(!thisBot.vars.lastCheckpoint || currCheckpointPosition.z >= lastCheckpointPosition.z)
{
    thisBot.vars.lastCheckpoint = checkpoint;
    const fallBoundaryScales = GetBotScales(links.fallBoundary);
    const fallBoundaryOffset = 5
    let fallBoundary = getBot(byTag("isFallBoundary", true))
    if(!fallBoundary)
    {
        fallBoundary = create(links.fallBoundary, {
            space: "tempLocal",
            [dimension]: true,
            isFallBoundary: true
        })
        shout("OnCollisionBotAdded");
    }
    setTag(fallBoundary, dimension + "X", currCheckpointPosition.x);
    setTag(fallBoundary, dimension + "Y", currCheckpointPosition.y);
    setTag(fallBoundary, dimension + "Z", currCheckpointPosition.z - fallBoundaryOffset - fallBoundaryScales.z);
}