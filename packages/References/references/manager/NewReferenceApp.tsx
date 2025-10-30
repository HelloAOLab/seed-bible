const { useState, useEffect, useCallback } = os.appHooks;
const styles = tags["Reference.css"]
import ReferenceComponent from "references.manager.ReferenceComponent";
import { ThePageWithEditor } from "app.components.thePage";

const ReferenceApp = ({ reference }) => {
    const [currentReference, setCurrentReference] = useState(null);
    const [rdLoading, setRdLoading] = useState(true);
    const [referenceData, setReferenceData] = useState({});

    const populateReferenceData = useCallback(async () => {
        setRdLoading(true);

        let referenceBot = getBot('system', 'references.manager');

        const referenceArrayKey = `${reference.book}.${reference.chapter}.${reference.verse}`;

        if (referenceBot.masks?.referenceDataObject && referenceBot.masks?.referenceDataObject[referenceArrayKey]) {
            console.log("retriveing from storage");
            setReferenceData({ ...referenceBot.masks.referenceDataObject[referenceArrayKey] });
        } else {
            console.log("retriveing from web");
            const referenceDataPromises = currentReference.references.map(reference => {
                return web.get(`https://bible.helloao.org/api/BSB/${reference.book}/${reference.chapter}.json`)
            })

            const referenceReqs = await Promise.all(referenceDataPromises);

            let tempReferenceData = {};

            let subReferences = [];

            referenceReqs.forEach((res, index) => {
                if (res.status !== 200) {
                    return
                }
                const contentArray = [...res.data.chapter.content];
                let content = "";
                let reference = currentReference.references[index];
                const referenceKey = `${reference.book}.${reference.chapter}.${reference.verse}`;
                let start = reference.verse;
                let end = reference?.endVerse || reference.verse;
                if (start <= end) {
                    for (let i = start; i <= end; i++) {
                        for (let j = 0; j < contentArray.length; j++) {
                            if (contentArray[j]?.number == i) {
                                let contentString = contentArray[j].content.map(data => {
                                    if (typeof (data) === "string") {
                                        return data
                                    } else if (data?.text) {
                                        return data.text
                                    } else {
                                        return ""
                                    }
                                }).join(" ");
                                content += `${contentString} `;
                                break
                            }
                        }
                    }
                }
                tempReferenceData[referenceKey] = { content };
                subReferences.push(thisBot.GetReferences({ bookId: reference.book, chapter: reference.chapter, verse: reference.verse }))
            })

            let subReferencesRes = await Promise.all(subReferences);

            subReferencesRes.forEach((res, index) => {
                let reference = currentReference.references[index];
                const referenceKey = `${reference.book}.${reference.chapter}.${reference.verse}`;
                if (!res) {
                    return
                }
                tempReferenceData[referenceKey] = { ...tempReferenceData[referenceKey], references: [...res.references.slice(0, 5)] };
            })
            setReferenceData({ ...tempReferenceData });
        }

        setRdLoading(false);
    }, [currentReference])

    const updateReferences = async ({ reference }) => {
        const newReference = await thisBot.GetReferences({ bookId: reference.book, chapter: reference.chapter, verse: reference.verse });
        setCurrentReference(newReference)
    }

    const handleRedirect = useCallback(async ({ reference }) => {
        updateReferences({ reference })
        openChapter({ reference })
    }, []);

    const openChapter = async ({ reference }) => {
        const el = {
            id: uuid(),
            taken: false,
            data: {
                use: "thePage",
                type: "book",
                book: tags.IdToName[reference.book],
                bookId: reference.book,
                chapter: reference.chapter,
                translation: "BSB",
            },
        }
        AddTab({
            ...el
        });

        SetActiveTab(el.id)

        const checkEmpty = PanelsApps.find((e) => !e.tabData);
        const id = uuid();
        ReplaceApplication(checkEmpty.id, {
            id: id,
            App: <ThePageWithEditor tab={el} panelId={id} preferTab={true} />,
            to: "panel",
            minWidth: "30rem",
        });
        await os.sleep(2000)
        let start = reference.verse;
        let end = reference?.endVerse || reference.verse;
        if (start <= end) {
            for (let i = start; i <= end; i++) {
                console.log(`highlighting verse ${i}`);
                HighlightVerse(i);
            }
        }
    }

    const showVerse = async ({ reference }) => {
        closePopupSettings();
        await os.sleep(100);
        openPopupSettings(
            <ReferenceComponent reference={reference} handleRedirect={handleRedirect} />,
            null,
            true
        )
    }

    useEffect(() => {
        if (currentReference) {
            populateReferenceData();
            globalThis.currentReferenceKey = `${currentReference.book}.${currentReference.chapter}.${currentReference.verse}`;
        }
    }, [currentReference])

    useEffect(() => {
        setCurrentReference(reference)
    }, [reference]);

    useEffect(() => {
        globalThis.SetCurrentReference = setCurrentReference;
        return () => {
            globalThis.SetCurrentReference = null;
        }
    }, [currentReference])

    return <>
        <style>{styles}</style>
        <div class="reference-container" onContextMenu={e => e.stopPropagation()}>
            <div class="heading">
                <h2>{`${tags.IdToName[currentReference?.book]} ${currentReference?.chapter}:${currentReference?.verse}`}</h2>
                <span onClick={() => {
                    const panelKey = `reference_PANEL_ID`;

                    if (globalThis.makingApp === "reference") {
                        RemoveApplicationByID(globalThis[panelKey]);
                        globalThis[panelKey] = null;
                        globalThis.makingApp = null;
                        globalThis.currentReference = null;
                        return;
                    }
                }} class="material-symbols-outlined">
                    close
                </span>
            </div>
            {
                currentReference?.references.map(childReference => {
                    return <div class="reference-components">
                        <span onClick={() => handleRedirect({ reference: childReference })} class="reference-title">{`${tags.IdToName[childReference.book]} ${childReference.chapter}:${childReference.verse}${childReference?.endVerse ? `-${childReference.endVerse}` : ""}`}</span>
                        {
                            rdLoading && <div class="loading-section"></div>
                        }
                        {
                            !rdLoading && referenceData[`${childReference.book}.${childReference.chapter}.${childReference.verse}`] && <div class="reference-content">
                                <span>{referenceData[`${childReference.book}.${childReference.chapter}.${childReference.verse}`].content}</span>
                                {
                                    referenceData[`${childReference.book}.${childReference.chapter}.${childReference.verse}`]?.references?.map(subRef => {
                                        return <span onClick={() => { showVerse({ reference: subRef }) }} class="subRef">{`(${isNaN(subRef.book[0]) ? `${subRef.book}` : `${subRef.book[0]} ${subRef.book.slice(1)}`} ${subRef.chapter}:${subRef.verse}) `}</span>
                                    })
                                }
                            </div>
                        }
                    </div>
                })
            }
        </div>
    </>
}

export default ReferenceApp;