const dimension = os.getCurrentDimension();
const checkpointPlatforms = getBots(byTag(dimension, true), byTag("isCheckpointPlatform", true));
checkpointPlatforms.forEach((platform) => {
    const platformPosition = GetFixedPosition({bot: platform, dimension});
    const platformScales =  GetFixedScales({bot: platform});
    const checkpointPosition = new Vector3(platformPosition.x, platformPosition.y, platformPosition.z + platformScales.z)
    const checkpoint = create(links.checkpoint, {
        space: "tempLocal",
        [dimension]: true,
        [dimension + "X"]: checkpointPosition.x,
        [dimension + "Y"]: checkpointPosition.y,
        [dimension + "Z"]: checkpointPosition.z,
        isCheckpoint: true
    })
})