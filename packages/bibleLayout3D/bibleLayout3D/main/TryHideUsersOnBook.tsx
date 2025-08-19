let {layoutBookData} = that;
const {book} = that;
if(!layoutBookData) layoutBookData = thisBot.GetElementData({element: book});
const currUsersColor = thisBot.GetUsersColorOnMapBook({layoutBookData})
currUsersColor.forEach((userColor) => {ObjectPooler.ReleaseObject({obj: userColor, tag: userColor.tags.poolTag})})