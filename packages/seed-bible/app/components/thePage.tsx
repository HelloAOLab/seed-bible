
import useBibleData from 'app.hooks.bibleData'
import { getStyleOf } from 'app.styles.styler'
const { useEffect, useState, useMemo, useCallback, createRef } = os.appHooks;
import { useMouseMove } from 'app.hooks.mouseMove'
import { useTabsContext } from 'app.hooks.tabs';
import { useBibleContext } from 'app.hooks.bibleVariables'
import { TextFormattingToolbar } from 'app.components.textSettings'
import { DivSpliter } from 'app.hooks.screenDevider'
import { TextEditor } from 'app.components.editor'
function ThePage({ tab: T, setPanalApp }) {

    const [tab, setTab] = useState(T);
    const [tabEntered, setTabEntered] = useState(false)
    const { updateTab, tabs, setActiveTab } = useTabsContext();
    const { isDragging, setIsDragging, Element } = useMouseMove()
    const { navFunctions, setNavFunctions, canvasMode, setTools, setCanvasTools, setMapTools } = useBibleContext()
    const {
        data,
        footnotes,
        loading,
        open,
        // translation,
        openNextChapter,
        openPrevChapter,
        changeTranslation,
        setBaseUrl
    } = useBibleData({
        initialTranslation: tab?.data?.translation,
        initialBookId: tab?.data?.bookId,
        initialChapter: tab?.data?.chapter,
        tab: T,
    });
    function handleMouseEnter() {
        if (!isDragging)
            return
        setTabEntered(true)
    }
    function handleMouseLeave() {
        if (!isDragging)
            return
        setTabEntered(false)
    }
    function Update(tab) {
        os.log('Update-data', tab)
        setTab(tab)
        open(tab.data.bookId, tab.data.chapter, tab.data.translation)
    }
    globalThis.UpdateTab = Update
    function handleMouseUp() {
        if (!isDragging)
            return
        Update(Element.data)
        if (globalThis.GetBooksDataForMenu)
            globalThis.GetBooksDataForMenu(`https://bible.helloao.org/api/${Element.data.data.translation}/books.json`, Element.data.data.translation)
        setIsDragging(false)
        setTabEntered(false)
    }
    function hanldNavFunctions() {
        setNavFunctions({ openNextChapter, openPrevChapter, open, changeTranslation, setPanalApp })
        setActiveTab(tab?.id)
        globalThis.Open = open
        globalThis.ChangeTranslation = changeTranslation
        globalThis.SetPanalApp = setPanalApp
        os.log(tab)
        if (globalThis.GetBooksDataForMenu) {
            os.log(`https://bible.helloao.org/api/${data?.translation}/books.json`)
            globalThis.GetBooksDataForMenu(`https://bible.helloao.org/api/${data?.translation}/books.json`, data?.translation)
        }
    }
    useEffect(() => {
        // os.log({
        //     initialTranslation: tab?.data?.transition,
        //     initialBookId: tab?.data?.bookId,
        //     initialChapter: tab?.data?.chapter,
        // }, 'tab data')
    }, [tab])
    // useEffect(() => {
    //     if (data)
    //         hanldNavFunctions()
    // }, [data])
    useEffect(() => {
        if (data && tab) {
            os.log('updatedData', data)
            updateTab(tab?.id, data)
            // setTab(tabs.find(e => e?.id === tab?.id))
        }
        if (data) {
            hanldNavFunctions()
        }
    }, [data]);


    const [blinker, setBlinker] = useState({});
    const [selected, setSelected] = useState({});
    const [holded, setHolded] = useState({});

    useEffect(() => {
        globalThis.ChangeTranslation = changeTranslation;
        globalThis.SetBaseUrl = setBaseUrl;
        return () => {
            globalThis.SetBaseUrl = null;
            globalThis.ChangeTranslation = null;
        }
    }, [changeTranslation])

    useEffect(() => {
        globalThis.SetBlinker = setBlinker;
        globalThis.SetSelected = setSelected;
        globalThis.SetHolded = setHolded;
        return () => {
            globalThis.SetBlinker = null;
            globalThis.SetSelected = null;
            globalThis.SetHolded = null;
        }
    }, [blinker, selected, holded]);

    const refs = useMemo(() => {
        const refs = {};
        data.content.forEach(({ verses }) => {
            verses.forEach(verse => {
                refs[verse.verseNumber] = createRef();
            });
        });
        return refs;
    }, [data.content]);

    const onScrollToRef = useCallback(({ vNumber = -1 }) => {
        console.log("vNumber", vNumber);
        if (globalThis.ScrollTimerToVerse) {
            clearTimeout(globalThis.ScrollTimerToVerse);
            globalThis.ScrollTimerToVerse = null;
        }

        globalThis.ScrollTimerToVerse = setTimeout(() => {
            if (refs?.[vNumber].current) {
                refs?.[vNumber]?.current?.focus()
            }
        }, 100);
    }, [refs])

    useEffect(() => {
        globalThis.ScrollToVerse = onScrollToRef;
        return () => {
            globalThis.ScrollToVerse = null;
        }
    }, [onScrollToRef]);
    // return <TextEditor /> 
    return !canvasMode && <div
        className="pageContainer"
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
        onMouseUp={handleMouseUp}
        onClick={hanldNavFunctions}
    >
        <link href="https://fonts.cdnfonts.com/css/helvetica-neue-55" rel="stylesheet" />
        <link href="https://fonts.cdnfonts.com/css/montserrat" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..800;1,400..800&display=swap" rel="stylesheet" />
        {tab && !tabEntered ? <>
            <div style={{ 'pointer-events': isDragging ? "none" : null }} className="bookTitle">{`${data?.book} - ${data?.chapter}`}</div>
            {
                data && data.content.map(e => {
                    return <div style={{ 'pointer-events': isDragging ? "none" : null }}>
                        <Section
                            {...e}
                            book={data.book}
                            chapter={data.chapter}
                            blinker={blinker}
                            setRef={refs}
                            holded={holded}
                            selected={selected}
                            textEdit={false}
                        />
                    </div>
                })
            }
        </> :
            <>
                <div
                    className={tabEntered ? 'tabEntered' : 'tabDrop'}
                >
                    <div style={{ 'pointer-events': isDragging ? "none" : null }}>
                        {!tabEntered ? `Please drop tab here` : 'Drop to open !'}
                    </div>
                </div >
            </>
        }
        <style>{getStyleOf('page.css')}</style>
    </div>
}

