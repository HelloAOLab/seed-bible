const {dimension, portal} = that;
if(dimension == "garden" && portal == "gridPortal" && thisBot.masks.gardenBackgroundColor)
{
    gridPortalBot.tags.portalBackgroundAddress = null;
    gridPortalBot.tags.portalColor = thisBot.masks.gardenBackgroundColor
}