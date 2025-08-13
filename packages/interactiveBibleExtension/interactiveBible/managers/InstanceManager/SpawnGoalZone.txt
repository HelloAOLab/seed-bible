const dimension = os.getCurrentDimension();
const platform = getBot(byTag(dimension, true), byTag("isGoalZonePlatform", true));
if(platform)
{
    const goalZoneArrowOffset = 0.5;
    const platformPosition = GetFixedPosition({bot: platform, dimension});
    const platformScales =  GetFixedScales({bot: platform});
    const goalZonePosition = new Vector3(platformPosition.x, platformPosition.y, platformPosition.z + platformScales.z)
    const goalZoneScales = new Vector3(platformScales.x, platformScales.y, 1)
    const goalZoneArrowPosition = new Vector3(
        goalZonePosition.x,
        goalZonePosition.y,
        goalZonePosition.z + goalZoneScales.z + goalZoneArrowOffset,
    )
    const goalZone = create(links.goalZone, {
        space: "tempLocal",
        [dimension]: true,
        [dimension + "X"]: goalZonePosition.x,
        [dimension + "Y"]: goalZonePosition.y,
        [dimension + "Z"]: goalZonePosition.z,
        scaleX: goalZoneScales.x,
        scaleY: goalZoneScales.y,
        scaleZ: goalZoneScales.z
    })
    const goalZoneArrow = create(links.goalZoneArrow, {
        space: "tempLocal",
        [dimension]: true,
        [dimension + "X"]: goalZoneArrowPosition.x,
        [dimension + "Y"]: goalZoneArrowPosition.y,
        [dimension + "Z"]: goalZoneArrowPosition.z,
        initialPositionZ: goalZoneArrowPosition.z
    })
    goalZoneArrow.DisplayFloatAnimation();
}