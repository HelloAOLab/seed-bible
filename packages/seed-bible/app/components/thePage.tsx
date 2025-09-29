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

const SN_Components_Bot = getBot(byTag('system', 'app.sn_components'));

import { ConfigurableFunctionCommands } from 'app.components.commands'

function ThePage({ tab: T, setPanalApp, panelId, setEnableEditor, setData, data }) {
    const [tab, setTab] = useState(T);
    useEffect(() => {
        if (!T)
            globalThis.CurrentPanelAvailable = panelId
        else
            globalThis.CurrentPanelAvailable = null
    }, [T])
    const [tabEntered, setTabEntered] = useState(false)
    const { updateTab, tabs, setActiveTab } = useTabsContext();
    const { isDragging, setIsDragging, Element } = useMouseMove()
    const { navFunctions, setNavFunctions } = useBibleContext()
    const [inHold, setInHold] = useState()
    const [contextData, setContextData] = useState({
        verse: "And God said, 'Let there be light,' and there was light. And God saw that the light was good, and He separated the light from the darkness. God called the light 'day,' and the darkness He called 'night.' And there was evening, and there was morning—the first day.",
        reference: "Genesis 1:3-5",
        book: "Genesis",
        chapter: 1,
        verses: [3, 4, 5]
    })
    // Add state for text selection and commands
    const [selectedText, setSelectedText] = useState('');
    const [showCommands, setShowCommands] = useState(false);
    const [lastSelectedVerse, setLastSelectedVerse] = useState(null);

    const [bible, setBible] = useState()
    if (tab)
        globalThis[`SetEnableEditorOf${tab?.id}`] = setEnableEditor;
    async function loadData() {
        if (!tab)
            return

        console.log("tab data in ThePage: ", tab);

        const bible = new BibleDataManager({
            tabId: tab?.id,
            translation: tab.data.translation,
            bookId: tab.data.bookId,
            chapter: tab.data.chapter,
        });
        setBible(bible)

        console.log("bible data: ", bible);

        await bible.fetch();

        let tempBibleObject = bible;
        
        globalThis.CurrentBibleObject = tempBibleObject;

        const { data, loading, error } = bible.getState();
        console.log(data, tab, 'the data loaded')
        setData(data)

        globalThis.BookId = bible.bookId;
        globalThis.GlobalChapter = bible.data.chapter - 1;

        // if(!globalThis.studyNotesPresent) {
        //     SN_Components_Bot.initializer();
        // }
        // setContent(data)
        // await bible.openNext();

        // await bible.changeTranslation('KJV');
    }
    useEffect(() => {
        loadData()
    }, [tab])

    async function globalLoadingDataFromSN(bookId, chapter) {
        if (!tab)
            return
        const bible = new BibleDataManager({
            tabId: tab?.id,
            translation: tab.data.translation,
            bookId: bookId,
            chapter: chapter,
        });
        setBible(bible)

        console.log("bible data: ", bible);

        await bible.fetch();

        // Additional Data ----------->
        globalThis.BookId = bible.bookId;

        const { data, loading, error } = bible.getState();
        console.log(data, tab, 'the data loaded')
        setData(data);

        globalThis.GlobalChapter = bible.data.chapter - 1;

        if (globalThis.studyNotesPresent) {
            UpdateApplication(globalThis.STUDYNOTES_PANEL_ID, {
                App: <StudyNotes id={globalThis.STUDYNOTES_PANEL_ID} chapter={globalThis.GlobalChapter} />,
                to: 'panel',
            })
        }
    }

    globalThis.GlobalLoadingDataFromSN = globalLoadingDataFromSN;

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

    // Add text selection handler
    useEffect(() => {
        // const handleSelection = () => {
        //     const selection = window.getSelection();
        //     const selectedText = selection.toString().trim();

        //     if (selectedText && selectedText.length > 0) {
        //         setSelectedText(selectedText);
        //         setShowCommands(true);

        //         // Find the verse element that contains the selection
        //         console.log(selection,'section range')
        //         const range = selection.getRangeAt(0);
        //         const container = range.commonAncestorContainer;
        //         const verseElement = container.nodeType === Node.TEXT_NODE
        //             ? container.parentElement.closest('.sectionText')
        //             : container.closest('.sectionText');

        //         if (verseElement) {
        //             const verseNumber = verseElement.querySelector('.sectionTextNumber')?.textContent;
        //             if (verseNumber) {
        //                 setLastSelectedVerse(parseInt(verseNumber));
        //             }
        //         }
        //     } else {
        //         // setShowCommands(false);
        //         // setSelectedText('');
        //     }
        // };

        // document.addEventListener('selectionchange', handleSelection);
        // return () => document.removeEventListener('selectionchange', handleSelection);

    }, []);
    useEffect(() => {
        const handleMouseUp = () => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) return;

            const selectedRange = selection.getRangeAt(0);

            // Use TreeWalker to collect all .sectionText spans inside selection
            const treeWalker = document.createTreeWalker(
                selectedRange.commonAncestorContainer,
                NodeFilter.SHOW_ELEMENT,
                {
                    acceptNode: (node) => {
                        if (
                            node.classList?.contains('sectionText') &&
                            selectedRange.intersectsNode(node)
                        ) {
                            return NodeFilter.FILTER_ACCEPT;
                        }
                        return NodeFilter.FILTER_SKIP;
                    },
                }
            );

            const selectedVerses = new Set();

            let currentNode = treeWalker.nextNode();
            while (currentNode) {
                const verseNumberElem = currentNode.querySelector('.sectionTextNumber');
                if (verseNumberElem) {
                    const verseNum = parseInt(verseNumberElem.textContent);
                    if (!isNaN(verseNum)) {
                        selectedVerses.add(verseNum);
                    }
                }
                currentNode = treeWalker.nextNode();
            }

            if (selectedVerses.size > 0) {
                const selectedArray = Array.from(selectedVerses).sort((a, b) => a - b);
                console.log('Selected verse numbers:', selectedArray);
                // setShowCommands(false);
                setSelectedText(selection.toString());
                setLastSelectedVerse(selectedArray[selectedArray.length - 1]);
                setContextData({
                    verse: window.getSelection().toString(),
                    reference: `${data?.book} ${data?.chapter}:${selectedArray[0]}-${selectedArray[selectedArray.length - 1]}`,
                    book: data?.book,
                    chapter: data?.chapter,
                    verses: selectedArray,
                })
                shout('onVeresRightClick', {
                    verseNumber: selectedArray,
                    text: window.getSelection().toString(),
                    book: data?.book,
                    chapter: data?.chapter,
                    highlighted: false
                })

            } else {
                setShowCommands(false);
                setSelectedText('');
                setLastSelectedVerse(null);
            }
        };
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mouseup', handleMouseUp)
        };
    }, [data]);


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

        console.log("New Bible Object: ", bible);

        // Additions ------>
        globalThis.GlobalChapter = bible.data.chapter - 1;
        globalThis.BookId = bible.data.bookId;

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

        console.log("New Bible Object: ", bible);

        // Additions ------>
        globalThis.GlobalChapter = bible.data.chapter - 1;
        globalThis.BookId = bible.data.bookId;

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
        
        // Additions ------>
        globalThis.GlobalChapter = bible.data.chapter - 1;
        globalThis.BookId = bible.data.bookId;

        if (globalThis.studyNotesPresent) {
            UpdateApplication(globalThis.STUDYNOTES_PANEL_ID, {
                App: <StudyNotes id={globalThis.STUDYNOTES_PANEL_ID} chapter={globalThis.GlobalChapter} />,
                to: 'panel',
            })
        }
    }
    async function changeTranslation(id, book, url) {
        await bible.changeTranslation(id);
        setData(bible.data);
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
        globalThis.ToggleVerseHighlight = toggleVerseHighlight;
        globalThis.SetInHold = setInHold
        globalThis.SetShowCommands = setShowCommands
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
        if (globalThis.SetCurrentBook) {
            globalThis.SetCurrentBook(data);
            globalThis.CHAPTER_DATA = {
                ...data,
            };
        }
        globalThis.CurrentBookData = { ...data };
    }, [data]);

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

    const [highlighted, setHighlighted] = useState({});

    // Add this useEffect after the existing globalThis assignments:
    useEffect(() => {
        // Initialize tab highlights if not exists
        if (!globalThis.tabHighlights) {
            globalThis.tabHighlights = {};
        }
        if (tab?.id && !globalThis.tabHighlights[tab.id]) {
            globalThis.tabHighlights[tab.id] = {};
        }

        // Load existing highlights for this tab
        if (tab?.id && globalThis.tabHighlights[tab.id]) {
            setHighlighted(globalThis.tabHighlights[tab.id]);
        }

        globalThis.SetHighlighted = setHighlighted;

        return () => {
            globalThis.SetHighlighted = null;
        }
    }, [tab?.id, highlighted]);

    // Add these helper functions in ThePage component:
    const toggleVerseHighlight = useCallback((verseNumbers) => {
        if (!tab?.id) return;

        const numbers = Array.isArray(verseNumbers) ? verseNumbers : [verseNumbers];

        setHighlighted(prev => {
            const newHighlighted = { ...prev };

            // Check if all verses in this group are already highlighted together
            const allHighlighted = numbers.every(vn => newHighlighted[vn]);
            const groupId = Date.now(); // Unique group ID for new highlights

            if (allHighlighted) {
                // All are highlighted → unhighlight them as a group
                numbers.forEach(vn => {
                    delete newHighlighted[vn];
                });
            } else {
                // Highlight them together with same groupId
                numbers.forEach(vn => {
                    newHighlighted[vn] = {
                        timestamp: groupId,
                        book: data?.book,
                        chapter: data?.chapter,
                        group: groupId
                    };
                });
            }

            // Update global storage
            if (!globalThis.tabHighlights) {
                globalThis.tabHighlights = {};
            }
            globalThis.tabHighlights[tab.id] = newHighlighted;

            return newHighlighted;
        });
    }, [tab?.id, data?.book, data?.chapter]);

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
                                inHold={inHold}
                                setInHold={setInHold}
                                book={data.book}
                                chapter={data.chapter}
                                blinker={blinker}
                                setRef={refs}
                                holded={holded}
                                selected={selected}
                                highlighted={highlighted}
                                textEdit={false}
                                showCommands={showCommands}
                                setShowCommands={setShowCommands}
                                selectedText={selectedText}
                                lastSelectedVerse={lastSelectedVerse}
                                contextData={contextData}
                                setContextData={setContextData}
                            />
                        </div>
                    </>
                })
            }
            <div style={{ height: '40px' }}></div>
            <div style={{ width: '100%', display: 'flex', 'align-items': 'center', 'justify-content': 'center', position: 'relative' }}>
                <div style={{ width: '80%', height: '1px', background: 'gray' }}></div>
                <PageToolbar />
            </div>
            <div style={{ height: '160px' }}></div>
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
                        <div style={{ height: '40px' }}></div>
                        <div style={{ width: '100%', display: 'flex', 'align-items': 'center', 'justify-content': 'center', position: 'relative' }}>
                            <div style={{ width: '80%', height: '1px', background: 'gray' }}></div>
                            <PageToolbar />
                        </div>
                    </div>
                </div>
            </>
        }

    </div>
}
function PageToolbar() {
    const { tools } = useBibleContext();

    const visibleTools = tools.filter(tool => tool.showInPageToolbar);
    if (visibleTools.length === 0) return null;

    return (
        <div className="thePageToolbar">
            {
                visibleTools.map(tool => (
                    <div onClick={tool.onClick} className="tool-preview" key={tool.label}>
                        {tool.isImg ? (
                            <img
                                src={tool.icon}
                                style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                                alt={tool.label}
                            />
                        ) : (
                            <span className="material-symbols-outlined">{tool.icon}</span>
                        )}
                    </div>
                ))
            }
        </div>
    );
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

function normalizeToSet(payload) {
    // Accept shapes: "5", "5-8", [5,7,9], {start:5,end:8}, [{start:1,end:3},{start:10,end:11}]
    const out = new Set();

    if (payload == null) return out;

    const addRange = (a, b) => {
        const start = Math.min(+a, +b);
        const end = Math.max(+a, +b);
        for (let v = start; v <= end; v++) out.add(v);
    };

    if (typeof payload === 'string') {
        const t = payload.trim();
        const m = t.match(/^(\d+)\s*[-–]\s*(\d+)$/);
        if (m) addRange(m[1], m[2]);
        else if (/^\d+$/.test(t)) out.add(+t);
        return out;
    }

    if (Array.isArray(payload)) {
        // array of numbers OR array of ranges
        if (payload.length && typeof payload[0] === 'object') {
            payload.forEach(r => {
                if (r && r.start != null && r.end != null) addRange(r.start, r.end);
            });
        } else {
            payload.forEach(n => /^\d+$/.test(String(n)) && out.add(+n));
        }
        return out;
    }

    if (typeof payload === 'object') {
        const { start, end } = payload;
        if (start != null && end != null) addRange(start, end);
        return out;
    }

    return out;
}

// Replace the Section component with this one below: 

function Section({ heading, setRef, setContextData, contextData, verses, book, chapter, holded, blinker, selected, highlighted, textEdit, setInHold, inHold, showCommands, setShowCommands, selectedText, lastSelectedVerse }) {

    const stripRe = /[.,'"""'']/g;
    const normalize = (k) => k.replace(stripRe, '').toLowerCase().trim();

    // read the active key
    const [activeKey, setActiveKey] = useState(globalThis.HighlightedSectionKey || '');

    const [activeVerse, setActiveVerse] = useState(globalThis.HighlightedVerseNumber || '');

    const [activeVerses, setActiveVerses] = useState(() => new Set());

    const [animating, setAnimating] = useState(false);
    const [sectionMap, setSectionMap] = useState(null);
    const [chunksMap, setChunksMap] = useState(null);

    function readGlobalShouldHighlight() {
        const v = SN_Components_Bot?.tags?.shouldHighlight;
        return v === true || String(v) === 'true';
    }

    const shouldHighlight = readGlobalShouldHighlight();

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

    useEffect(() => {
        const handler = () => {
            const payload =
                globalThis.HighlightedVerses
                ?? globalThis.HighlightedVerseRange
                ?? null;

            setActiveVerses(normalizeToSet(payload));
        };
        window.addEventListener('highlightedVersesChanged', handler);
        return () => window.removeEventListener('highlightedVersesChanged', handler);
    }, []);

    useLayoutEffect(() => {
        // prefer multi-verse; fall back to single-verse for backward compat
        let target = null;
        if (activeVerses && activeVerses.size) {
            target = Math.min(...Array.from(activeVerses));
        } else if (activeVerse) {
            target = activeVerse;
        }
        if (!target) return;

        const ref = verseRefs[target];
        if (ref?.current) {
            ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [activeVerses, activeVerse, verseRefs]);

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

    // 1) listen for the map
    useEffect(() => {
        function onMapReady(e) {
            const map = e.detail || null;
            setSectionMap(map);
            setAnimating(!!map);
        }
        window.addEventListener('sectionMapReady', onMapReady);
        return () => window.removeEventListener('sectionMapReady', onMapReady);
    }, []);

    useEffect(() => {
        if (!globalThis.VerseSectionMap) {
            setChunksMap(null);
            return;
        }
        const result = {};
        verses.forEach(v => {
            result[v.verseNumber] = splitBySectionKeys(v.text, globalThis.VerseSectionMap);
        });
        setChunksMap(result);

    }, [globalThis.VerseSectionMap, verses]);

    // Get context data for the selected verse
    const getContextData = (verseNumber) => {
        const verse = verses.find(v => v.verseNumber === verseNumber);
        if (!verse) return null;

        return {
            verse: selectedText || verse.text,
            reference: `${book} ${chapter}:${verseNumber}`,
            book: book,
            chapter: chapter,
            verses: [verseNumber],
            selectedText: selectedText
        };
    };

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
                    const isVerseActive =
                        activeVerses.has(verse.verseNumber) ||
                        verse?.verseNumber.toString() === String(activeVerse);
                    const shouldShowCommands = showCommands && lastSelectedVerse === verse.verseNumber;
                    const isTextDecorUnderline = (holded?.[verse.verseNumber] || selected[verse.verseNumber] || blinker[verse.verseNumber]);

                    return <span key={verse.verseNumber}>
                        <span
                            ref={verseRefs[verse.verseNumber]}
                            // onDoubleClick={(e) => { console.log(e); setC(!c) }}
                            onContextMenu={() => {
                                setInHold(verse.verseNumber)
                                let selectedArray = [verse.verseNumber]
                                setContextData({
                                    verse: verse.text,
                                    reference: `${book} ${chapter}:${verse.verseNumber}`,
                                    book,
                                    chapter,
                                    verses: selectedArray,
                                })
                                globalThis.GlobalSearch = verse.text;
                                shout('onVeresRightClick', {
                                    verseNumber: verse.verseNumber,
                                    text: verse.text,
                                    chapter,
                                    book,
                                    highlighted: highlighted?.[verse.verseNumber]
                                })
                            }}
                            onClick={() => {
                                // setInHold(verse.verseNumber)
                                os.log('in hold')
                                SetShowCommands(false);
                                os.log({
                                    verseNumber: verse.verseNumber,
                                    text: verse.text,
                                    chapter,
                                    book,
                                    highlighted: highlighted?.[verse.verseNumber]
                                })
                                shout('onVerseClick', {
                                    verseNumber: verse.verseNumber,
                                    text: verse.text,
                                    chapter,
                                    book,
                                    highlighted: highlighted?.[verse.verseNumber]
                                })

                            }}
                            style={{
                                'background-color': highlighted?.[verse.verseNumber] ? '#ffeb3b' : 'transparent',
                                'transition': 'background-color 0.2s ease',
                                'border-radius': highlighted?.[verse.verseNumber] ? '3px' : '0',
                                'padding': highlighted?.[verse.verseNumber] ? '2px 4px' : '0',
                                'margin': highlighted?.[verse.verseNumber] ? '0 1px' : '0',
                                'text-decoration': (inHold === verse.verseNumber || isTextDecorUnderline) ? 'underline' : '',
                                'text-decoration-style': (inHold === verse.verseNumber || isTextDecorUnderline) ? "dotted" : '',
                            }}
                            className={`sectionText ${isVerseActive ? 'highlighted' : ''} ${highlighted?.[verse.verseNumber] ? 'verse-highlighted' : ''}`}
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
                                    ? (chunksMap?.[verse.verseNumber]
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
                                                        `clickableCursor linkedWord ${shouldHighlight ? "highlightened" : ""} ${(isActive) ? 'highlighted-word' : ''}`
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
                                        : verse.text)
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

                        {shouldShowCommands && (
                            <div style={{
                                marginTop: '10px',
                                marginBottom: '20px',
                                borderTop: '1px solid #eee',
                                paddingTop: '10px'
                            }}>
                                <ConfigurableFunctionCommands
                                    contextData={contextData}
                                // onClose={() => setShowCommands(false)}
                                />
                            </div>
                        )}
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