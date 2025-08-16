const {typeOfElement, key} = that;

const entries = BibleVizUtils.Data.vars.history.filter((entry) => {return entry.typeOfElement == typeOfElement && entry.key == key});
return entries