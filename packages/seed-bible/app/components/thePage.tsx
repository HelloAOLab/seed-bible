
import { BibleDataManager } from 'app.hooks.bibleDataManager'
import { getStyleOf } from 'app.styles.styler'
const { useEffect, useState, useMemo, useCallback, createRef, useRef } = os.appHooks;
import { useMouseMove } from 'app.hooks.mouseMove'
import { useTabsContext } from 'app.hooks.tabs';
import { useBibleContext } from 'app.hooks.bibleVariables'
import { TextFormattingToolbar } from 'app.components.textSettings'
import { DivSpliter } from 'app.hooks.screenDevider'
import { TextEditor } from 'app.components.editor'
import { MiniTextEditor } from 'app.components.smallEditor'
import { useSideBarContext } from 'app.hooks.sideBar'
import { MenuIcon } from 'app.components.icons'

function generateQuery(params) {
    let queryArray = [];
    for (let key in params) {
        if (params.hasOwnProperty(key)) {
            queryArray.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
        }
    }
    return queryArray.join('&');
}

function attachQueryToURL(url, params) {
    const queryString = generateQuery(params);
    return url + (url.includes('?') ? '&' : '?') + queryString;
}

const getValidRect = (element) => {
    let eleRect = element.getBoundingClientRect();
    if (Math.floor(eleRect.height) > 0) {
        return {
            width: Math.floor(eleRect.width),
            height: Math.floor(eleRect.height),
            top: Math.floor(eleRect.top),
            left: Math.floor(eleRect.left)
        }
    } else {
        return getValidRect(element.parentElement)
    }
}

