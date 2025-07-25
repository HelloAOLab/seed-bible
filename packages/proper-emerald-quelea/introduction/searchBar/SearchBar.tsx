const { useState, useEffect, useMemo, useRef, useCallback, createRef, useContext } = os.appHooks;
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

function generateQuery(params) {
    let queryArray = [];
    for (let key in params) {
        if (params.hasOwnProperty(key)) {
            queryArray.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
        }
    }
    return queryArray.join('&');
}

// Function to attach query string to URL
function attachQueryToURL(url, params) {
    const queryString = generateQuery(params);
    return url + (url.includes('?') ? '&' : '?') + queryString;
}

const SearchBar = () => {

    const [query, setQuery] = useState("");
    const inputRef = useRef(null);

    const [booksData, setBooksData] = useState(masks?.booksData || tags.booksData);
    const [selectedTestament, setSelectedTestament] = useState(2);
    const [openSearchBar, setOpenSearchBar] = useState(false);
    const [searchBarFocused, setSearchBarFocused] = useState(false);

    const [defaultTranslations, setDefaultTranslations] = useState(masks?.defaultTranslations || [
        "english",
        "spanish",
        "arabic",
        "hindi",
        "hebrew",
        "ancient greek",
        "custom"
    ])

    const [apiTranslations, setApiTranslations] = useState(masks?.apiTranslations || {
        english: {},
        spanish: {},
        arabic: {},
        hindi: {},
        hebrew: {},
        "ancient greek": {}
    })

    const [showAllLanguages, setShowAllLanguages] = useState(false);
    const [allowedTranslationLimit, setAllowedTranslationLimit] = useState(50);
    const [selectedTranslation, setSelectedTranslation] = useState(masks?.selectedTranslation || {
        languageEnglishName: "English",
        id: "BSB",
        shortName: "BSB"
    });
    const [showCustomTranslation, setShowCustomTranslation] = useState(false);
    const [selectingTranslation, setSelectingTranslation] = useState(false);

    const handleSelectTestament = useCallback(() => {
        if (selectedTestament === 0) {
            setSelectedTestament(1);
        } else if (selectedTestament === 1) {
            setSelectedTestament(2)
        } else if (selectedTestament === 2) {
            setSelectedTestament(0)
        }
    }, [selectedTestament]);

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
                if (booksData.length > 39) {
                    if (selectedTestament === 0) {
                        return [...booksData.slice(0, 39)]
                    } else if (selectedTestament === 1) {
                        return [...booksData.slice(39)]
                    } else {
                        return [...booksData]
                    }
                } else {
                    if (selectedTestament === 0) {
                        return [...booksData.slice(0, booksData.length)]
                    } else if (selectedTestament === 1) {
                        return [...booksData.slice(booksData.length)]
                    } else {
                        return [...booksData]
                    }
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
                if (a === selectedTranslation.languageEnglishName.toLowerCase()) return -1;
                if (b === selectedTranslation.languageEnglishName.toLowerCase()) return 1;
                return a.localeCompare(b);
            }).slice(0, allowedTranslationLimit)
        } else {
            return Object.entries(apiTranslations).sort(([a, avalue], [b, bvalue]) => {
                if (a === selectedTranslation.languageEnglishName.toLowerCase()) return -1;
                if (b === selectedTranslation.languageEnglishName.toLowerCase()) return 1;
                return a.localeCompare(b);
            }).slice(0, allowedTranslationLimit)
        }
    }, [apiTranslations, query, allowedTranslationLimit, selectedTranslation])

    const getUrlUpToKeyword = useCallback((link, keyword) => {
        try {
            const url = new URL(link);
            const index = url.pathname.indexOf(keyword);
            if (index !== -1) {
                return url.origin + url.pathname.substring(0, index);
            }
            return url.origin + url.pathname; // If keyword not found, return full URL
        } catch (error) {
            console.error('Invalid URL:', error.message);
            return null;
        }
    }, [])
    const handleTranslationAddition = async ({ type, value, setInputValue = () => { } }) => {
        let available_translations_req = await web.get("https://bible.helloao.org/api/available_translations.json");
        if (type === "id") {
            let trValue = {
                pass: false,
                value: null
            };
            if (available_translations_req.status === 200) {
                available_translations_req.data.translations.map(translation => {
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
                            languageEnglishName: translationValue.languageEnglishName.toLowerCase(),
                            id: translationValue.shortName,
                            shortName: translationValue.shortName
                        });
                        setApiTranslations(translations)
                        setShowCustomTranslation(false)
                        if (!defaultTranslations.includes(translationValue.languageEnglishName.toLowerCase())) {
                            setDefaultTranslations([...defaultTranslations, translationValue.languageEnglishName.toLowerCase()])
                        }
                        os.toast(`Translation ${value} added!`)
                    }
                } else {
                    os.toast("no translation found")
                }
            }
        } else {
            let trValue = {
                pass: false,
                value: null
            };
            if (available_translations_req.status === 200) {
                available_translations_req.data.translations.map(translation => {
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
                            languageEnglishName: translationValue.languageEnglishName.toLowerCase(),
                            id: translationValue.shortName,
                            shortName: translationValue.shortName
                        });
                        setApiTranslations(translations)
                        setShowCustomTranslation(false)
                        if (!defaultTranslations.includes(translationValue.languageEnglishName.toLowerCase())) {
                            setDefaultTranslations([...defaultTranslations, translationValue.languageEnglishName.toLowerCase()])
                        }
                        os.toast(`Translation ${value} added!`)
                    }
                } else {
                    console.log(value)
                    web.hook({
                        method: 'GET',
                        url: value
                    }).then(e => {
                        const url = new URL(value);
                        let origin = getUrlUpToKeyword(value, "/api");
                        let data = e.data;
                        if (value.includes("/available_translations.json")) {
                            let translations = data.translations;
                            let tempApiTranslations = { ...apiTranslations };
                            let defaultTranslation;
                            for (let i = 0; i < translations.length; i++) {
                                let translation = translations[i];
                                console.log(translation, "translation")
                                let languageEnglishName = translation.languageEnglishName.toLowerCase()
                                let controlledTranslation = {
                                    languageEnglishName: languageEnglishName,
                                    id: translation.id,
                                    listOfBooksApiLink: `${url.origin}${translation.listOfBooksApiLink}`,
                                    origin: url.origin,
                                    shortName: translation.shortName
                                }
                                if (i === 0) {
                                    defaultTranslation = controlledTranslation;
                                }
                                tempApiTranslations[languageEnglishName] = tempApiTranslations[languageEnglishName] ? { ...tempApiTranslations[languageEnglishName], [translation.shortName.toLowerCase()]: controlledTranslation } : { [translation.shortName.toLowerCase()]: controlledTranslation };
                                if (!defaultTranslations.includes(languageEnglishName)) {
                                    setDefaultTranslations([...defaultTranslations, languageEnglishName])
                                }
                            }
                            setSelectedTranslation(defaultTranslation);
                            setApiTranslations(tempApiTranslations);
                            setShowCustomTranslation(false);
                            os.log("All Translations Added")
                        } else {
                            if (data?.translation && data?.books) {
                                let translation = data.translation;
                                let controlledTranslation = {
                                    languageEnglishName: translation.languageEnglishName.toLowerCase(),
                                    id: translation.id,
                                    listOfBooksApiLink: `${url.origin}${translation.listOfBooksApiLink}`,
                                    origin,
                                    shortName: translation.shortName
                                }
                                if (apiTranslations[translation.languageEnglishName.toLowerCase()] && apiTranslations[translation.languageEnglishName.toLowerCase()][trValue.value.shortName.toLowerCase()]) {
                                    os.toast(`Translation Already Exists!`)
                                } else {
                                    let translations = { ...apiTranslations };

                                    translations[translation.languageEnglishName.toLowerCase()] = translations[translation.languageEnglishName.toLowerCase()] ? { ...translations[translation.languageEnglishName.toLowerCase()], [translation.shortName.toLowerCase()]: controlledTranslation } : { [translation.shortName.toLowerCase()]: controlledTranslation };
                                    setSelectedTranslation({
                                        ...controlledTranslation
                                    });
                                    setApiTranslations(translations)
                                    setShowCustomTranslation(false)
                                    if (!defaultTranslations.includes(translation.languageEnglishName.toLowerCase())) {
                                        setDefaultTranslations([...defaultTranslations, translation.languageEnglishName.toLowerCase()])
                                    }
                                    os.toast(`Translation ${value} added!`)
                                }
                            } else {
                                os.toast("not a valid link")
                            }
                        }
                    }).catch((e) => {
                        os.log(e)
                        os.toast("not a valid link")
                    })
                }
            }

        }
        setInputValue("")
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
            globalThis.Open(selectedTestamentData[0].id, electedTestamentData[0].numberOfChapters, 'BSB')
            // Manage.open({
            //     id: selectedTestamentData[0].id,
            //     translationId: selectedTestamentData[0].translationId,
            //     numberOfChapters: selectedTestamentData[0].numberOfChapters,
            //     bookName,
            //     chapterNo: chapter ? chapter : 1
            // })
        }, 500)
    }, [query])

    const handleEnter = useCallback(() => {
        if (selectedTestamentData.length === 1 && !query.toLowerCase().includes("psalm")) {
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

    const fetchBookdata = useCallback(() => {
        console.log(selectedTranslation, "selectedTranslation")
        if (selectedTranslation?.listOfBooksApiLink?.includes("https")) {
            web.get(`${selectedTranslation.listOfBooksApiLink}`).then(e => {
                let book0 = e.data.books[0];
                ChangeTranslation(selectedTranslation.id, book0, selectedTranslation.origin);
                setBooksData([...e.data.books])
            }).catch(e => {
                console.log(e)
            })
        } else {
            web.get(`https://bible.helloao.org/api/${selectedTranslation.id}/books.json`).then(e => {
                let book0 = e.data.books[0];
                ChangeTranslation(selectedTranslation.id, book0, "https://bible.helloao.org");
                setBooksData([...e.data.books])
            }).catch(e => {
                console.log(e)
            })
        }

    }, [selectedTranslation])

    useEffect(() => {
        if (!apiTranslations[selectedTranslation.languageEnglishName.toLowerCase()]) {
            let translations = { ...apiTranslations };
            translations[selectedTranslation.languageEnglishName.toLowerCase()] = {
                [selectedTranslation.shortName.toLowerCase()]: selectedTranslation
            }
            console.log(translations, "1 trans")
            setTagMask(thisBot, "apiTranslations", translations, "local")
            setTagMask(thisBot, "defaultTranslations", [...defaultTranslations, selectedTranslation.languageEnglishName.toLowerCase()], "local")
            setApiTranslations(translations)
            setDefaultTranslations([...defaultTranslations, selectedTranslation.languageEnglishName.toLowerCase()])
        }
        setTagMask(thisBot, "selectedTranslation", selectedTranslation, "local");
        fetchBookdata();
    }, [selectedTranslation, apiTranslations, defaultTranslations])

    useEffect(() => {
        let allTranslations = null;
        if (!masks?.allTranslations) {
            web.get("https://bible.helloao.org/api/available_translations.json").then(request => {
                if (request.status === 200) {
                    allTranslations = request.data.translations;
                    allTranslations = allTranslations.map(item => {
                        return {
                            ...item,
                            languageEnglishName: item?.languageEnglishName || item.englishName
                        }
                    })
                    setTagMask(thisBot, "allTranslations", request.data.translations, "local");
                    let translations = { ...apiTranslations };

                    allTranslations.map(translation => {
                        let englishName = translation.languageEnglishName.toLowerCase();
                        if (showAllLanguages) {
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
                        } else {
                            if (!defaultTranslations.includes(englishName)) {
                                if (translations[englishName]) {
                                    delete translations[englishName]
                                }
                            } else {
                                let shortName = translation.shortName.toLowerCase();
                                if (!translations[englishName]) {
                                    translations[englishName] = {
                                        [shortName]: translation
                                    }
                                } else {
                                    if (!translations[englishName][shortName]) {
                                        translations[englishName] = {
                                            ...translations[englishName],
                                            [shortName]: translation
                                        }
                                    }
                                }
                            }
                        }
                    })
                    console.log(translations, "2 trans")
                    setTagMask(thisBot, "apiTranslations", translations, "local")
                    setTagMask(thisBot, "defaultTranslations", defaultTranslations, "local")
                    setApiTranslations(translations);
                    return
                }
            })
        } else {
            allTranslations = masks.allTranslations;
        }
        let translations = { ...apiTranslations };

        allTranslations.map(translation => {
            let englishName = translation.languageEnglishName.toLowerCase();
            if (showAllLanguages) {
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
            } else {
                if (!defaultTranslations.includes(englishName)) {
                    if (translations[englishName]) {
                        delete translations[englishName]
                    }
                } else {
                    let shortName = translation.shortName.toLowerCase();
                    if (!translations[englishName]) {
                        translations[englishName] = {
                            [shortName]: translation
                        }
                    } else {
                        if (!translations[englishName][shortName]) {
                            translations[englishName] = {
                                ...translations[englishName],
                                [shortName]: translation
                            }
                        }
                    }
                }
            }
        })
            console.log(translations, "3 trans")
        setTagMask(thisBot, "apiTranslations", translations, "local")
        setTagMask(thisBot, "defaultTranslations", defaultTranslations, "local")
        setApiTranslations(translations);
    }, [showAllLanguages, defaultTranslations])

    useEffect(() => {
        if (selectedTestament, setQuery, query, openSearchBar, setOpenSearchBar, searchBarFocused, handleEnter !== undefined || selectedTestament, setQuery, query, openSearchBar, setOpenSearchBar, searchBarFocused, handleEnter !== null) {
            globalThis.selectedTestament = selectedTestament;
            // globalThis.setQuery = setQuery;
            globalThis.query = query;
            globalThis.openSearchBar = openSearchBar;
            globalThis.setOpenSearchBar = setOpenSearchBar;
            globalThis.searchBarFocused = searchBarFocused;
            globalThis.handleEnter = handleEnter;
        }
        return () => {
            globalThis.selectedTestament = null;
            // globalThis.setQuery = null;
            globalThis.query = null;
            globalThis.openSearchBar = null;
            globalThis.setOpenSearchBar = null;
            globalThis.searchBarFocused = null;
            globalThis.handleEnter = null;
        }
    }, [selectedTestament, setQuery, query, openSearchBar, setOpenSearchBar, searchBarFocused, handleEnter])

    console.log("searchBar initated", booksData)

    return <>
        <div class="testament-selection starterAnimation" style={{ opacity: 0 }}>
            <span class="sidebar-select">
                <div class="sidebar-book-selector">
                    <div class="sidebar-translation-selector" onClick={() => { setSelectingTranslation(!selectingTranslation); setQuery(""); }}>
                        <span class="sidebar-selected-title">{selectedTranslation.shortName}</span>
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
                booksData && selectedTestamentData && !selectingTranslation && selectedTranslation && <SideBarBooks selectedTranslation={selectedTranslation} selectedTestament={selectedTestament} booksData={selectedTestamentData} focusOnBook={focusOnBook} />
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

    const shareTranslatation = async ({ translation }) => {
        console.log(translation)
        if (translation?.origin) {
            let url = `https://aolab-bible-api.netlify.app/api/translations/addTranslation`;
            let params = {
                uid: translation.id,
                translation: JSON.stringify(translation)
            }
            let queryUrl = attachQueryToURL(url, params);
            let result = await web.get(queryUrl);
        }
        let translationUrl = `https://ao.bot/?pattern=${configBot.tags.pattern}&bios=local%20inst&translationId=${translation.id}`;
        // let translationUrl = `${configBot.tags.url}&translationId=${translation.id}`;
        os.setClipboard(translationUrl)
        os.toast("Copied translation share code");
    }
    useEffect(() => {
        Object.entries(translations).map(([key, value]) => {
            if (value.id === selectedTranslation.id && value.languageEnglishName === selectedTranslation.languageEnglishName) {
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
                                    ChangeTranslation(value.id)
                                    setSelectedTranslation(value)
                                }}
                                style={{ background: selectedTranslation.id === value.id ? "rgba(59, 130, 246, 0.5)" : "rgba(1, 87, 155, 0.3)" }} class="translation-option" >
                                <span class="translation-title">{value.shortName}</span>
                                <span class="translation-description">{value.name}</span>
                                <button onClick={(e) => {
                                    e.stopPropagation();
                                    shareTranslatation({ translation: value })
                                }} class="material-symbols-outlined share-btn">share</button>
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
const SideBarBooks = ({ booksData, focusOnBook, selectedTestament, selectedTranslation }) => {
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
                                        selectedTranslation={selectedTranslation}
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
                                        selectedTranslation={selectedTranslation}
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
                                    selectedTranslation={selectedTranslation}
                                />
                            }
                        </div>
                    </>
                }
            })
        }
    </>
}
const SideBarChapters = ({ bookData, focusOnBook, setLastBookClicked, setBookData, refsObject, selectedTranslation }) => {
    const [renderingJSX, setRenderingJSX] = useState([]);

    const handleChapterClick = ({ bookName, chapterNo, bookData, ...data }) => {
        // if(introductionManager.masks.isASectionMakingTourGuide) return os.toast("Please wait while section is opening!");
        console.log(bookData, "bookData")
        shout('playSound', { soundName: 'UI_Numpad_Click' })
        // ContainerRef?.current?.focus()
        // focusOnBook({bookName: bookName, chapterNo: chapterNo});
        // SetSelectedVerses([]);
        // SetHolded(null);
        // Manage.unhighlightEveryVerse();
        if (globalThis.CloseNewList) CloseNewList();
        setTimeout(() => {
            // Manage.open({ ...data, bookName, chapterNo })
            let chapterUrl = bookData.firstChapterApiLink.replace("1.json", `${chapterNo}.json`)
            globalThis.Open(data.id, chapterNo, selectedTranslation.id, chapterUrl);
            // MainApp2({ action: 'addStudyNotes', props: { book: bookName, bookId: data.id, chapter: chapterNo, forced: true } })
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
                    chapterNo: i + 1,
                    bookData
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
                        chapterNo: i + 1,
                        bookData
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