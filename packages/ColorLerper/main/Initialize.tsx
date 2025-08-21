/**
 * Initializes the LerpColorManager. If the bot is already initialized, it returns early. 
 * Otherwise, it sets up the color lerps array and assigns global references to the bot and current lerps.
 *
 * @example
 * LerpColorManager.Initialize();
 */

import { ColorLerpsArray } from "ColorLerper.main.ColorLerpsArray";

if(thisBot.masks.initialized || configBot.tags.systemPortal || ColorLerper) return;

setTagMask(thisBot, "initialized", true);

const currentLerps = new ColorLerpsArray({});
globalThis.ColorLerper = thisBot;
globalThis.currentLerps = currentLerps;