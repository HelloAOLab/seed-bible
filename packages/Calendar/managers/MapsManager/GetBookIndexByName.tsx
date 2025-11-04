const {name} = that;

if(typeof name === "string")
{
    const flattenedBooksList = thisBot.tags.booksList.flat();
    const bookInfo = flattenedBooksList.find((currBookInfo) => {return currBookInfo.name == name});
    if(bookInfo)
    {
        return flattenedBooksList.indexOf(bookInfo);
    }
}
return null;