const {color} = that;

const colorOffset = 55;
const rgbColor = thisBot.HexToRgb({hexColor: color});
const darkerColorRGB = [Math.max(rgbColor[0] - colorOffset, 0), Math.max(rgbColor[1] - colorOffset, 0), Math.max(rgbColor[2] - colorOffset, 0)];
const darkerColorHex = thisBot.RgbToHex({rgbColor: darkerColorRGB});

return darkerColorHex;