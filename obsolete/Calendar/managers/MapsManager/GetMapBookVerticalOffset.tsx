const {layerIndex} = that;

if(layerIndex == 0) return 0

const slicedArray = thisBot.tags.booksList.slice(0, layerIndex)

const offset = slicedArray.reduce((accumulator, layer) => {return accumulator + layer[0].height}, 0);

return offset;