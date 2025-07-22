const {useState, useEffect, useMemo, useCallback, useRef} = os.appHooks;
const ranksOfBooks = globalThis.findNameRank("","",true);
globalThis.clickWait = false;

const sortedBooks = Object.entries(ranksOfBooks)
  .sort(([, book1], [, book2]) => {
    return book2.rank - book1.rank;
  });

const handleEnter = async ([bookName,book])=>{

    const targetBook = getBot(byTag("bookRank",book.rank),byTag("bookName",bookName))

    const cloneBook = getBot(byTag("initialized",true),byTag("system","hideAndSeek.arrangementBookClone"));
    if(cloneBook) {
        destroy(cloneBook.id)
        os.unregisterApp("bookSelected");
    };
    
    if(globalThis.clickWait) return;
    globalThis.clickWait = true;

    targetBook.shiftFocus();
    setHotSeatBlinker(book.rank);
    await os.sleep(1000);

    const parentSection = getBot(byTag("isBibleArrangementSection", true), byTag("sectionName", targetBook.tags.sectionName));

    if(!parentSection?.tags.isInExplodedView){
        targetBook.onPointerEnter();      
        await os.sleep(1500);
    }

    setHotSeatBlinker(-1);
    globalThis.clickWait  = false;

    targetBook.onClick({hasShifted: true});
    targetBook.highlightSelf();
    setTimeout(()=>{
        targetBook.forceUnhighlight();
        globalThis.setHotSeatQuery("");
    },2000);
}

const SearchBarHideAndSeek = () => {

    const inputRef = useRef(null);
    const [query, setQuery] = useState("");
    const [blinker,setBlinker] = useState(-1);
    const [selectedTestament, setSelectedTestament] = useState(2);
    const [openSearchBar, setOpenSearchBar] = useState(false);
    const [{
        startIndex,endIndex,winnerBook
    },setIndexs] = useState({
        startIndex: -1,
        winnerBook: -1,
        endIndex:sortedBooks.length
    });
    const [filterIndexUpdate,setFilterIndexUpdate] = useState({
        startIndex: -1,
        endIndex:sortedBooks.length
    })

  useEffect(()=>{
        globalThis.hotseatPlayRange = setIndexs;
        globalThis.setHotSeatBlinker = setBlinker;
        globalThis.setHotSeatQuery = setQuery;
        return ()=>{
            globalThis.setHotSeatQuery = null;
            globalThis.setHotSeatBlinker = null;
            globalThis.hotseatPlayRange = null;
        }
    },[])

    const handleSelectTestament = () => {
        if(selectedTestament === 0){
            setSelectedTestament(1);
        }else if(selectedTestament === 1){
            setSelectedTestament(2)
        }else if(selectedTestament === 2){
            setSelectedTestament(0)
        }
    }

    const booksFiltered = useMemo(()=>sortedBooks.filter(
        book => ((selectedTestament===2 
        ? true : selectedTestament===1 
        ? book[1].testament === "New Testament"
        : book[1].testament === "Old Testament") && book[0].toLocaleLowerCase().includes(query.toLocaleLowerCase()))
    ).filter(book=> book[1].rank > filterIndexUpdate.startIndex && book[1].rank < filterIndexUpdate.endIndex),[selectedTestament,query,filterIndexUpdate]);

    useEffect(()=>{

        const filteIndexUpdate = ()=>{
            setFilterIndexUpdate({
                startIndex,
                endIndex
            })
        };

        const timeout = setTimeout(()=>{
            filteIndexUpdate();
        },2000);

        return ()=>{
            filteIndexUpdate();
            clearTimeout(timeout);
        }
    },[startIndex,endIndex])

    return <>
         <div class="sidebar-results">
           {booksFiltered.map( book => <SideBarBooks 
                    startIndex={startIndex}
                    endIndex={endIndex}
                    setBlinker={setBlinker}
                    blinker={blinker} 
                    winnerBook={winnerBook}
                    key={book[1].rank} 
                    rank={book[1].rank} 
                    name={book[1].commonName} />
            )}
        </div>
        <div
            onClick={() => {setOpenSearchBar(false); inputRef.current.focus();}}
            class={`${openSearchBar ? "open-searchbar" : query.length > 0 ? "open-sidebar-input-container" : "sidebar-input-container"} hide-seek`}
            >
            <div class="box">
                <input
                    type="text"
                    class="input"
                    ref={inputRef}
                    value={query}
                    onInput={e => {
                        setQuery(e.target.value)
                    }}
                    placeholder={"Book name"}
                    onBlur={() => {setOpenSearchBar(false); }}
                    onKeyDown={e => {
                        if(e.key === "Enter" || e.keyCode === 13){
                            if(booksFiltered.length === 0) return os.toast("No Book Matches the search!")
                            handleEnter(booksFiltered[0]);
                        }
                    }}
                />
                <i class="material-symbols-outlined">
                search
                </i>
            </div>
        </div>
    </>
}


const SideBarBooks = ({ rank, name, startIndex, endIndex, winnerBook,blinker }) => {

    const bookBot = useMemo(()=> getBot(byTag("bookRank",rank),byTag("bookName",name)) || {tags:{}}, []);

    const handleClick = useCallback(() => {
        handleEnter([name,{rank}])
    },[]);

    return <>
        <style>
            {`.sidebar-itm-${rank} {
                --bg-color: ${bookBot?.tags?.orginalColor}
            }`}
        </style>
        <span 
            class={`sidebar-itm sidebar-itm-${rank} ${blinker===rank ?"blinker":""} ${(rank === winnerBook) ? "sidebar-selected-itm-win" : (rank <= startIndex || rank >= endIndex) ? "sidebar-selected-itm-disabled" : ""}`} 
            onClick={()=>{handleClick()}}
        >
                {name}
        </span>
    </>
};

return SearchBarHideAndSeek;