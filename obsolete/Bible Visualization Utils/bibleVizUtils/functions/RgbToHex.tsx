const {rgbColor = [255,255,255]} = that;

return "#" + ((1 << 24) + (rgbColor[0] << 16) + (rgbColor[1] << 8) + rgbColor[2]).toString(16).slice(1);