function Section({ heading, setRef, verses, book, chapter, holded, blinker, selected, textEdit }) {
    const editTextStyle = {
        "border-radius": "6px",
        "border": "2px solid #4459F3",
        "background": "rgba(68, 89, 243, 0.10)",
        "padding": '8px',
        "position": 'relative',
    }
    const styles = {
        font: `'Montserrat', sans-serif`,
        weight: '600',
        color: 'black',
        styles: {
            bold: true,
            italic: false,
            underline: false,
            alignment: 'left',
        },
    }
    return <div>
        <div className="sectionTitle">
            {heading}
        </div>
        <div style={textEdit ? editTextStyle : null}>
            {textEdit && <div className="editVerseTitle">Verse - Text</div>}
            {textEdit &&
                <div style={{ right: '20px', top: '-65px', background: 'transparent' }} className="flexElementGap-4 editVerseTitle">
                    <TextFormattingToolbar sectionStyles={styles} />
                </div>}
            <div className="sectionCover">
                {verses.map(verse => {
                    return <span
                        onClick={() => {
                            os.log({
                                verseNumber: verse.verseNumber,
                                text: verse.text,
                                chapter,
                                book
                            })
                            thisBot.onVerseClick({
                                verseNumber: verse.verseNumber,
                                text: verse.text,
                                chapter,
                                book
                            })
                        }}
                        style={{
                            'text-decoration': (holded?.[verse.verseNumber] || selected[verse.verseNumber] || blinker[verse.verseNumber]) ? `underline` : ``,
                        }}
                        className="sectionText">
                        <span className="sectionTextNumber">{verse?.verseNumber}</span>
                        {verse?.text}
                        <input
                            style={{ opacity: '0', 'pointer-events': 'none', position: 'absolute', 'left': 0, 'top': 0, zIndex: -1 }}
                            placeholder={'test'}
                            ref={(ref) => {
                                if (setRef && setRef[verse.verseNumber]) {
                                    setRef[verse.verseNumber].current = ref
                                }
                            }}
                        />
                    </span>
                })}
            </div>
        </div>
    </div >
}


export const ThePageWithPanel = ({ tab }) => {

    const [panalApp, setPanalApp] = useState(false)
    return <>
        <DivSpliter
            split={panalApp}
            stop={false}
            initialWidth={gridPortalBot.tags.pixelWidth}
            containerWidth={gridPortalBot.tags.pixelWidth}
            containerHeight={1000}
            onResize={() => { }}
            otherTab={

                panalApp
            }
        >
            <ThePage setPanalApp={setPanalApp} tab={tab} />
        </DivSpliter>
    </>
}
export const ThePageWithEditor = ({ tab, setPanalApp }) => {

    return <TextEditor content={<ThePage tab={tab} setPanalApp={setPanalApp} />} tab={tab} />
}
export { ThePage, ThePageWithEditor }