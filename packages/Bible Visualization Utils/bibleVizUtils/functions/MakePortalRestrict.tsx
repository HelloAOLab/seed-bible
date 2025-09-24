/**
 * Makes the grid portal not interactive by disabling panning, zooming, and rotating.
 *
 * @example
 * shout("MakePortalRestrict");
 */

setTagMask(gridPortalBot, "portalPannable", false);
setTagMask(gridPortalBot, "portalZoomable", false);
setTagMask(gridPortalBot, "portalRotatable", false);