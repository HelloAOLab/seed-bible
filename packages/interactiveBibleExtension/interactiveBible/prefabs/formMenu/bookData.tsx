let BookData = await web.get(masks?.booksLink || tags.BookUrl)

let Books = [];
let PsalmsData = [
    {
        commonName: "1 Psalms",
        startingBook: 0,
        endingBook: 40
    },
    {
        commonName: "2 Psalms",
        startingBook: 41,
        endingBook: 71
    },
    {
        commonName: "3 Psalms",
        startingBook: 72,
        endingBook: 88
    },
    {
        commonName: "4 Psalms",
        startingBook: 89,
        endingBook: 105
    },
    {
        commonName: "5 Psalms",
        startingBook: 106,
        endingBook: 149
    },
];

for (let i = 0; i < BookData.data.books.length; i++) {
    Books.push(BookData.data.books[i]);
}
return Books