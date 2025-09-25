import { captureElement } from 'aiApps.voiceAssistant.Utils'

const HandleEvents = ({ dc, data }) => {
    console.log(data);
    switch (data.name) {
        case "getTime": {
            const now = new Date().toLocaleTimeString();
            dc.send(
                JSON.stringify({
                    type: "conversation.item.create",
                    item: {
                        type: "function_call_output",
                        call_id: data.call_id,
                        output: now,
                    }
                })
            );
            dc.send(
                JSON.stringify({ type: "response.create" })
            );
            break
        }
        case "analyzeScreen": {
            (async () => {
                try {
                    const { userSpecification } = JSON.parse(data.arguments || "{}");
                    const imageBase64 = await captureElement();

                    dc.send(JSON.stringify({
                        type: "response.create"
                    }));

                    const response = await ai.chat({
                        role: 'user',
                        content: [
                            {
                                base64: imageBase64,
                                mimeType: "image/png",
                            },
                            {
                                text: userSpecification || 'please describe the image'
                            }
                        ]
                    }, {
                        preferredModel: 'gpt-4o'
                    });

                    dc.send(
                        JSON.stringify({
                            type: "conversation.item.create",
                            item: {
                                type: "function_call_output",
                                call_id: data.call_id,
                                output: response.content,
                            }
                        })
                    );

                    dc.send(JSON.stringify({ type: "response.create" }));
                } catch (err) {
                    dc.send(JSON.stringify({
                        type: "conversation.item.create",
                        item: {
                            type: "function_call_output",
                            call_id: data.call_id,
                            output: err.message
                        }
                    }));
                    dc.send(JSON.stringify({ type: "response.create" }));
                }
            })();
            break
        }
        case "getCurrentChapterDetail": {
            let chapterContent = `${BibleData.book}-${BibleData.chapter} \n`;
            for (let i = 0; i < BibleData.content.length; i++) {
                chapterContent += `${BibleData.content[i].heading} \n`
                let verses = BibleData.content[i].verses;
                for (let j = 0; j < verses.length; j++) {
                    chapterContent += `${verses[j].verseNumber} ${verses[j].text} \n`
                }
            }
            dc.send(
                JSON.stringify({
                    type: "conversation.item.create",
                    item: {
                        type: "function_call_output",
                        call_id: data.call_id,
                        output: chapterContent,
                    }
                })
            );
            dc.send(
                JSON.stringify({ type: "response.create" })
            );
            break
        }
        case "openChapter": {
            let { bookId, chapter } = JSON.parse(data.arguments || "{}");

            let searchBar = getBot('system', 'introduction.searchBar');
            let booksData = [...searchBar.tags.booksData];
            let correctId;
            chapter = Number(chapter);
            for (let book of booksData) {
                if (book.name.toLowerCase() === bookId.toLowerCase() || book.commonName.toLowerCase() === bookId.toLowerCase()) {
                    if (chapter <= book.numberOfChapters) {
                        correctId = book.id;
                    }
                }
            }

            console.log(bookId, chapter, correctId)

            if (correctId) {
                globalThis.Open(correctId, chapter)
                dc.send(JSON.stringify({
                    type: "conversation.item.create",
                    item: {
                        type: "function_call_output",
                        call_id: data.call_id,
                        output: `opened chapter ${chapter} of ${bookId}`
                    }
                }));
                dc.send(JSON.stringify({ type: "response.create" }));
            } else {
                dc.send(JSON.stringify({
                    type: "conversation.item.create",
                    item: {
                        type: "function_call_output",
                        call_id: data.call_id,
                        output: `unable to open it`
                    }
                }));
                dc.send(JSON.stringify({ type: "response.create" }));
            }
            break
        }
        case "openPreviousChapter": {

            let searchBar = getBot('system', 'introduction.searchBar');
            let booksData = [...searchBar.tags.booksData];
            let bookName, chapterNo;
            for (let i = 0; i < booksData.length; i++) {
                let book = booksData[i];
                if (globalThis.BibleData.bookId === book.id && globalThis.BibleData.chapter > 1) {
                    bookName = book.name;
                    chapterNo = globalThis.BibleData.chapter - 1;
                    break;
                } else if (globalThis.BibleData.bookId === book.id && globalThis.BibleData.chapter === 1 && i > 0) {
                    bookName = booksData[i - 1].name;
                    chapterNo = booksData[i - 1].numberOfChapters;
                    break;
                }
            }
            console.log(bookName, chapterNo, globalThis.BibleData.bookId, globalThis.BibleData.chapter, booksData)

            if (bookName && chapterNo) {
                globalThis.NavFunctions.openPrevChapter()
                dc.send(JSON.stringify({
                    type: "conversation.item.create",
                    item: {
                        type: "function_call_output",
                        call_id: data.call_id,
                        output: `opened chapter ${chapterNo} of ${bookName}`
                    }
                }));
                dc.send(JSON.stringify({ type: "response.create" }));
            } else {
                dc.send(JSON.stringify({
                    type: "conversation.item.create",
                    item: {
                        type: "function_call_output",
                        call_id: data.call_id,
                        output: `unable to open it`
                    }
                }));
                dc.send(JSON.stringify({ type: "response.create" }));
            }
            break
        }
        case "openNextChapter": {
            console.log(BibleData, "BibleData")
            let searchBar = getBot('system', 'introduction.searchBar');
            let booksData = [...searchBar.tags.booksData];
            let bookName, chapterNo;
            for (let i = 0; i < booksData.length; i++) {
                let book = booksData[i];
                console.log(book);
                if (globalThis.BibleData.bookId === book.id && globalThis.BibleData.chapter < book.numberOfChapters) {
                    bookName = book.name;
                    chapterNo = globalThis.BibleData.chapter + 1;
                    console.log("match");
                    break;
                } else if (globalThis.BibleData.bookId === book.id && globalThis.BibleData.chapter >= book.numberOfChapters && i < booksData.length) {
                    bookName = booksData[i + 1].name;
                    chapterNo = 1;
                    console.log("match");
                    break;
                }
            }

            if (bookName && chapterNo) {
                globalThis.NavFunctions.openNextChapter()
                dc.send(JSON.stringify({
                    type: "conversation.item.create",
                    item: {
                        type: "function_call_output",
                        call_id: data.call_id,
                        output: `opened chapter ${chapterNo} of ${bookName}`
                    }
                }));
                dc.send(JSON.stringify({ type: "response.create" }));
            } else {
                dc.send(JSON.stringify({
                    type: "conversation.item.create",
                    item: {
                        type: "function_call_output",
                        call_id: data.call_id,
                        output: `unable to open it`
                    }
                }));
                dc.send(JSON.stringify({ type: "response.create" }));
            }
            break
        }
        case "highlight": {
            (async () => {
                try {
                    let { highlightWord, highlightVerse, color } = JSON.parse(data.arguments || "{}");
                    highlightVerse = Number(highlightVerse);

                    if (highlightVerse) {
                        let verse;
                        for (let i = 0; i < BibleData.content.length; i++) {
                            let verses = BibleData.content[i].verses;
                            for (let j = 0; j < verses.length; j++) {
                                if (highlightVerse === verses[j].verseNumber) {
                                    verse = verses[j].text;
                                    break
                                }
                                if (verse) break;
                            }
                        }
                        HighlightWords({
                            words: [verse],
                            color: "#000", // text color
                            backgroundColor: "#ffeb3b", // highlight color
                            createAttributes: (book, chapter, verse) => {
                                return {
                                    style: {
                                        backgroundColor: color || "lightblue"
                                    }
                                }
                            }
                        });

                        console.log(verse, highlightVerse, typeof highlightVerse, "verse")

                        dc.send(
                            JSON.stringify({
                                type: "conversation.item.create",
                                item: {
                                    type: "function_call_output",
                                    call_id: data.call_id,
                                    output: `verse ${verse} highlighted`,
                                }
                            })
                        );
                    } else {
                        HighlightWords({
                            words: [highlightWord],
                            color: "#000", // text color
                            backgroundColor: "#ffeb3b", // highlight color
                            createAttributes: (book, chapter, verse) => {
                                return {
                                    style: {
                                        backgroundColor: color || "lightblue"
                                    }
                                }
                            }
                        });

                        dc.send(
                            JSON.stringify({
                                type: "conversation.item.create",
                                item: {
                                    type: "function_call_output",
                                    call_id: data.call_id,
                                    output: `${highlightWord} highlighted`,
                                }
                            })
                        );
                    }

                    dc.send(JSON.stringify({ type: "response.create" }));
                } catch (err) {
                    dc.send(JSON.stringify({
                        type: "conversation.item.create",
                        item: {
                            type: "function_call_output",
                            call_id: data.call_id,
                            output: err.message
                        }
                    }));
                    dc.send(JSON.stringify({ type: "response.create" }));
                }
            })();
            break
        }
        case "clearHighlight": {
            globalThis.ClearAllWordHighlights()
            dc.send(JSON.stringify({
                type: "conversation.item.create",
                item: {
                    type: "function_call_output",
                    call_id: data.call_id,
                    output: "cleared highlighted words"
                }
            }));
            dc.send(JSON.stringify({ type: "response.create" }));
        }
        case "highlightLocation": {
            let { color } = JSON.parse(data.arguments || "{}");
            let searchBar = getBot('system', 'introduction.searchBar');
            let locations = searchBar.tags["places-new"]
            let locationsArr = [];

            for (let i = 0; i < BibleData.content.length; i++) {
                let verses = BibleData.content[i].verses;
                for (let j = 0; j < verses.length; j++) {
                    let verse = verses[j].text.split(" ")
                    for (let word of verse) {
                        if (locations[word.replace(/[^a-zA-Z]/g, '').toLowerCase()]) {
                            locationsArr.push(word.replace(/[^a-zA-Z]/g, '').toLowerCase())
                        }
                    }
                }
            }

            console.log(locationsArr);

            if (locationsArr.length > 0) {
                HighlightWords({
                    words: locationsArr,
                    color: "#000", // text color
                    backgroundColor: "#ffeb3b", // highlight color
                    createAttributes: (book, chapter, verse) => {
                        return {
                            onMouseEnter: async (e) => {
                                e.target.style.color = "#0D47A1";
                                e.target.style.fontWeight = "400";
                            },
                            onMouseLeave: async (e) => {
                                setTimeout(() => {
                                    e.target.style.color = "";
                                    e.target.style.fontWeight = "";
                                    e.target.style.fontStyle = "";
                                }, 2000)
                            },
                            onContextMenu: async (e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                console.log(book, chapter, verse)
                                shout('onVeresRightClick', {
                                    verseNumber: verse.verseNumber,
                                    text: verse.text,
                                    chapter,
                                    book,
                                    highlighted: true,
                                    extraContext: [
                                        {
                                            address: "Locations",
                                            label: "Locations",
                                            items: [
                                                {
                                                    icon: <span class="material-symbols-outlined">location_on</span>,
                                                    title: () => 'Open Location',
                                                    onClick: async () => {
                                                        globalThis.AddFloatingApp({
                                                            App: <div className="mainCanvas" style={{ width: '100%', height: '100%', 'border-radius': '16px' }}>
                                                            </div>,
                                                            title: `Canvas`,
                                                            position: { x: 200, y: 150 },
                                                            size: { width: 300, height: 150 }
                                                        });
                                                        let geoJson;
                                                        console.log(verse, "verse")
                                                        let placeData = tags.locations[verse.text.toLowerCase()];
                                                        if (placeData.place === placeData.geojson) {
                                                            geoJson = await web.get(`https://raw.githubusercontent.com/Bored-Wizard/isreal_geojson/main/${placeData.geojson}.geojson`);
                                                        } else {
                                                            geoJson = await web.get(`https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/main/geometry/${placeData.geojson}.geojson`);
                                                        }
                                                        if (geoJson.status === 200) {
                                                            whisper(getBot('system', 'ext_geoImporter.importer'), "loadMap", { file: geoJson.data, loadGame: BibleData?.loadGame ? true : false, openOverlay: true })
                                                        } else {
                                                            os.toast("Something went wrong while retrieving the data");
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    ]
                                });
                            },
                            style: { backgroundColor: color || "lightblue" }
                        }
                    }
                });
                dc.send(JSON.stringify({
                    type: "conversation.item.create",
                    item: {
                        type: "function_call_output",
                        call_id: data.call_id,
                        output: `Highlighted ${locationsArr.length} locations present in this chapter namely ${locationsArr.join(" ")}`
                    }
                }));
                dc.send(JSON.stringify({ type: "response.create" }));

            } else {
                dc.send(JSON.stringify({
                    type: "conversation.item.create",
                    item: {
                        type: "function_call_output",
                        call_id: data.call_id,
                        output: "no locations found on this chapter"
                    }
                }));
                dc.send(JSON.stringify({ type: "response.create" }));
            }

        }
        case "getChapterContext": {
            let chapterContent = `${BibleData.book}-${BibleData.chapter} \n`;
            for (let i = 0; i < BibleData.content.length; i++) {
                chapterContent += `${BibleData.content[i].heading} \n`
                let verses = BibleData.content[i].verses;
                for (let j = 0; j < verses.length; j++) {
                    chapterContent += `${verses[j].verseNumber} ${verses[j].text} \n`
                }
            }
            dc.send(JSON.stringify({
                type: "conversation.item.create",
                item: {
                    type: "function_call_output",
                    call_id: data.call_id,
                    output: `${chapterContent}`
                }
            }));
            dc.send(JSON.stringify({ type: "response.create" }));
        }
    }
}

export default HandleEvents;