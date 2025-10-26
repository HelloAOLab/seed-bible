/**
 * Makes the grid portal not interactive by disabling panning, zooming, and rotating.
 *
 * @example
 * shout("MakePortalRestrict");
 */
console.log(`[Debug] MakePortalRestrict`)
setTagMask(gridPortalBot, "portalPannable", false);
setTagMask(gridPortalBot, "portalZoomable", false);
setTagMask(gridPortalBot, "portalRotatable", false);