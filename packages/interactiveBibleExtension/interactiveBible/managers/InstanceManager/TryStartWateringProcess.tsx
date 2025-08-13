if(thisBot.masks.wateringProcessStarted) return;

setTagMask(thisBot, "wateringProcessStarted", true);
await thisBot.FillWaterBucket();