function ThePage({ tab: T, setPanalApp, panelId, setEnableEditor, setData, data }) {
    const [tab, setTab] = useState(T);
    const [tabEntered, setTabEntered] = useState(false)
    const { updateTab, tabs, setActiveTab } = useTabsContext();
    const { isDragging, setIsDragging, Element } = useMouseMove()
    const { navFunctions, setNavFunctions, setCanvasMode, setMapMode, screens } = useBibleContext()
    const [currentCanvasMode, setCurrentCanvasMode] = useState(globalThis?.CurrentCanvasMode || "canvas");

    const setCanvasBoundaries = ({ intervalKey, tabId }) => {
        let canvasElement = document.getElementById(tabId);
        if (!canvasElement) {
            clearInterval(intervalKey);
            return;
        }
        globalThis.activeCanvasId = tabId;
        let { width, height, top, left } = getValidRect(canvasElement.parentElement);
         setHW({
            height: `${height}px !important`,
            width: `${width}px !important`,
        })
        setTL({
            top: `${top}px !important`,
            left: `${left}px !important`,
            borderRadius: "10px"
        })
    };

    const loadTranslationFromUrl = async () => {
        console.log(configBot.tags.translationId, "translation id")
        let translationId = configBot.tags.translationId;
        let baseUrl = "https://bible.helloao.org";
        let bookId = "GEN";
        let bookTranslationId = "BSB";
        let firstChapterApiLink;
        if (translationId) {
            os.toast(`Loading ${translationId} translation`)

            const searchBar = getBot('system', 'introduction.searchBar')

            let available_translations_req = await web.get("https://bible.helloao.org/api/available_translations.json");
            let allTranslations = [];
            let translations = {};
            let defaultTranslations = [
                "english",
                "spanish",
                "arabic",
                "hindi",
                "hebrew",
                "ancient greek",
                "custom"
            ]
            allTranslations = available_translations_req.data.translations.map(item => {
                return {
                    ...item,
                    languageEnglishName: item?.languageEnglishName || item.englishName
                }
            });

            let trValue = {
                pass: false,
                value: null
            };
            if (available_translations_req.status === 200) {
                allTranslations.forEach(translationData => {
                    if (translationData.id.toLowerCase() === translationId.toLowerCase()) {
                        trValue.pass = true;
                        trValue.value = translationData;
                    }
                })

                let urlId = translationId.includes("https://");

                if (trValue.pass && !urlId) {
                    let bookData = await web.get(`https://bible.helloao.org/api/${trValue.value.id}/books.json`);
                    let book0 = bookData.data.books[0];
                    setTagMask(searchBar, "selectedTranslation", trValue.value, "local");
                    setTagMask(searchBar, "booksData", bookData.data.books, "local");
                    bookId = book0.id;
                    bookTranslationId = trValue.value.id;
                    firstChapterApiLink = book0.firstChapterApiLink;
                } else if (!urlId) {
                    let url = `https://aolab-bible-api.netlify.app/api/translations/getTranslation`;
                    let params = {
                        uid: translationId
                    }
                    let queryUrl = attachQueryToURL(url, params);
                    let result = await web.get(queryUrl);
                    if (result.status === 200 && result.data.data) {
                        let translation = JSON.parse(result.data.data.translation);
                        console.log("1 trans")
                        let englishName = translation.languageEnglishName.toLowerCase();
                        let shortName = translation.shortName.toLowerCase();

                        let bookData = await web.get(translation.listOfBooksApiLink);

                        let book0 = bookData.data.books[0];
                        setTagMask(searchBar, "selectedTranslation", translation, "local");
                        setTagMask(searchBar, "booksData", bookData.data.books, "local");
                        if (!defaultTranslations.includes(englishName)) {
                            defaultTranslations.push(englishName)
                            translations[englishName] = {
                                [shortName]: translation
                            }
                        }
                        baseUrl = translation.origin;
                        bookId = book0.id;
                        bookTranslationId = translation.id;
                        firstChapterApiLink = book0.firstChapterApiLink;
                    }
                } else {
                    let result = await web.get(translationId);
                    if (result.status === 200) {
                        const url = new URL(translationId);
                        let newTranslations = result.data.translations;
                        let defaultTranslation = newTranslations[0];
                        newTranslations = newTranslations.map(trans => {
                            return {
                                languageEnglishName: trans.languageEnglishName,
                                id: trans.id,
                                listOfBooksApiLink: `${url.origin}${trans.listOfBooksApiLink}`,
                                origin: url.origin,
                                shortName: trans.shortName
                            }
                        })
                        console.log(newTranslations, "newTranslations")
                        allTranslations = [...allTranslations, ...newTranslations];
                        for (let translation of newTranslations) {
                            console.log("2 trans")
                            let englishName = translation.languageEnglishName.toLowerCase();
                            if (!defaultTranslations.includes(englishName)) {
                                defaultTranslations.push(englishName);
                            }
                        }
                        let translation = {
                            languageEnglishName: defaultTranslation.languageEnglishName,
                            id: defaultTranslation.id,
                            listOfBooksApiLink: `${url.origin}${defaultTranslation.listOfBooksApiLink}`,
                            origin: url.origin,
                            shortName: defaultTranslation.shortName
                        }
                        console.log(translation, "translation")
                        console.log("3 trans")
                        let englishName = translation.languageEnglishName.toLowerCase();
                        let shortName = translation.shortName.toLowerCase();

                        let bookData = await web.get(translation.listOfBooksApiLink);

                        let book0 = bookData.data.books[0];
                        setTagMask(searchBar, "selectedTranslation", translation, "local");
                        setTagMask(searchBar, "booksData", bookData.data.books, "local");
                        if (!defaultTranslations.includes(englishName)) {
                            defaultTranslations.push(englishName)
                            translations[englishName] = {
                                [shortName]: translation
                            }
                        }
                        baseUrl = translation.origin;
                        bookId = book0.id;
                        bookTranslationId = translation.id;
                        firstChapterApiLink = book0.firstChapterApiLink;
                    }
                }
                allTranslations.forEach(translation => {
                    console.log("4 trans", translation)
                    if (!translation?.languageEnglishName?.toLowerCase()) {
                        console.log(translation, "culprit")
                    }
                    let englishName = translation?.languageEnglishName?.toLowerCase() || translation?.englishName?.toLowerCase();
                    let shortName = translation.shortName.toLowerCase();
                    if (translations[englishName]) {
                        if (!translations[englishName][shortName]) {
                            translations[englishName][shortName] = translation;
                        }
                    } else {
                        translations[englishName] = {
                            [shortName]: translation
                        }
                    }
                })
                setTagMask(searchBar, "allTranslations", allTranslations, "local");
                setTagMask(searchBar, "apiTranslations", { ...translations }, "local")
                setTagMask(searchBar, "defaultTranslations", defaultTranslations, "local")
                console.log(defaultTranslations, translations, "trans")
                configBot.tags.translationId = null;
            }
        }
        return {
            baseUrl,
            bookId,
            bookTranslationId,
            firstChapterApiLink
        }
    }

    const [bible, setBible] = useState()
    if (tab)
        globalThis[`SetEnableEditorOf${tab?.id}`] = setEnableEditor;
    async function loadData() {
        if (!tab) return;
        if (tab.data.type === 'canvas') {
            setData({
                ...tab.data,
                content: []
            })
            return
        }
        let { baseUrl, bookId, bookTranslationId } = await loadTranslationFromUrl();
        const bible = new BibleDataManager({
            tabId: tab?.id,
            translation: bookTranslationId || tab.data.translation,
            bookId: bookId || tab.data.bookId,
            chapter: tab.data.chapter,
            basuUrl: baseUrl
        });
        setBible(bible)
        await bible.fetch();
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
            shout("OnChapterChanged", {book: data.book, chapter: data.chapter});
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

        console.log(Element, 'the element')
        if (Element.data.to === 'panel') {
            if (!panelId.includes(`panel-${0}`)) {
                os.log(panelId)
                ReplaceApplication(panelId, Element.data)
                setIsDragging(false)
                return
            } else {
                os.toast('The main panel can not change')
                setIsDragging(false)
                // return
            }
        }
        Update(Element.data)
        if (globalThis.GetBooksDataForMenu)
            globalThis.GetBooksDataForMenu(`https://bible.helloao.org/api/${Element.data.data.translation}/books.json`, Element.data.data.translation)
        setIsDragging(false)
        setTabEntered(false)
    }
    async function openNextChapter() {
        await bible.openNext()
        setData(bible.data)
    }
    async function openPrevChapter() {
        await bible.openPrevious()
        setData(bible.data)
    }
    async function open(bookId, chapter, translation = null) {
        await bible.open(bookId, chapter, translation = null)
        setData(bible.data)
    }
    async function changeTranslation(id, bookData, forcedBaseUrl) {
        await bible.changeTranslation(id, bookData, forcedBaseUrl)
        setData(bible.data)
    }
    function hanldNavFunctions() {
        //  bible.openNext()
        // console.log(bible, 'nextChapterData')
        console.log(tab, "tabData")
        if (tab && tab?.id)
            setActiveTab(tab?.id)
        if (tab.data.type === "canvas") {
            setNavFunctions({
                openNextChapter: () => {
                    let tabData = { ...tab.data };
                    tabData.chapter += 1;
                    tabData.book = 'Canvas';
                    updateTab(tab?.id, tabData);
                    setTab({ ...tab, data: tabData });
                }, openPrevChapter: () => {
                    let tabData = { ...tab.data };
                    if (tabData.chapter > 1) {
                        tabData.chapter -= 1;
                        tabData.book = 'Canvas';
                        updateTab(tab?.id, tabData);
                        setTab({ ...tab, data: tabData });
                    }
                }
            })
        } else {
            setNavFunctions({ openNextChapter, openPrevChapter, open, changeTranslation: bible?.changeTranslation || undefined, setPanalApp: () => { } })
        }
        globalThis.Open = open
        globalThis.ChangeTranslation = changeTranslation
        globalThis.SetPanalApp = () => { }
        setShowDialog({
            show: false,
            top: 0,
            left: 0,
            text: null
        });
        //     os.log(tab)
        //     if (globalThis.GetBooksDataForMenu) {
        //         os.log(`https://bible.helloao.org/api/${data?.translation}/books.json`)
        //         globalThis.GetBooksDataForMenu(`https://bible.helloao.org/api/${data?.translation}/books.json`, data?.translation)
        //     }
    }
    function Update(tab) {
        // return
        os.log('Update-data', tab)
        setTab(tab)
        hanldNavFunctions()
        // globalThis.PanelTabsMap[id]
        // open(tab.data.bookId, tab.data.chapter, tab.data.translation)
    }
    useEffect(() => {
        globalThis.UpdateTab = Update
        globalThis[`UpdateTabWidthId${tab?.id}`] = Update
    })
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
        // setHighlightOnce(true);
        // const timer = setTimeout(() => setHighlightOnce(false), 800); // matches animation duration
        // return () => clearTimeout(timer);
    }, []);

    // codes for page dialog

    const [selectedText, setSelectedText] = useState(null);
    const [showDialog, setShowDialog] = useState({
        show: false,
        top: 0,
        left: 0,
        text: null
    });

    const handleRightClick = (event) => {
        event.preventDefault();
        if (selectedText) {
            console.log("show dialog")
            let dim = os.getCurrentDimension();
            if (dim) {
                setShowDialog({
                    show: true,
                    top: `${event.y}px`,
                    left: `${event.x}px`,
                    text: selectedText
                });
            }
        } else {
            console.log("hide dialog 1")
            setShowDialog({
                show: false,
                top: 0,
                left: 0,
                text: null
            });
        }
    }

    const handleTextAdd = () => {
        const typingTool = getBot(byTag("typingTool"));
        if (typingTool) {
            whisper(typingTool, "makeTextBox", { x: 0, y: 0, label: showDialog.text });
        }
        setShowDialog({
            show: false,
            top: 0,
            left: 0,
            text: null
        });
    }

    useEffect(() => {
        const handleSelectionChange = () => {
            const text = window.getSelection().toString();
            if (text) {
                setSelectedText(text);
            } else if (!text) {
                setSelectedText(null);
            }
        };

        document.addEventListener('selectionchange', handleSelectionChange);

        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
        };
    }, [])

    useEffect(() => {
        if (!tab) return;
        let it;
        if (tab && tab.data.type === "canvas") {
            if (currentCanvasMode === "canvas") {
                setMapMode(false);
                setCanvasMode(true)
                globalThis.CanvasMode = true;
                window.CanvasMode = true;
                configBot.tags.gridPortal = `${tab?.data?.book}-${tab?.data?.chapter}`
                configBot.tags.miniMapPortal = null;
                it = setInterval(() => {
                    setCanvasBoundaries({ intervalKey: it, tabId: tab.id });
                }, 50)
            } else {
                setMapMode(true);
                setCanvasMode(true)
                globalThis.CanvasMode = true;
                window.CanvasMode = true;
                if (!configBot.tags.miniMapPortal) {
                    animateTag(miniMapPortalBot, {
                        fromValue: {
                            miniPortalWidth: 0.1,
                            miniPortalHeight: 0.2
                        },
                        toValue: {
                            miniPortalWidth: 1,
                            miniPortalHeight: 1
                        },
                        duration: 0.1
                    });
                }
                configBot.tags.miniMapPortal = `map-${tab?.data?.chapter}`;
                const geoImporter = getBot("system", "ext_geoImporter.importer");
                if (geoImporter) {
                    setTag(geoImporter, "targetDim", `map-${tab?.data?.chapter}`, "local")
                }
                it = setInterval(() => {
                    setCanvasBoundaries({ intervalKey: it, tabId: tab.id });
                }, 50)
            }
            setTagMask(thisBot, "canvasTab", tab, "tempLocal");
            setTagMask(thisBot, "onGridClick", `@
                console.log(masks.canvasTab)
                if (globalThis[\`UpdateTabWidthId\${masks.canvasTab.id}\`]){
                    console.log("updating tab via grid");
                    SetCanvasMode(true);
                    globalThis[\`UpdateTabWidthId\${masks.canvasTab.id}\`](masks.canvasTab)
                }
            `, "tempLocal")
            console.log("tab canvas", tab)
        }
        globalThis.SetCurrentCanvasMode = setCurrentCanvasMode;
        globalThis.SetCanvasMode = setCanvasMode;
        globalThis.CurrentCanvasMode = currentCanvasMode;
        setIsDragging(false)
        setTabEntered(false)
        console.log("loading canvas");
        return () => {
            clearInterval(it)
            setHW({
                height: `0px !important`,
                width: `0px !important`,
            })
            setTL({
                top: `0px !important`,
                left: `0px !important`,
                borderRadius: "10px"
            })
            globalThis.SetCurrentCanvasMode = null;
            masks.canvasTab = null;
            masks.onGridClick = null;
            globalThis.activeCanvasId = null;
            console.log("unloading canvas");
        }
    }, [tab, currentCanvasMode])

    if (tab?.data?.type === "canvas" && (globalThis?.activeCanvasId ? tab.id === globalThis.activeCanvasId : true)) {
        return <div id={tab.id}>
        </div>
    }
    
    const [tabernacleHighlightTimestamps, setTabernacleHighlightTimestamps] = useState(new Map());

    const handleSectionHighlightened = useCallback(({key}) => {
        setTabernacleHighlightTimestamps((prev) => {
            return new Map(prev).set(key, os.localTime)
        });
    }, [])

    return <div
        className="pageContainer"
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
        onMouseUp={handleMouseUp}
        onClick={() => {
            hanldNavFunctions();
            setCanvasMode(false)
        }}
        onContextMenu={handleRightClick}
    >
        <link href="https://fonts.cdnfonts.com/css/helvetica-neue-55" rel="stylesheet" />
        <link href="https://fonts.cdnfonts.com/css/montserrat" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..800;1,400..800&display=swap" rel="stylesheet" />
        {showDialog.show && <div style={{
            position: "fixed",
            top: showDialog.top,
            left: showDialog.left,
            zIndex: 10000,
            pointerEvents: "auto"
        }}>
            <div class="popupSettings">
                <div class="itemSettings" onClick={handleTextAdd}>
                    <span>Create Text Bot</span>
                </div>
            </div>
        </div>}
        {data && tab && !tabEntered ? <>
            <div style={{ 'pointer-events': isDragging ? "none" : null }} className="bookTitle">{`${data?.book} - ${data?.chapter}`}</div>
            {
                data && data.content.map((e, sectionIndex) => {
                    return <div key={`${data.book}-${data.chapter}-${e.verses[0].verseNumber}`} style={{ 'pointer-events': isDragging ? "none" : null }}>
                        <Section
                            tabernacleHighlightTimestamps={tabernacleHighlightTimestamps}
                            onSectionHighlightened={handleSectionHighlightened}
                            {...e}
                            book={data.book}
                            chapter={data.chapter}
                            blinker={blinker}
                            setRef={refs}
                            holded={holded}
                            selected={selected}
                            textEdit={false}
                            sectionIndex={sectionIndex}
                         />
                    </div>
                })
            }
        </> :
            <>
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: screens === 1 && '100vh'
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

function Section({ heading, setRef, verses, book, chapter, holded, blinker, selected, textEdit, tabernacleHighlightTimestamps, onSectionHighlightened}) {

    const {styles, editTextStyle} = useMemo(() => {
        const styles = {
            font: `'Montserrat', sans-serif`,
            weight: '600',
            color: 'black',
            styles: {
                bold: true,
                italic: false,
                underline: false,
                alignment: 'left',
            }
        }
        const editTextStyle = {
            "border-radius": "6px",
            "border": "2px solid #4459F3",
            "background": "rgba(68, 89, 243, 0.10)",
            "padding": '8px',
            "position": 'relative',
        }
        return {styles, editTextStyle}
    }, [])

    const { tabs, addTab, activeSpace } = useTabsContext();
    const { openPopupSettings, closePopupSettings } = useSideBarContext();
    const { screens, setScreens } = useBibleContext();

    const [locations, setLocations] = useState(getBot('system', 'introduction.searchBar').tags['places-new']);
    
    const tabernacleContent = useMemo(() => {
        return globalThis?.TabernacleManager?.tags?.keys?.find((content) => {
            return content.book === book && content.chapter == chapter && content.minVerse == verses[0].verseNumber;
        })
    }, [book, chapter, verses])

    const openLocation = ({ location }) => {
        if (globalThis?.activeCanvasId && configBot.tags.miniMapPortal) {
            whisper(getBot('system', 'introduction.searchBar'), "handleGeoJsonSearch", { place: location });
            return
        }
        openPopupSettings({
            type: 'normal', items: [
                {
                    disabled: true, icon: <MenuIcon name="map" />, title: 'Open Location', onClick: () => {
                        if (globalThis?.activeCanvasId) {
                            whisper(getBot('system', 'introduction.searchBar'), "handleGeoJsonSearch", { place: location });
                            whisper(thisBot, 'onGridClick')
                        } else {
                            let canvasTabs = tabs.filter(item => { return item.data.type === 'canvas' });
                            let tabData;
                            if (canvasTabs.length === 0) {
                                let canvasNumber = globalThis?.initiatedCanvas ? globalThis.initiatedCanvas + 1 : 1;
                                globalThis.initiatedCanvas = canvasNumber;
                                tabData = {
                                    id: uuid(),
                                    taken: false,
                                    data: {
                                        use: 'thePage',
                                        type: 'canvas',
                                        book: 'Canvas',
                                        bookId: 'GEN',
                                        chapter: canvasNumber,
                                        translation: 'BSB'
                                    }
                                };
                                addTab(tabData);
                            } else {
                                tabData = canvasTabs[0];
                            }
                            if (screens < 4) {
                                let scrValue = screens + 1;
                                setScreens({ value: scrValue });
                                setTimeout(async () => {
                                    if (globalThis?.[`UpdatePanel-panel-${screens}-${activeSpace}`]) {
                                        try{
                                            globalThis?.[`UpdatePanel-panel-${screens}-${activeSpace}`](tabData);
                                        }catch(e) {
                                            console.log(e)
                                        }
                                        whisper(getBot('system', 'introduction.searchBar'), "handleGeoJsonSearch", { place: location });
                                        whisper(thisBot, 'onGridClick')
                                    }
                                }, 100)
                            }
                        }
                    }
                },
            ]
        })
    }

    const [isActive, setIsActive] = useState(false);
    const timeoutRef = useRef(null)

    const [isHighlightened, setIsHighlightened] = useState(false);

    const wordHighlightInfo = useMemo(() => {
        let currDelay = 0;
        const threshold = 0.5;
        return verses.map((verse) => {
            return verse.text.split(" ").map(() => {
                currDelay += 0.01
                const random = Math.random()
                const isRandomlySelected = random > threshold
                return {isRandomlySelected, delay: currDelay};
            });
        })
    }, [])

    const highlightDuration = useMemo(() => {
        const highlightBaseDuration = 3000;
        const lastVerseHighlightInfo = wordHighlightInfo[wordHighlightInfo.length - 1]
        
        return highlightBaseDuration + (lastVerseHighlightInfo[lastVerseHighlightInfo.length - 1]?.delay * 1000)
    }, [wordHighlightInfo]);

    const handleSectionCoverClick = useCallback(() => {

        if(timeoutRef.current || isHighlightened) return;

        setIsActive(true);
        timeoutRef.current = setTimeout(() => {
            setIsActive(false);
            timeoutRef.current = null;
        }, highlightDuration);

    }, [verses, timeoutRef.current, isHighlightened, highlightDuration])

    useEffect(() => {
        const key = `${book}-${chapter}-${verses[0].verseNumber}`
        if(tabernacleContent)
        {
            globalThis[`TabernacleItemClicked-${key}`] = handleSectionCoverClick;
            const highlightened = !tabernacleHighlightTimestamps.has(key) || ((os.localTime - tabernacleHighlightTimestamps.get(key)) > 60000)
            if(highlightened)
            {
                setIsHighlightened(true);
                onSectionHighlightened({key})
                setTimeout(() => {
                    setIsHighlightened(false);
                }, highlightDuration);
            }
        }
        return () => {
            if(tabernacleContent)
            {
                globalThis[`TabernacleItemClicked-${key}`] = null;
            }
        }
    }, [])
    
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
            <div 
                className="sectionCover"
                onPointerEnter={() => {
                    if(tabernacleContent)
                    {
                        shout("OnTabernacleSectionHover", {keys: tabernacleContent.keys});
                    }
                }}
                onClick={() => {
                    if(tabernacleContent)
                    {
                        handleSectionCoverClick()
                        shout("OnTabernacleSectionClick", {keys: tabernacleContent.keys});
                    }
                }}
            >
                {verses.map((verse, verseIndex) => {
                    const [c, setC] = useState(false)
                    const mapVerse = ({ verse }) => {
                        let verseArray = verse.split(" ");
                        let vr = [];
                        verseArray.forEach((verseText, verseTextIndex) => {
                            
                            let location = locations[verseText.replace(/[^a-zA-Z]/g, "").toLowerCase()];
                            const isRandomlySelected = wordHighlightInfo[verseIndex][verseTextIndex]?.isRandomlySelected;
                            const className = `${(isHighlightened || isActive) && isRandomlySelected ? "highlightened" : ""}`;
                            const animationDelay = `${wordHighlightInfo[verseIndex][verseTextIndex]?.delay ?? 0}s`
                            
                            if(location)
                            {
                                let result = verseText.split(/([^A-Za-z]+)/).filter(Boolean)
                                for (const part of result) {
                                    if (/^[A-Za-z]+$/.test(part)) {
                                        vr.push(
                                            <span 
                                                style={{ animationDelay }}
                                                className={className}
                                                onMouseEnter={(e) => {
                                                    e.target.style.color = "#0D47A1";
                                                    e.target.style.fontWeight = "400";
                                                }}
                                                onMouseLeave={(e) => {
                                                    setTimeout(() => {
                                                        e.target.style.color = "";
                                                        e.target.style.fontWeight = "";
                                                        e.target.style.fontStyle = "";
                                                    }, 2000)
                                                }}
                                                onClick={() => { 
                                                    openLocation({ location }) 
                                                }}
                                            >
                                                {`${part}`}
                                            </span>
                                        )
                                    } else {
                                        vr.push(<span 
                                            style={{ animationDelay }}
                                            className={className}
                                        >{`${part}`}</span>)
                                    }
                                }
                                vr.push(<span>{` `}</span>)
                            } 
                            else 
                            {
                                vr.push(<span 
                                    style={{ animationDelay }}
                                    className={className}
                                >{`${verseText} `}</span>)
                            }
                        })
                        return vr
                    }
                    return <span
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
                        className="sectionText">
                        <span className="sectionTextNumber">{verse?.verseNumber}</span>
                        {!c ? <span class="sectionVerse">{mapVerse({ verse: verse?.text }).map(item => item)} </span> : <MiniTextEditor
                            initialHtml={verse?.text}
                            onChange={(html) => console.log('Updated HTML:', html)}
                        />}
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