/**
 * Clears any active video display and lerping timeouts.
 * This function ensures that no lingering timeouts affect the video rendering process.
 *
 * @example
 * InstanceManager.TryClearVideoTimeout();
 */

if(globalThis.videoShowTimer) {
    clearTimeout(globalThis.videoShowTimer);
}
if(globalThis.LERP_YT_TIMEOUT) {
    clearTimeout(globalThis.LERP_YT_TIMEOUT);
}