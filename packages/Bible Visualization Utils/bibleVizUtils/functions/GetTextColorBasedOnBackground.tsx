const { backgroundColor } = that;

/* For further reference visit https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio */

const backgroundColorRGB = thisBot.HexToRgb({ hexColor: backgroundColor });
const srgb = [
  backgroundColorRGB[0] / 255,
  backgroundColorRGB[1] / 255,
  backgroundColorRGB[2] / 255,
];
const linearRGB = srgb.map((i) =>
  i <= 0.04045 ? i / 12.92 : Math.pow((i + 0.055) / 1.055, 2.4)
);
const relativeLuminance =
  0.2126 * linearRGB[0] + 0.7152 * linearRGB[1] + 0.0722 * linearRGB[2];

return relativeLuminance > 0.179 ? "#000000" : "#ffffff";
