const { useState, useEffect, useCallback, useMemo } = os.appHooks;
const css = thisBot.tags["App.css"];

const App = ({chapter}) => {
    const [open, setOpen] = useState(false);
    const [bookName, setBookName] = useState("");
    const [book, setBook] = useState(null);
    
    const changeForm = (form) => {
        const selectedBot = getBot(byID(tags.selectedBot))
        selectedBot.tags.form = form
        setTimeout(() => {
            shout('closeFormMenu')
        }, 900)
    }

    const closeApp = ({book, chapter}) => {
        bible.openAt(`${book} ${chapter}:1`);
        updateCustomHeight(0.8)
        shout('closeFormMenu')
    }

    const renderChapters = useMemo(() => {
        if(book){
            let renderJSX = [];
            if(book.startingBook || book.startingBook === 0){
                for(let i = book.startingBook; i < book.endingBook + 1; i++){
                    renderJSX.push(<div className={`chapter ${chapter === i + 1 ? "blinker" : ""}`} onClick={() => closeApp({book: book.commonName, chapter: i + 1})}><span>{i+1}</span></div>)
                }
            }else{
                for(let i = 0; i < book.numberOfChapters; i++){
                    renderJSX.push(<div className={`chapter ${chapter === i + 1 ? "blinker" : ""}`} onClick={() => closeApp({book: book.commonName, chapter: i + 1})}><span>{i+1}</span></div>)
                }
            }
            console.log(renderJSX)
            return [...renderJSX]
        }else{
            return []
        }
    }, [book])
    useEffect(() => {
        setTimeout(() => {
            setOpen(true)
        }, 10)
    }, [])

    const init = () => {
        let selectedBookBot = getBot(byTag("id", masks.selectedBot));
        let bookPromise = thisBot.bookData();
        Promise.resolve(bookPromise).then((data) => {
            let bookfound = false;
            for(let i = 0; i < data.length; i++){
                switch(selectedBookBot.tags.bookName){
                    case(data[i].commonName): {
                        setBook(data[i]);
                        setBookName(data[i].commonName);
                        bookfound = true;
                        break
                    }
                    case("1 Psalms"): {
                        setBook({
                            startingBook: 0,
                            endingBook: 40
                        });
                        setBookName("1 Psalms");
                        bookfound = true;
                        break
                    }
                    case("2 Psalms"): {
                        setBook({
                            startingBook: 41,
                            endingBook: 71
                        });
                        setBookName("2 Psalms");
                        bookfound = true;
                        break
                    }
                    case("3 Psalms"): {
                        setBook({
                            startingBook: 72,
                            endingBook: 88
                        });
                        setBookName("3 Psalms");
                        bookfound = true;
                        break
                    }
                    case("4 Psalms"): {
                        setBook({
                            startingBook: 89,
                            endingBook: 105
                        });
                        setBookName("4 Psalms");
                        bookfound = true;
                        break
                    }
                    case("5 Psalms"): {
                        setBook({
                            startingBook: 106,
                            endingBook: 149
                        });
                        setBookName("5 Psalms");
                        bookfound = true;
                        break
                    }
                }
            }
            if(!bookfound){
                console.log(selectedBookBot.tags.bookName)
                // os.toast("something went wrong");
            }
        }).catch(() => {
            // os.toast("something went wrong");
        })
    }

    useEffect(() => {
        init();
    }, [])

    useEffect(() => {
        if(book && chapter){
            if(chapter > book?.numberOfChapters || (chapter < book?.startingBook - 1 || chapter - 1 > book?.endingBook)){
                os.toast("that chapter doesn't exist")
            }
        }
    }, [book])


    return (
        <>
            <style>{css}</style>
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />

            {book &&
                <div className="book-container">
                    <div className="pointer-1"></div>
                    <div className="dash-line"></div>
                    <div
                    className="book-section"
                    id="chapterContainer"
                    onPointerEnter={() => {
                        setTagMask(gridPortalBot, "portalZoomable", false);
                    }}
                    onPointerLeave={(e) => {
                        if (e.currentTarget.id == "chapterContainer"){
                            setTagMask(gridPortalBot, "portalZoomable", true);
                        }
                    }}
                    >
                        <div className="title-container">
                            <span>{bookName}</span>
                        </div>
                        <div
                        className="chapter-container"
                        >
                            {
                                renderChapters.map(chapter => {
                                    return chapter
                                })
                            }
                        </div>
                        <div class="footer">
                            <span onClick={closeApp} class="close-btn">X</span>
                        </div>
                    </div>
                </div>
            }
        </>
    )
}

return App
