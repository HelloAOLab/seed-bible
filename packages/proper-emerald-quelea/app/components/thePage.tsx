
import { BibleDataManager } from 'app.hooks.bibleDataManager'
import { getStyleOf } from 'app.styles.styler'
const { useEffect, useState, useMemo, useCallback, useLayoutEffect, createRef } = os.appHooks;
import { useMouseMove } from 'app.hooks.mouseMove'
import { useTabsContext } from 'app.hooks.tabs';
import { useBibleContext } from 'app.hooks.bibleVariables'
import { TextFormattingToolbar } from 'app.components.textSettings'
import { DivSpliter } from 'app.hooks.screenDevider'
import { TextEditor } from 'app.components.editor'
import { MiniTextEditor } from 'app.components.smallEditor'

// Additions ------>
import { StudyNotes, StudyNotesWithPanel } from 'app.sn_components.studyNotes';

function ThePage({ tab: T, setPanalApp, panelId, setEnableEditor, setData, data }) {
    const [tab, setTab] = useState(T);
    const [tabEntered, setTabEntered] = useState(false)
    const { updateTab, tabs, setActiveTab } = useTabsContext();
    const { isDragging, setIsDragging, Element } = useMouseMove()
    const { navFunctions, setNavFunctions } = useBibleContext()

    const [bible, setBible] = useState()
    if (tab)
        globalThis[`SetEnableEditorOf${tab?.id}`] = setEnableEditor;
    async function loadData() {
        if (!tab)
            return
        const bible = new BibleDataManager({
            tabId: tab?.id,
            translation: tab.data.translation,
            bookId: tab.data.bookId,
            chapter: tab.data.chapter,
        });
        setBible(bible)

        console.log("bible data: ", bible);

        await bible.fetch();

        // Additional Data ----------->
        globalThis.BookId = bible.bookId;

        const { data, loading, error } = bible.getState();
        console.log(data, tab, 'the data loaded')
        setData(data)
        // setContent(data)
        // await bible.openNext();

        // await bible.changeTranslation('KJV');
    }
    useEffect(() => {
        loadData()
    }, [tab])
    useEffect(() => {
        if (data) {
            hanldNavFunctions()
            updateTab(tab?.id, data)
            if (panelId && tab) {
                os.log('recoreded', panelId, { ...tab, data: { ...tab.data, ...data } })
                globalThis.PanelTabsMap[panelId] = { ...tab, data: { ...tab.data, ...data } };
            }
        }
    }, [data])
    // const {
    //     data,
    //     footnotes,
    //     loading,
    //     open,
    //     // translation,
    //     openNextChapter,
    //     openPrevChapter,
    //     changeTranslation,
    // } = useBibleData({
    //     initialTranslation: tab?.data?.translation,
    //     initialBookId: tab?.data?.bookId,
    //     initialChapter: tab?.data?.chapter,
    //     tab: T,
    // });
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

    function handleMouseUp() {
        if (!isDragging)
            return
        Update(Element.data)
        if (globalThis.GetBooksDataForMenu)
            globalThis.GetBooksDataForMenu(`https://bible.helloao.org/api/${Element.data.data.translation}/books.json`, Element.data.data.translation)
        setIsDragging(false)
        setTabEntered(false)
    }
    async function openNextChapter() {
        await bible.openNext()
        setData(bible.data)

        // Additions ------>
        globalThis.GlobalChapter = bible.data.chapter - 1;

        if (globalThis.studyNotesPresent) {
            UpdateApplication(globalThis.STUDYNOTES_PANEL_ID, {
                App: <StudyNotes id={globalThis.STUDYNOTES_PANEL_ID} chapter={globalThis.GlobalChapter} />,
                to: 'panel',
            })
        }
    }
    async function openPrevChapter() {
        await bible.openPrevious()
        setData(bible.data)

        // Additions ------>
        globalThis.GlobalChapter = bible.data.chapter - 1;

        if (globalThis.studyNotesPresent) {
            UpdateApplication(globalThis.STUDYNOTES_PANEL_ID, {
                App: <StudyNotes id={globalThis.STUDYNOTES_PANEL_ID} chapter={globalThis.GlobalChapter} />,
                to: 'panel',
            })
        }
    }
    async function open(bookId, chapter, translation = null) {
        await bible.open(bookId, chapter, translation = null)
        setData(bible.data)
    }
    async function changeTranslation(id) {
        await bible.changeTranslation(id)
        setData(bible.data)
    }
    function hanldNavFunctions() {
        //  bible.openNext()
        // console.log(bible, 'nextChapterData')
        if (tab && tab?.id)
            setActiveTab(tab?.id)
        setNavFunctions({ openNextChapter, openPrevChapter, open, changeTranslation: bible?.changeTranslation || undefined, setPanalApp: () => { } })
        globalThis.Open = open
        globalThis.ChangeTranslation = changeTranslation
        globalThis.SetPanalApp = () => { }
        //     os.log(tab)
        //     if (globalThis.GetBooksDataForMenu) {
        //         os.log(`https://bible.helloao.org/api/${data?.translation}/books.json`)
        //         globalThis.GetBooksDataForMenu(`https://bible.helloao.org/api/${data?.translation}/books.json`, data?.translation)
        //     }

        // Additions ------>
        globalThis.GlobalChapter = data.chapter - 1;

        if (globalThis.studyNotesPresent) {
            UpdateApplication(globalThis.STUDYNOTES_PANEL_ID, {
                App: <StudyNotes id={globalThis.STUDYNOTES_PANEL_ID} chapter={globalThis.GlobalChapter} />,
                to: 'panel',
            })
        }

    }
    function Update(tab) {
        // return
        os.log('Update-data', tab)
        setTab(tab)
        hanldNavFunctions()
        // globalThis.PanelTabsMap[id]
        // open(tab.data.bookId, tab.data.chapter, tab.data.translation)
    }
    globalThis.UpdateTab = Update
    // useEffect(() => {
    //     if (data && tab) {
    //         os.log('updatedData', data)
    //         updateTab(tab?.id, data)
    //         if (panelId && tab) {
    //             os.log('recoreded', panelId, { ...tab, data: { ...tab.data, ...data } })
    //             globalThis.PanelTabsMap[panelId] = { ...tab, data: { ...tab.data, ...data } };
    //         }
    //         // setTab(tabs.find(e => e?.id === tab?.id))
    //     }
    //     if (data) {
    //         hanldNavFunctions()
    //     }
    // }, [data]);


    const [blinker, setBlinker] = useState({});
    const [selected, setSelected] = useState({});
    const [holded, setHolded] = useState({});

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
    // const refs = {}
    const refs = useMemo(() => {
        const refs = {};
        if (data && data.content)
            data.content.forEach(({ verses }) => {
                verses.forEach(verse => {
                    refs[verse.verseNumber] = createRef();
                });
            });
        return refs;
    }, [data]);

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
    // if (data)
    const [highlightOnce, setHighlightOnce] = useState(false);

    useEffect(() => {
        setHighlightOnce(true);
        const timer = setTimeout(() => setHighlightOnce(false), 800); // matches animation duration
        return () => clearTimeout(timer);
    }, []);
    return <div
        className="pageContainer"
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
        onMouseUp={handleMouseUp}
        onClick={hanldNavFunctions}
    >
        <link href="https://fonts.cdnfonts.com/css/helvetica-neue-55" rel="stylesheet" />
        <link href="https://fonts.cdnfonts.com/css/montserrat" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..800;1,400..800&display=swap" rel="stylesheet" />
        {data && tab && !tabEntered ? <>
            <div style={{ 'pointer-events': isDragging ? "none" : null }} className="bookTitle">{`${data?.book} - ${data?.chapter}`}</div>
            {
                data && data.content.map(e => {
                    return <>
                        <div style={{ 'pointer-events': isDragging ? "none" : null }}>
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
                    </>
                })
            }
            <div style={{ height: '200px' }}></div>
        </> :
            <>
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    className={`pageContainer ${tabEntered ? 'tabEntered' : 'tabDrop'} ${highlightOnce ? 'tabHighlightBg' : ''}`}
                >
                    <div
                        style={{
                            pointerEvents: isDragging ? 'none' : undefined,
                            display: 'flex',
                            flexDirection: 'column',
                            textAlign: 'center',
                        }}
                    >
                        {!tabEntered ? `Please drop tab here` : 'Drop to open !'}
                        <div
                            style={{
                                textAlign: 'center',
                                color: '#666',
                                margin: '20px 0',
                                fontSize: '14px',
                            }}
                        >
                            ──────── OR ────────
                        </div>

                        <button
                            onClick={() => {
                                globalThis.UpdateTab = Update
                                hanldNavFunctions()
                                setOpenSidebar(true);
                                setCurrentExperience(0);
                                globalThis.MakingNewTab = Update;
                            }}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: 'gray',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            Select Book/Chapter
                        </button>
                    </div>
                </div>
            </>
        }

    </div>
}

