if (that?.refer) return that;

try{
    const {verse} = that
    const BookData = await thisBot.fetchBookData()

    function parseBibleReference(reference) {
        const parts = reference.split(" ");
        const book = parts.slice(0, parts.length - 2).join(" ");
        const chapterVerse = parts[parts.length - 2].split(":");
        const chapter = parseInt(chapterVerse[0]);
        const verses = chapterVerse[1].split("-");
        const startVerse = parseInt(verses[0]);
        const endVerse = verses.length > 1 ? parseInt(verses[1]) : startVerse;
        const translation = parts[parts.length - 1];

        return {
            book: book,
            chapter: chapter,
            startVerse: startVerse,
            endVerse: endVerse,
            translation: translation
        };
    }


    const data = parseBibleReference(verse)
    // os.log(data)
    // return
    const array = []
    for(const element of BookData){
        if(element.name === data.book){
                let book = data.book
                // os.log(book)
                book = book.replace(/ /g, "_")
                const chapterData = await web.get(`${tags.mainUrl}/api/BSB/${book}/${data.chapter}.json`)
                const content = chapterData.data.chapter.content
                // os.log(content)
                for(const c of content){
                    if(c?.number >= data.startVerse && c?.number <= data.endVerse){
                        const verse = c['content']
                            // os.log(verse,c,'ver')
                            const verseArray = Object.keys(verse)
                            if(typeof verse === 'object'){
                                for(const v in verseArray){
                                    // os.log((verse[v]),'tok')
                                    if(typeof verse[v] === 'object')
                                    array.push(verse[v]?.text)
                                    else
                                    array.push(verse[v])

                                }
                            }
                            else{
                                array.push(verse)
                            }
                    }
                }
        }
    }

    // os.log(array,'array')
    return {verse:array.join(' '),data:data}
}catch{
    const [verseFallback,referFallback] = introductionManager.tags.TOP30[8].split("IN~VERSE");
    returnthisBot.getVerse({verse: verseFallback,refer: referFallback})
}