/**
 * Initializes the ColorLerper. If the bot is already initialized, it returns early.
 * Otherwise, it sets up the color lerps array and assigns global references to the bot and current lerps.
 *
 * @example
 * ColorLerper.Initialize();
 */

import { ColorLerpsArray } from "colorLerper.main.ColorLerpsArray";

if (
  thisBot.masks.initialized ||
  configBot.tags.systemPortal ||
  globalThis.ColorLerper
)
  return;

setTagMask(thisBot, "initialized", true);

const currentLerps = new ColorLerpsArray({});
globalThis.ColorLerper = thisBot;
globalThis.currentLerps = currentLerps;

shout("OnColorLerperInitialized");
