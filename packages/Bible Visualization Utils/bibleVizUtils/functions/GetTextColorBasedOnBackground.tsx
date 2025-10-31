let { backgroundColor } = that;

/* For further reference visit https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio */

backgroundColor = Array.isArray(backgroundColor) ? backgroundColor : [backgroundColor];

let totalWeightedLuminance = 0;
let totalWeight = 0;

for (const { color, value = 1 } of backgroundColor) {
  const backgroundColorRGB = thisBot.HexToRgb({ hexColor: color });
  const srgb = backgroundColorRGB.map(c => c / 255);
  const linearRGB = srgb.map(i =>
    i <= 0.04045 ? i / 12.92 : Math.pow((i + 0.055) / 1.055, 2.4)
  );
  const relativeLuminance = 0.2126 * linearRGB[0] + 0.7152 * linearRGB[1] + 0.0722 * linearRGB[2];

  totalWeightedLuminance += relativeLuminance * value;
  totalWeight += value;
}

// si los valores no suman 1, se normaliza igualmente
const averageRelativeLuminance = totalWeightedLuminance / totalWeight;

return averageRelativeLuminance > 0.179 ? "#000000" : "#ffffff";
