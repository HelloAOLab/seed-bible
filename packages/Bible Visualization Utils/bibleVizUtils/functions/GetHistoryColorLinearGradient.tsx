const colors = that;
let accumulated = 0;
const gradient = `linear-gradient(0deg, ${colors.map(({color, value}) => { 
    const result = `${color} ${Math.min(100, Math.max(0, Math.round(accumulated * 100)))}%, ${color} ${Math.min(100, Math.max(0, Math.round((accumulated + value) * 100)))}%`
    accumulated += value;
    return result;
}).join(", ")})`

return gradient