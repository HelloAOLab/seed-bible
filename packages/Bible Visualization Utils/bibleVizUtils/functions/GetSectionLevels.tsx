const {books} = that;

const levels = [];
const groupsIncluded = [];
for(const book of books)
{
    if(book.group)
    {
        if(groupsIncluded.includes(book.group)) continue;

        const group = books.filter((sectionBook) => {
            return sectionBook.group === book.group;
        });
        levels.push(group);
        groupsIncluded.push(book.group);
    }
    else
    {
        levels.push([book]);
    }
}
return levels;