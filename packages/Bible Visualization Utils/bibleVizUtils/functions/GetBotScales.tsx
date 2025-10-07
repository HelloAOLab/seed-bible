const bot = that;

const scales = {
  x: bot.masks.scaleX ?? bot.tags.scaleX ?? 1,
  y: bot.masks.scaleY ?? bot.tags.scaleY ?? 1,
  z: bot.masks.scaleZ ?? bot.tags.scaleZ ?? 1,
};

return scales;
