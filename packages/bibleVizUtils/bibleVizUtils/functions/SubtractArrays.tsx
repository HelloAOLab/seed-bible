const {array1, array2} = that;

return array1.filter((piece) => {return !array2.includes(piece)});