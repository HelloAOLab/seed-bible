const { useState, useEffect, useMemo, useRef, useCallback, createRef } = os.appHooks;
const { Modal, Button } = Components;

const PsalmsData = [
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

globalThis.setBooksData = () => { }
const SearchBar = () => {
    const [query, setQuery] = useState("");
    const inputRef = useRef(null);

    const [booksData, setBooksData] = useState(null);
    globalThis.setBooksData = setBooksData
    const [selectedTestament, setSelectedTestament] = useState(2);
    const [openSearchBar, setOpenSearchBar] = useState(false);
    const [searchBarFocused, setSearchBarFocused] = useState(false);
    const [selectedTransOpiton, setSelectedTransOpiton] = useState(1)
    const [translationOptions, setTranslationOptions] = useState(
        [
            {
                "language": "English",
                "translations": [
                    { "short": "BSB", "name": "Berean Standard Bible", id: 'BSB' },
                    { "short": "LSV", "name": "Literal Standard Version", id: 'eng_lsv' },
                    { "short": "GNV", "name": "Geneva Bible 1599", id: 'eng_gnv' },
                    { "short": "KJV", "name": "King James (Authorized) Version", id: 'eng_kjv' },
                    { "short": "ASV", "name": "American Standard Version (1901)", id: 'eng_asv' }
                ]
            },
            {
                "language": "Spanish",
                "translations": [
                    { "short": "PDT", "name": "Palabra de Dios para ti", id: 'spa_pdt' },
                    { "short": "BES", "name": "La Biblia en Español Sencillo", id: 'spa_bes' },
                    { "short": "BLM", "name": "Santa Biblia libre para el mundo", id: 'spa_blm' },
                    { "short": "VBL", "name": "Versión Biblia Libre", id: 'spa_vbl' }
                ]
            },
            {
                "language": "Arabic",
                "translations": [
                    { "short": "NAV", "name": "كتاب الحياة", id: "ARBNAV", }
                ]
            },
            {
                "language": "Hindi",
                "translations": [
                    { "short": "IRV", "name": "इंडियन रिवाइज्ड वर्जन (IRV) हिंदी - 2019", "id": "HINIRV", },
                    // { "short": "HI-ULB", "name": "" }
                ]
            },
            {
                "language": "Hebrew",
                "translations": [
                    { "short": "MOD", "id": "heb_mod", "id": "heb_mod", },
                    { "short": "MAS", "name": "כתבי הקודש", "id": "HBOMAS", },
                    { "short": "LBM", "name": "परमेश्वर को सच्चो वचन", "id": "lbm_twf", }
                ]
            },
            {
                "language": "Greek",
                "translations": [
                    { "short": "BRE", "name": "an Bibl", "id": "bre_brg", },
                    { "short": "TCG", "name": "Η Καινή Διαθήκη", "id": "grc_tcg", },
                ]
            }
        ]



    );

    const [defaultTranslations, setDefaultTranslations] = useState([
        "english",
        "spanish",
        "arabic",
        "hindi",
        "hebrew",
        "ancient greek",
        "custom"
    ])

    const [apiTranslations, setApiTranslations] = useState({
        english: {},
        spanish: {},
        arabic: {},
        hindi: {},
        hebrew: {},
        "ancient greek": {}
    })

    const [showAllLanguages, setShowAllLanguages] = useState(false);
    const [allowedTranslationLimit, setAllowedTranslationLimit] = useState(50);
    const [selectedTranslation, setSelectedTranslation] = useState({
        language: "English",
        version: "BSB"
    });
    const [showCustomTranslation, setShowCustomTranslation] = useState(false);
    const [selectingTranslation, setSelectingTranslation] = useState(false);
    globalThis.SetTranslationOptions = setTranslationOptions
    useEffect(() => {
        // os.log(translationOptions, 'options')
        // if (translationOptions) {
        //     setSelectedTranslation(translationOptions[1])
        // }
    }, [translationOptions])
    const handleSelectTestament = useCallback(() => {
        if (selectedTestament === 0) {
            setSelectedTestament(1);
        } else if (selectedTestament === 1) {
            setSelectedTestament(2)
        } else if (selectedTestament === 2) {
            setSelectedTestament(0)
        }
    }, [selectedTestament]);

    // const [openAboutUs, setOpenAboutUs] = useState(false);

    const handleNameMatch = useCallback(({ query, bookData }) => {
        let lowercaseQuery = query.toLowerCase();
        let commonName = bookData.commonName.toLowerCase();
        let bookId = bookData.id.toLowerCase();
        let lowercaseQueryArr = lowercaseQuery.split(" ");
        if (lowercaseQueryArr.length > 1) {
            if (lowercaseQueryArr[lowercaseQueryArr.length - 1] === "" || parseInt(lowercaseQueryArr[lowercaseQueryArr.length - 1])) {
                lowercaseQuery = lowercaseQueryArr.slice(0, lowercaseQueryArr.length - 1).join(" ");
            }
        }
        if (
            commonName.slice(0, lowercaseQuery.length) === lowercaseQuery
            ||
            bookId.includes(lowercaseQuery)
            ||
            (
                commonName.slice(2, lowercaseQuery.length + 2) === lowercaseQuery &&
                commonName.split(" ").length > 1 &&
                parseInt(commonName.split(" ")[0])
            )
        ) {
            return true;
        }
        return false;
    }, [])

    const selectedTestamentData = useMemo(() => {
        if (query.length > 0) {
            if (booksData === null || query === "") {
                return []
            } else if (query.length > 0) {
                let sortedBook = [];
                for (let i = 0; i < booksData.length; i++) {
                    if (
                        handleNameMatch({ query: query, bookData: booksData[i] })
                    ) {
                        sortedBook.push(booksData[i])
                    }
                }
                return [...sortedBook]
            } else {
                return []
            }
        } else {
            if (booksData) {
                if (selectedTestament === 0) {
                    return [...booksData.slice(0, 39)]
                } else if (selectedTestament === 1) {
                    return [...booksData.slice(39)]
                } else {
                    return [...booksData]
                }
            } else {
                return []
            }
        }
    }, [selectedTestament, booksData, query, handleNameMatch]);

    const filteredApiTranslations = useMemo(() => {
        if (query !== "") {
            let translations = {};
            let lowercaseQuery = query.toLowerCase();
            Object.entries(apiTranslations).slice(0, allowedTranslationLimit).forEach(([key, value]) => {
                if (key.includes(lowercaseQuery)) {
                    translations[key] = translations[key] ? { ...translations[key], ...value } : { ...value }
                } else if (Object.keys(apiTranslations[key]).filter(translationKey => translationKey.includes(lowercaseQuery)).length > 0) {
                    let values = {};
                    Object.entries(apiTranslations[key]).forEach(([subKey, subValue]) => {
                        if (subKey.includes(lowercaseQuery)) {
                            values[subKey] = apiTranslations[key][subKey];
                        }
                    })
                    translations[key] = translations[key] ? { ...translations[key], ...values } : { ...values }
                }
            })
            return Object.entries(translations).sort(([a, avalue], [b, bvalue]) => {
                if (a === selectedTranslation.language.toLowerCase()) return -1;
                if (b === selectedTranslation.language.toLowerCase()) return 1;
                return a.localeCompare(b);
            }).slice(0, allowedTranslationLimit)
        } else {
            return Object.entries(apiTranslations).sort(([a, avalue], [b, bvalue]) => {
                if (a === selectedTranslation.language.toLowerCase()) return -1;
                if (b === selectedTranslation.language.toLowerCase()) return 1;
                return a.localeCompare(b);
            }).slice(0, allowedTranslationLimit)
        }
    }, [apiTranslations, query, allowedTranslationLimit, selectedTestament, selectingTranslation, showAllLanguages, defaultTranslations])

    const handleTranslationAddition = ({ type, value, setInputValue }) => {
        if (type === "id") {
            web.get("https://bible.helloao.org/api/available_translations.json").then(request => {
                let trValue = {
                    pass: false,
                    value: null
                };
                if (request.status === 200) {
                    request.data.translations.map(translation => {
                        if (translation.id.toLowerCase() === value.toLowerCase()) {
                            trValue.pass = true;
                            trValue.value = translation;
                        }
                    })
                    if (trValue.pass) {
                        let translationValue = {
                            ...trValue.value
                        }
                        if (apiTranslations[translationValue.languageEnglishName.toLowerCase()] && apiTranslations[translationValue.languageEnglishName.toLowerCase()][value]) {
                            os.toast(`Translation Already Exists!`)
                        } else {
                            let translations = { ...apiTranslations };
                            translations[translationValue.languageEnglishName.toLowerCase()] = translations[translationValue.languageEnglishName.toLowerCase()] ? { ...translations[translationValue.languageEnglishName.toLowerCase()], [value.toLowerCase()]: translationValue } : { [value.toLowerCase()]: translationValue };
                            setSelectedTranslation({
                                language: translationValue.languageEnglishName.toLowerCase(),
                                version: translationValue.shortName
                            });
                            setApiTranslations(translations)
                            setShowCustomTranslation(false)
                            os.toast(`Translation ${value} added!`)
                        }
                    } else {
                        os.toast("no translation found")
                    }
                }
            })
        } else {
            web.get("https://bible.helloao.org/api/available_translations.json").then(request => {
                let trValue = {
                    pass: false,
                    value: null
                };
                if (request.status === 200) {
                    request.data.translations.map(translation => {
                        if (translation.website.toLowerCase() === value.toLowerCase()) {
                            trValue.pass = true;
                            trValue.value = translation;
                        }
                    })
                    if (trValue.pass) {
                        let translationValue = {
                            ...trValue.value
                        }
                        if (apiTranslations[translationValue.languageEnglishName.toLowerCase()] && apiTranslations[translationValue.languageEnglishName.toLowerCase()][trValue.value.shortName.toLowerCase()]) {
                            os.toast(`Translation Already Exists!`)
                        } else {
                            let translations = { ...apiTranslations };
                            translations[translationValue.languageEnglishName.toLowerCase()] = translations[translationValue.languageEnglishName.toLowerCase()] ? { ...translations[translationValue.languageEnglishName.toLowerCase()], [value.toLowerCase()]: translationValue } : { [value.toLowerCase()]: translationValue };
                            setSelectedTranslation({
                                language: translationValue.languageEnglishName.toLowerCase(),
                                version: translationValue.shortName
                            });
                            setApiTranslations(translations)
                            setShowCustomTranslation(false)
                            os.toast(`Translation ${value} added!`)
                        }
                    } else {
                        os.toast("no translation found")
                    }
                }
            })
        }
        setInputValue("")
    }

    const filteredTranslations = useMemo(() => {
        return [...translationOptions]
        if (selectingTranslation) {
            return translationOptions.map(languageOption => {
                const filteredTranslations = languageOption.translations.filter(translationOption =>
                    translationOption.short.toLowerCase().includes(query.toLowerCase()) ||
                    translationOption.name.toLowerCase().includes(query.toLowerCase())
                );

                if (filteredTranslations.length > 0) {
                    return { ...languageOption, translations: filteredTranslations };
                }
                return null;
            }).filter(languageOption => languageOption !== null);
        } else {
            return [...translationOptions];
        }
    }, [translationOptions, query, selectingTranslation]);
    function searchTranslation(searchTerm) {
        if (!searchTerm) return translationOptions;

        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        const results = translationOptions.reduce((acc, item) => {
            const filteredTranslations = item.translations.filter(translation =>
                (translation.short && translation.short.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (translation.name && translation.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (translation.id && translation.id.toLowerCase().includes(lowerCaseSearchTerm))
            );
            if (filteredTranslations.length > 0) {
                acc.push({ language: item.language, translations: filteredTranslations });
            }
            return acc;
        }, []);
        return results.length > 0 ? results : translationOptions;
    }
    const focusOnBook = useCallback(({ bookName, chapterNo }) => {
        setOpenSidebar(false);
        setQuery("");
        let chapter, queryArr;
        if (chapterNo) {
            chapter = chapterNo;
        } else {
            queryArr = [...query.split(" ")];
            if (parseInt(queryArr[queryArr.length - 1])) {
                chapter = parseInt(queryArr[queryArr.length - 1]);
            }
        }
        shout("closeMiniMapPortal");
        // whisper(thisBot, "focusOnBook", { bookname: bookName, chapter: chapter ? chapter : 0 });
        setTimeout(() => {
                Manage.open({
                    id: selectedTestamentData[0].id,
                    translationId: selectedTestamentData[0].translationId,
                    numberOfChapters: selectedTestamentData[0].numberOfChapters,
                    bookName,
                    chapterNo: chapter ? chapter : 1
                })
            }, 500)
    }, [query])

    const handleEnter = useCallback(() => {
        if (selectedTestamentData.length === 1 && !query.toLowerCase().includes("psalm")) {
            console.log(selectedTestamentData)
            focusOnBook({ bookName: selectedTestamentData[0].commonName });
        } else {
            if (query.toLowerCase().includes("psalm")) {
                if (query.split(" ").length > 1) {
                    let queryArr = query.split(" ");
                    let chapterNo = parseInt(queryArr[queryArr.length - 1]);
                    if (chapterNo !== NaN) {
                        let bookName;
                        for (let i = 0; i < PsalmsData.length; i++) {
                            if (chapterNo <= PsalmsData[i].endingBook + 1) {
                                bookName = PsalmsData[i].commonName;
                                break;
                            }
                        }
                        if (bookName) {
                            focusOnBook({ bookName: bookName, chapterNo: chapterNo });
                        } else {
                            os.toast("That chapter doesn't exist!!!")
                        }
                    } else {
                        os.toast("Please check the chapter no.!!!")
                    }
                } else {
                    focusOnBook({ bookName: "1 Psalms", chapterNo: 1 });
                }
            } else {
                setQuery(selectedTestamentData[0].commonName)
            }
        }
    }, [selectedTestamentData, query, focusOnBook])

    const handleTranslationChange = useCallback(({ translationData }) => {
        if (translationData.available) {
            setSelectedTranslation(translationData);
            setSelectingTranslation(false);
            setQuery("")
        } else {
            shout('showStep', { data: 'noTransition', func: async () => { } })
            // shout("makeModal", {
            //     title: "Translation Not Available",
            //     description: `Translations are not available yet, it will be available in the full version. Only Berean Standard Bible translation is available in this version.`
            // })
        }
    }, [])
    function getBooksDataForMenu(booksLink = false) {
        let formMenuBot = getBot('system', 'baseElements.formMenu');
        if (booksLink) {
            formMenuBot.masks['booksLink'] = booksLink
        }
        let bookPromise = formMenuBot.bookData();
        Promise.resolve(bookPromise).then((data) => {
            setBooksData([...data])
        }).catch((e) => {
            os.toast("something went wrong");
        });
    }
    globalThis.GetBooksDataForMenu = getBooksDataForMenu
    useEffect(() => {
        getBooksDataForMenu()
    }, [])

    useEffect(() => {
        if (selectedTestament, setQuery, query, openSearchBar, setOpenSearchBar, searchBarFocused, handleEnter !== undefined || selectedTestament, setQuery, query, openSearchBar, setOpenSearchBar, searchBarFocused, handleEnter !== null, selectedTestamentData) {
            globalThis.selectedTestament = selectedTestament;
            globalThis.setQuery = setQuery;
            globalThis.query = query;
            globalThis.openSearchBar = openSearchBar;
            globalThis.setOpenSearchBar = setOpenSearchBar;
            globalThis.searchBarFocused = searchBarFocused;
            globalThis.handleEnter = handleEnter;
            globalThis.selectedTestamentData = selectedTestamentData;
        }
        return () => {
            globalThis.selectedTestament = null;
            globalThis.setQuery = null;
            globalThis.query = null;
            globalThis.openSearchBar = null;
            globalThis.setOpenSearchBar = null;
            globalThis.searchBarFocused = null;
            globalThis.handleEnter = null;
            globalThis.selectedTestamentData = null;
        }
    }, [selectedTestament, setQuery, query, openSearchBar, setOpenSearchBar, searchBarFocused, handleEnter])

    useEffect(() => {
        web.get("https://bible.helloao.org/api/available_translations.json").then(request => {
            if (request.status === 200) {
                let translations = {};
                request.data.translations.map(translation => {
                    if (showAllLanguages) {
                        translations[translation.languageEnglishName.toLowerCase()] = translations[translation.languageEnglishName.toLowerCase()] ? { ...translations[translation.languageEnglishName.toLowerCase()], [translation.shortName.toLowerCase()]: translation } : { [translation.shortName.toLowerCase()]: translation };
                    } else {
                        if (defaultTranslations.includes(translation.languageEnglishName.toLowerCase())) {
                            translations[translation.languageEnglishName.toLowerCase()] = translations[translation.languageEnglishName.toLowerCase()] ? { ...translations[translation.languageEnglishName.toLowerCase()], [translation.shortName.toLowerCase()]: translation } : { [translation.shortName.toLowerCase()]: translation };
                        }
                    }
                })
                setApiTranslations(translations);
            }
        })
    }, [showAllLanguages])
    return <>
        <div class="testament-selection starterAnimation" style={{ opacity: 0 }}>
            <span class="sidebar-select">
                <div class="sidebar-book-selector">
                    <div class="sidebar-translation-selector" onClick={() => { setSelectingTranslation(!selectingTranslation); setQuery(""); }}>
                        <span class="sidebar-selected-title">{selectedTranslation.version}</span>
                        <span style={{ transition: "transform 0.3s", opacity: 0.3 }} class={`material-symbols-outlined ${selectingTranslation ? "upside-down" : ""}`}>
                            expand_more
                        </span>
                    </div>
                    {
                        selectedTestament === 0 && query.length === 0 && !selectingTranslation && <span onClick={() => { handleSelectTestament() }} class="ot baseT">
                            OT
                        </span>
                    }
                    {
                        selectedTestament === 1 && query.length === 0 && !selectingTranslation && <span onClick={() => { handleSelectTestament() }} class="nt baseT">
                            NT
                        </span>
                    }
                    {
                        (selectedTestament === 2 || query.length > 0) && !selectingTranslation && <span onClick={() => { handleSelectTestament() }} class="all baseT">
                            ALL
                        </span>
                    }
                    {
                        selectingTranslation && !showAllLanguages && <span onClick={() => { setShowAllLanguages(true) }} class="ot baseT">
                            Default Translations
                        </span>
                    }
                    {
                        selectingTranslation && showAllLanguages && <span onClick={() => { setShowAllLanguages(false) }} class="all baseT">
                            All Translations
                        </span>
                    }
                </div>
            </span>
        </div>
        <div class="sidebar-results starterAnimation" style={{ opacity: 0 }}>
            {
                booksData && selectedTestamentData && !selectingTranslation && <SideBarBooks selectedTestament={selectedTestament} booksData={selectedTestamentData} focusOnBook={focusOnBook} />
            }
            {
                selectingTranslation && <div class="sidebar-translation-options">
                    <div class="box" style={{ width: "100%", position: "absolute", top: "45px", left: "0", padding: "0px 10px", zIndex: "1" }}>
                        <input
                            type="text"
                            class="input"
                            value={query}
                            ref={inputRef}
                            onInput={e => {
                                setQuery(e.target.value)
                            }}
                            onKeyDown={e => {
                                if (e.key === "Enter" || e.keyCode === 13) {
                                    handleEnter();
                                }
                            }}
                            placeholder={selectingTranslation ? "Search Translations" : "Book name"}
                            onBlur={() => { setOpenSearchBar(false); setSearchBarFocused(false) }}
                            style={{ opacity: 1, borderRadius: "5px", paddingLeft: "30px", width: "100%", background: "#F7F7F7", border: "1px solid #E2E2E2" }}
                        />
                        <i class="material-symbols-outlined" style={{ width: "30px", left: "27px" }}>
                            search
                        </i>
                    </div>
                    {
                        filteredApiTranslations.map(([key, value]) => {
                            return <NewTransOptions translationName={key} translations={value} selectedTranslation={selectedTranslation} setSelectedTranslation={setSelectedTranslation} />
                        })
                    }
                    {allowedTranslationLimit < Object.entries(apiTranslations).length && filteredApiTranslations.length > 49 && <span onClick={() => setAllowedTranslationLimit(allowedTranslationLimit + 50)} style={{ transition: "transform 0.3s", opacity: 0.8, width: "100%", display: "flex", justifyContent: "center", fontSize: "36px" }} class={`material-symbols-outlined`}>
                        expand_more
                    </span>}
                </div>
            }
        </div>
        {selectingTranslation && <div class="sidebar-input-container custom-translation-container-main" style={{ bottom: showCustomTranslation ? "5px" : "-150px" }}>
            <div class="custom-translation-header" onClick={() => { setShowCustomTranslation(!showCustomTranslation) }}>
                <span>Custom Translations</span>
                <span style={{ transition: "0.5s linear all", transform: showCustomTranslation ? "rotateZ(45deg)" : "rotateZ(0deg)", cursor: "pointer" }} class="material-symbols-outlined">add</span>
            </div>
            <CustomTranslation handleTranslationAddition={handleTranslationAddition} />
        </div>}
        {!selectingTranslation && <div
            onClick={() => { setOpenSearchBar(false); setSearchBarFocused(true); inputRef.current.focus() }}
            style={{ opacity: 0 }}
            class={`${openSearchBar ? "open-searchbar starterAnimation" : query.length > 0 ? "open-sidebar-input-container starterAnimation" : "sidebar-input-container starterAnimation"}`}
        >
            <div class="box">
                <input
                    type="text"
                    class="input"
                    value={query}
                    ref={inputRef}
                    onInput={e => {
                        setQuery(e.target.value)
                    }}
                    onKeyDown={e => {
                        if (e.key === "Enter" || e.keyCode === 13) {
                            handleEnter();
                        }
                    }}
                    placeholder={selectingTranslation ? "Translation" : "Book name"}
                    onBlur={() => { setOpenSearchBar(false); setSearchBarFocused(false) }}
                />
                <i class="material-symbols-outlined">
                    search
                </i>
            </div>
        </div>}
    </>
}

const CustomTranslation = ({ handleTranslationAddition }) => {
    const [currentMode, setCurrentMode] = useState("id");
    const [inputValue, setInputValue] = useState("");

    return <div class="custom-translation-container">
        <div class="selectionsection">
            <div>
                <input checked={currentMode === "id"} onClick={e => setCurrentMode(e.target.value)} class="radioinput" type="radio" id="translationId" name="translation" value="id" />
                <span>From ID</span>
            </div>
            <div>
                <input checked={currentMode === "url"} onClick={e => setCurrentMode(e.target.value)} class="radioinput" type="radio" id="translationURL" name="translation" value="url" />
                <span>From URL</span>
            </div>
        </div>
        <div class="custom-tr-api">
            <span style={{ fontSize: "18px" }}>{currentMode === "id" ? "ID" : "URL"}</span>
            <div class="custom-tr-in-con">
                <input value={inputValue} onChange={e => setInputValue(e.target.value)} class="custom-tr-in" placeholder={currentMode === "id" ? "Enter ID" : "Enter URL"} />
                <button onClick={() => handleTranslationAddition({ type: currentMode, value: inputValue, setInputValue: setInputValue })} class="import-btn">Import</button>
            </div>
            <span style={{ fontSize: "16px", color: "#4459F3", cursor: "pointer" }} onClick={() => { os.openURL("https://bible.helloao.org/docs/") }}>{`View API >`}</span>
        </div>
    </div>
}

const NewTransOptions = ({ translationName, translations, selectedTranslation, setSelectedTranslation }) => {
    const [show, setShow] = useState(false)
    useEffect(() => {
        Object.entries(translations).map(([key, value]) => {
            if (value.shortName === selectedTranslation.version && value.languageEnglishName === selectedTranslation.language) {
                setShow(true);
            }
        })
    }, [selectedTranslation])
    return <div>
        <div class="translation-language" onClick={() => {
            setShow(!show)
        }}>
            <span style={{ textTransform: "capitalize" }}>{translationName}</span>
            <span style={{ transition: "transform 0.3s", opacity: 0.3 }} class={`material-symbols-outlined ${show ? "upside-down" : ""}`}>
                expand_more
            </span>
        </div>
        {
            show && <>
                <div style={{ margin: '16px 5px' }}>
                    {
                        Object.entries(translations).map(([key, value]) => {
                            return <div
                                onClick={async () => {
                                    // os.log(setBooksData)
                                    // return
                                    Manage.changeTranslationTo(value.id)
                                    setSelectedTranslation({
                                        language: value.languageEnglishName,
                                        version: value.shortName
                                    })
                                    let bot = getBot('system', 'main.UI2')
                                    bot.masks.transilation = value.id
                                    SetTransilation(value.id)
                                    bot.masks.transilationShort = value.shortName
                                    RefreshBible()
                                }}
                                style={{ background: selectedTranslation.version === value.shortName ? "rgba(59, 130, 246, 0.5)" : "rgba(1, 87, 155, 0.3)" }} class="translation-option" >
                                <span class="translation-title">{value.shortName}</span>
                                <span class="translation-description">{value.name}</span>
                            </div>
                        })
                    }
                </div>
            </>
        }
    </div>
}
const TransOption = ({ translationOption, index, idx = 0, setSelectedTranslation, selectedTranslation }) => {
    const [show, setShowFasle] = useState(
        translationOption.translations.find(e => e.short === selectedTranslation)
    )
    return <div>
        <div class="translation-language" onClick={() => {
            setShowFasle(!show)
        }}>
            {translationOption?.language}
            <span style={{ transition: "transform 0.3s", opacity: 0.3 }} class={`material-symbols-outlined ${show ? "upside-down" : ""}`}>
                expand_more
            </span>
        </div>
        {
            show && <>
                <div style={{ margin: '16px 0px' }}>
                    {
                        translationOption?.translations && translationOption.translations.map(e => {
                            return <div
                                onClick={async () => {
                                    // os.log(setBooksData)
                                    // return
                                    Manage.changeTranslationTo(e.id).then(e => {

                                        os.log(e, 'tjeda')
                                        setBooksData(e)
                                    })
                                    setSelectedTranslation(e.short)
                                    let bot = getBot('system', 'main.UI2')
                                    bot.masks.transilation = e.id
                                    SetTransilation(e.id)
                                    bot.masks.transilationShort = e.short
                                    RefreshBible()
                                }}
                                style={{ background: selectedTranslation === e.short ? "#E1F5FE" : "#B388FF" }} class="translation-option" >
                                <span class="translation-title">{e.short}</span>
                                <span class="translation-description">{e.name}</span>
                            </div>
                        })
                    }
                </div>
            </>
        }
    </div>
}
const SideBarBooks = ({ booksData, focusOnBook, selectedTestament }) => {
    const [lastBookClicked, setLastBookClicked] = useState(-1);
    const [bookData, setBookData] = useState(null);

    const refsArray = useRef([]);

    // Function to update the array of refs
    const updateRefsArray = useCallback((index, ref) => {
        refsArray.current[index] = ref;
        globalThis.BooksRefSearchBar = refsArray;
    }, []);


    const handleClick = useCallback(({ index, book }) => {
        shout('playSound', { soundName: "UI_Open_NumPad" });
        // refsArray.current[0]?.focus();
        if (index === lastBookClicked) {
            setLastBookClicked(-1);
            setBookData(null);
        } else {
            setBookData(book);
            setLastBookClicked(index);
        }
    }, [lastBookClicked])

    useEffect(() => {
        setLastBookClicked(-1);
        setBookData(null);
    }, [selectedTestament])

    useEffect(() => {
        if (booksData.length === 1) {
            setLastBookClicked(0);
            setBookData(booksData[0]);
        } else {
            setLastBookClicked(-1);
            setBookData(null);
        }
    }, [booksData]);

    useEffect(() => {
        globalThis.handleClickHeader = (bookName) => {
            if (globalThis.timeoutClicker) clearTimeout(globalThis.timeoutClicker);
            const index = booksData?.findIndex(book => book.name === bookName);
            if (index > -1) {
                globalThis.timeoutClicker = setTimeout(() => {
                    handleClick({ index, book: booksData[index] });
                }, 500)

                setTimeout(() => {
                    console.log(BooksRefSearchBar);
                    console.log("FOCSUING", BooksRefSearchBar.current[index].focus);
                    BooksRefSearchBar.current[index]?.focus();
                }, 5000);
            }
        };

        return () => {
            if (globalThis.timeoutClicker) clearTimeout(globalThis.timeoutClicker);
        }
    }, [booksData]);
    const refsObject = useMemo(() => {
        const refs = [];
        if (bookData?.numberOfChapters)
            for (let i = 0; i < bookData.numberOfChapters; i++) {
                refs.push(createRef())
            }
        return refs;
    }, [bookData]);

    globalThis.FocusOnChapter = (number) => {
        // os.log(number)
        refsObject[number]?.current.focus()
    }
    return <>
        {
            booksData && booksData.map((book, index) => {
                if (index > 0 && index % 2 !== 0) {
                    return <>
                        <div class={`sidebar-itm ${index === lastBookClicked ? "sidebar-selected-itm" : ""}`} ref={(ref) => updateRefsArray(index, ref)} tabIndex={index + 1} onClick={() => {
                            handleClick({ index: index, book: book })
                            setTimeout(() => {
                                FocusOnChapter(bookData?.numberOfChapters - 1)
                            }, 2000)
                        }}>
                            <span >
                                {book.commonName}
                            </span>
                            <span style={{ transition: "transform 0.3s", opacity: 0.3 }} class={`material-symbols-outlined ${index === lastBookClicked ? "upside-down" : ""}`}>
                                expand_more
                            </span>
                        </div>
                        {
                            index === lastBookClicked && <div class={`sidebar-chapters ${index === lastBookClicked ? "show-sidebar-chapter" : ""}`}>
                                {
                                    (index === lastBookClicked) && <SideBarChapters
                                        refsObject={refsObject}
                                        bookData={bookData}
                                        focusOnBook={focusOnBook}
                                        setLastBookClicked={setLastBookClicked}
                                        setBookData={setBookData}
                                    />
                                }
                            </div>
                        }
                        {
                            index === lastBookClicked + 1 && <div class={`sidebar-chapters ${index === lastBookClicked + 1 ? "show-sidebar-chapter-m" : ""}`}>
                                {
                                    (index === lastBookClicked + 1) && <SideBarChapters
                                        refsObject={refsObject}
                                        bookData={bookData}
                                        focusOnBook={focusOnBook}
                                        setLastBookClicked={setLastBookClicked}
                                        setBookData={setBookData}
                                    />
                                }
                            </div>
                        }
                    </>
                } else {
                    return <>
                        <div class={`sidebar-itm ${index === lastBookClicked ? "sidebar-selected-itm" : ""}`} ref={(ref) => updateRefsArray(index, ref)} tabIndex={index + 1} onClick={() => {
                            handleClick({ index: index, book: book })
                            setTimeout(() => {
                                FocusOnChapter()
                            }, 1000)
                        }}>
                            <span>
                                {book.commonName}
                            </span>
                            <span style={{ transition: "transform 0.3s", opacity: 0.3 }} class={`material-symbols-outlined ${index === lastBookClicked ? "upside-down" : ""}`}>
                                expand_more
                            </span>
                        </div>
                        <div class={`sidebar-chapters ${index === lastBookClicked ? booksData.length - 1 === index ? "show-sidebar-chapter" : "desktop-hide" : ""}`}>
                            {
                                (index === lastBookClicked) && <SideBarChapters
                                    refsObject={refsObject}
                                    bookData={bookData}
                                    focusOnBook={focusOnBook}
                                    setLastBookClicked={setLastBookClicked}
                                    setBookData={setBookData}
                                />
                            }
                        </div>
                    </>
                }
            })
        }
    </>
}

const SideBarChapters = ({ bookData, focusOnBook, setLastBookClicked, setBookData, refsObject }) => {
    const [renderingJSX, setRenderingJSX] = useState([]);

    const handleChapterClick = ({ bookName, chapterNo, ...data }) => {
        // if(introductionManager.masks.isASectionMakingTourGuide) return os.toast("Please wait while section is opening!");
        shout('playSound', { soundName: 'UI_Numpad_Click' })
        // ContainerRef?.current?.focus()
        // focusOnBook({bookName: bookName, chapterNo: chapterNo});
        setTimeout(() => {
            Manage.open({ ...data, bookName, chapterNo })
        }, 500)
        // setSelectedVerses([])
        setLastBookClicked(-1);
        setBookData(null);
        // console.clear()
    }
    const psalmsPartName = ({ index }) => {
        if (index <= 40) {
            return "1 Psalms"
        } else if (index <= 71) {
            return "2 Psalms"
        } else if (index <= 88) {
            return "3 Psalms"
        } else if (index <= 105) {
            return "4 Psalms"
        } else if (index <= 149) {
            return "5 Psalms"
        }
    }
    const [currentPsalms, setCurrentPsalms] = useState("1 Psalms");

    useEffect(() => {
        let renderJSX = [];
        if (bookData.startingBook || bookData.startingBook === 0) {
            for (let i = bookData.startingBook; i < bookData.endingBook + 1; i++) {
                renderJSX.push(<div onCLick={() => handleChapterClick({
                    id: bookData.id,
                    translationId: bookData.translationId,
                    numberOfChapters: bookData.numberOfChapters,
                    bookName: bookData.commonName,
                    chapterNo: i + 1
                })} ><span className={`sidebar-chapter-itm`}>{i + 1}</span></div>)
            }
        } else {
            if (bookData.commonName === "Psalms") {
                for (let i = 0; i < bookData.numberOfChapters; i++) {
                    if (i === 0) {
                        renderJSX.push(<button onCLick={() => { setCurrentPsalms(currentPsalms === "1 Psalms" ? "" : "1 Psalms"); }} class={`chapter-btn ${currentPsalms === "1 Psalms" ? "sidebar-selected-itm" : ""}`}>
                            <span class="psalms-btn">1 Psalms</span>
                        </button>)
                    } else if (i === 41) {
                        renderJSX.push(<button onCLick={() => { setCurrentPsalms(currentPsalms === "2 Psalms" ? "" : "2 Psalms"); }} class={`chapter-btn ${currentPsalms === "2 Psalms" ? "sidebar-selected-itm" : ""}`}>
                            <span class="psalms-btn">2 Psalms</span>
                        </button>)
                    } else if (i === 72) {
                        renderJSX.push(<button onCLick={() => { setCurrentPsalms(currentPsalms === "3 Psalms" ? "" : "3 Psalms"); }} class={`chapter-btn ${currentPsalms === "3 Psalms" ? "sidebar-selected-itm" : ""}`}>
                            <span class="psalms-btn">3 Psalms</span>
                        </button>)
                    } else if (i === 89) {
                        renderJSX.push(<button onCLick={() => { setCurrentPsalms(currentPsalms === "4 Psalms" ? "" : "4 Psalms"); }} class={`chapter-btn ${currentPsalms === "4 Psalms" ? "sidebar-selected-itm" : ""}`}>
                            <span class="psalms-btn">4 Psalms</span>
                        </button>)
                    } else if (i === 106) {
                        renderJSX.push(<button onCLick={() => { setCurrentPsalms(currentPsalms === "5 Psalms" ? "" : "5 Psalms"); }} class={`chapter-btn ${currentPsalms === "5 Psalms" ? "sidebar-selected-itm" : ""}`}>
                            <span class="psalms-btn">5 Psalms</span>
                        </button>)
                    }
                    renderJSX.push(<button style={{ display: currentPsalms === psalmsPartName({ index: i }) ? "flex" : "none" }} class="chapter-btn" onCLick={() => handleChapterClick({
                        id: bookData.id,
                        translationId: bookData.translationId,
                        numberOfChapters: bookData.numberOfChapters,
                        bookName: psalmsPartName({ index: i }),
                        chapterNo: i + 1
                    })} ><span className={`sidebar-chapter-itm`}>{i + 1}</span></button>)
                }
            } else {

                for (let i = 0; i < bookData.numberOfChapters; i++) {
                    renderJSX.push(<button ref={refsObject[i]} class={`chapter-btn ${i === bookData.numberOfChapters - 1 ? "lastOne" : ""}`} onCLick={() => handleChapterClick({
                        id: bookData.id,
                        translationId: bookData.translationId,
                        numberOfChapters: bookData.numberOfChapters,
                        bookName: bookData.commonName,
                        chapterNo: i + 1
                    })} ><span className={`sidebar-chapter-itm`}>{i + 1}</span></button>)
                }
            }
        }
        setRenderingJSX([...renderJSX]);
    }, [bookData, currentPsalms]);

    return <>
        {
            renderingJSX.map(jsx => {
                return jsx
            })
        }
    </>
}

return SearchBar;