// Additions ------>
/**
 * Split text into chunks of words vs. exact section-keys,
 * matching any multi-word subphrase (≥2 words) *and* any single-word keys.
 */
function splitBySectionKeys(text, verseSectionMap) {
    const stripRe = /[.,'"“”‘’]/g;

    // 1) Build a map of all subphrases (length ≥2) and single-word keys → parent key
    const subphraseMap = {};
    let maxLen = 1;

    Object.keys(verseSectionMap).forEach(fullKey => {
        // normalize the key
        const normalized = fullKey.replace(stripRe, '').trim();
        const wordsKey = normalized.split(/\s+/);
        const n = wordsKey.length;
        maxLen = Math.max(maxLen, n);

        if (n === 1) {
            // single-word key
            subphraseMap[normalized] = fullKey;
        } else {
            // all contiguous subphrases of length ≥2
            for (let L = n; L >= 2; L--) {
                for (let start = 0; start + L <= n; start++) {
                    const phrase = wordsKey.slice(start, start + L).join(' ');
                    subphraseMap[phrase] = fullKey;
                }
            }
        }
    });

    // 2) Tokenize & normalize your text
    const words = text.split(/\s+/);
    const norm = words.map(w => w.replace(stripRe, ''));

    // 3) Scan through words greedily
    const chunks = [];
    let i = 0;
    while (i < words.length) {
        let matchLen = 0, matchKey = null;

        // try lengths from maxLen down to 1
        const limit = Math.min(maxLen, words.length - i);
        for (let L = limit; L >= 1; L--) {
            const slice = norm.slice(i, i + L).join(' ');
            if (subphraseMap[slice]) {
                matchKey = subphraseMap[slice];
                matchLen = L;
                break;
            }
        }

        if (matchLen > 0) {
            // emit matched chunk
            chunks.push({
                text: words.slice(i, i + matchLen).join(' '),
                isSection: true,
                key: matchKey
            });
            i += matchLen;
        } else {
            // no match → emit/merge single plain word
            const w = words[i++];
            if (chunks.length && !chunks[chunks.length - 1].isSection) {
                chunks[chunks.length - 1].text += ' ' + w;
            } else {
                chunks.push({ text: w, isSection: false });
            }
        }
    }

    return chunks;
}

// Replace the Section component with this one below: 

function Section({ heading, setRef, verses, book, chapter, holded, blinker, selected, textEdit }) {

    const stripRe = /[.,'"“”‘’]/g;
    const normalize = (k) => k.replace(stripRe, '').toLowerCase().trim();

    // read the active key
    const [activeKey, setActiveKey] = useState(globalThis.HighlightedSectionKey || '');

    const [activeVerse, setActiveVerse] = useState(globalThis.HighlightedVerseNumber || '');

    // 1) build refs once per verse
    const verseRefs = useMemo(() => {
        const m = {};
        verses.forEach(v => {
            m[v.verseNumber] = createRef();
        })
        return m;
    }, [verses]);

    useEffect(() => {
        const handler = () => {
            setActiveKey(globalThis.HighlightedSectionKey || '');
        };
        window.addEventListener('highlightedSectionKeyChanged', handler);
        return () => window.removeEventListener('highlightedSectionKeyChanged', handler);
    }, []);

    useEffect(() => {
        const handler = () => {
            setActiveVerse(globalThis.HighlightedVerseNumber || '');
            console.log("verse number clicked: ", globalThis.HighlightedVerseNumber || '');
        };
        window.addEventListener('highlightedVerseChanged', handler);
        return () =>
            window.removeEventListener('highlightedVerseChanged', handler);
    }, []);

    useLayoutEffect(() => {
        if (!activeVerse) return
        const ref = verseRefs[activeVerse]
        if (ref?.current) {
            ref.current.scrollIntoView({
                behavior: 'smooth',
                block: 'end'
            })
        }
    }, [activeVerse, verseRefs])


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

    // inside your Section component, before the return:
    const chunksMap = useMemo(() => {
        const result = {};
        if (globalThis.studyNotesPresent) {
            verses.forEach(v => {
                result[v.verseNumber] = splitBySectionKeys(
                    v.text,
                    globalThis.VerseSectionMap
                );
            });
        }
        return result;
    }, [verses, globalThis.studyNotesPresent, globalThis.VerseSectionMap]);

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
                    const [c, setC] = useState(false)
                    const isActive = verse.verseNumber.toString() === activeVerse
                    return <span
                        ref={verseRefs[verse.verseNumber]}
                        // onDoubleClick={(e) => { console.log(e); setC(!c) }}
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
                        className={`sectionText ${verse?.verseNumber.toString() === activeVerse.toString() ? 'highlighted' : ''} `}
                    >
                        <span
                            className={`sectionTextNumber ${globalThis.studyNotesPresent ? "clickableCursor" : ""}`}
                            onClick={() => {
                                if (globalThis.studyNotesPresent) {
                                    HighlightStudyNoteSection(verse?.verseNumber)
                                }
                            }}
                        >{verse?.verseNumber}</span>
                        {!c
                            ? globalThis.studyNotesPresent
                                ? (chunksMap[verse.verseNumber] || []).map((part, i) => {
                                    if (!part.isSection) {
                                        return <span key={i}>{part.text}</span>;
                                    }

                                    const partNorm = normalize(part.key);
                                    const activeNorm = (activeKey || '').toLowerCase();
                                    const isActive = activeNorm.includes(partNorm);

                                    return (
                                        <span
                                            key={i}
                                            className={
                                                `clickableCursor highlightened ${isActive ? 'highlighted-word' : ''}`
                                            }
                                            style={{ animationDelay: `${i * 0.1}s` }}
                                            onClick={() => {
                                                console.log(part.key);
                                                const raw = globalThis.VerseSectionMap[part.key].original;
                                                console.log(raw);
                                                const m = /:(\d+)$/.exec(raw);
                                                console.log(m);
                                                const sec = m ? m[1] : part.key;
                                                console.log(sec);
                                                globalThis.HighlightStudyNoteSection(raw);
                                            }}
                                        >
                                            {part.text}
                                        </span>
                                    )
                                })
                                : verse.text
                            : (
                                <MiniTextEditor
                                    initialHtml={verse.text}
                                    onChange={(html) => console.log("Updated HTML:", html)}
                                />
                            )
                        }
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
export const ThePageWithEditor = ({ tab, setPanalApp, panelId }) => {
    useEffect(() => {
        os.log('tab in the page', panelId, tab)
    }, [])

    const activeTab = panelId ? globalThis.PanelTabsMap[panelId] || tab : tab;
    const [enableEditor, setEnableEditor] = useState(false);
    const [data, setData] = useState()
    if (tab)
        globalThis[`SetEnableEditorOf${tab?.id}`] = setEnableEditor;
    return (
        <>
            <TextEditor
                enableEditor={enableEditor}
                setEnableEditor={setEnableEditor}
                data={data}
                content={<ThePage data={data} setData={setData} setEnableEditor={setEnableEditor} tab={activeTab} panelId={panelId} setPanalApp={setPanalApp} />}
                tab={activeTab}
            />
            <style>{getStyleOf('page.css')}</style>
        </>
    );
};

export { ThePage, ThePageWithEditor }