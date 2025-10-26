const colors = that;

const fixedColors = [...colors, colors[0]]
const step = 360 / colors.length;
const diffuse = 0;
const offset = 45;
const gradient = `conic-gradient(from ${offset}deg, ${fixedColors.map((color, index) => { 
    return `${color} ${Math.max(0, Math.min(360, (step * index) - offset + (index === 0 ? 0 : diffuse)))}deg ${Math.max(0, Math.min(360, (step * (index + 1)) - diffuse - offset))}deg` 
}).join(", ")})`;
return gradient