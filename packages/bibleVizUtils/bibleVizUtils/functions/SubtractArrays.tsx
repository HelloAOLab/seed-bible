const {array1, array2} = that;

return array1.filter((element) => {return !array2.includes(element)});