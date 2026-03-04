const { hexColor = "" } = that;

let color = hexColor;

if (hexColor[0] === "#") {
  color = color.slice(1);
}
const r = parseInt(color.substring(0, 2), 16);
const g = parseInt(color.substring(2, 4), 16);
const b = parseInt(color.substring(4, 6), 16);
return [r, g, b];
