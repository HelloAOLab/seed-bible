/**
 * Initializes the LerpColorManager. If the bot is already initialized, it returns early. 
 * Otherwise, it sets up the color lerps array and assigns global references to the bot and current lerps.
 *
 * @example
 * LerpColorManager.Initialize();
 */

import { ColorLerpsArray } from "interactiveBible.managers.LerpColorManager.ColorLerpsArray";

if(thisBot.masks.initialized) return;

setTagMask(thisBot, "initialized", true);

let currentLerps = new ColorLerpsArray({});
globalThis.LerpColorManager = thisBot;
globalThis.currentLerps = currentLerps;