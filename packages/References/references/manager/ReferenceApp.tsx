const { useState, useEffect, useCallback } = os.appHooks;
const styles = tags["Reference.css"]
import ReferenceComponent from "references.manager.ReferenceComponent";
import { ThePageWithEditor } from "app.components.thePage";

const ReferenceApp = ({ references, id }) => {
    const [referenceArray, setReferenceArray] = useState([]);
    const [referenceArrayKey, setReferenceArrayKey] = useState(null);
    const [rdLoading, setRdLoading] = useState(true);
    const [referenceData, setReferenceData] = useState({});

    const populateReferenceData = useCallback(async () => {
        setRdLoading(true);

        let referenceBot = getBot('system', 'references.manager');
        referenceBot.masks.referenceDataObject = null;

        console.log(referenceArrayKey, referenceBot.masks?.referenceDataObject)

        if (referenceBot.masks?.referenceDataObject && referenceBot.masks?.referenceDataObject[referenceArrayKey]) {
            console.log("retriveing from storage");
            setReferenceData({ ...referenceBot.masks.referenceDataObject[referenceArrayKey] });
        } else {
            console.log("retriveing from web");
            const referenceDataPromises = referenceArray.map(referenceKey => {
                let references = referenceKey.split("-");
                let initialReference = references[0].split(".");
                return web.get(`https://bible.helloao.org/api/BSB/${initialReference[0]}/${initialReference[1]}.json`)
            })

            const referenceReqs = await Promise.all(referenceDataPromises);

            let tempReferenceData = {};

            referenceReqs.forEach((res, index) => {
                if(res.status !== 200){
                    return
                }
                const contentArray = [...res.data.chapter.content];
                let content = "";
                let referenceKey = referenceArray[index];
                let references = referenceKey.split("-");
                let start = references[0].split(".")[2];
                let end = references[1]?.split(".")[2] || references[0].split(".")[2];
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
                console.log(referenceKey, "referenceBot.tags.references[referenceKey]")
                if (referenceBot.tags.references[referenceKey.split("-")[0]]) {
                    tempReferenceData[referenceKey] = {
                        content: content,
                        references: [...referenceBot.tags.references[referenceKey.split("-")[0]]]
                    };
                }
            })
            setReferenceData({ ...tempReferenceData });

            setTagMask(referenceBot, "referenceDataObject", referenceBot.masks?.referenceDataObject ? { ...referenceBot.masks.referenceDataObject, [referenceArrayKey]: { ...tempReferenceData } } : { [referenceArrayKey]: { ...tempReferenceData } }, "tempLocal");
        }

        setRdLoading(false);
    }, [referenceArray, referenceArrayKey])

    const updateReferences = ({ key }) => {
        let referenceManager = getBot('system', 'references.manager');
        const referencesArray = referenceManager.tags.references[key];
        setReferenceArray(referencesArray.map(item => item.split(",")[0]));
        setReferenceArrayKey(key);
        globalThis.currentReference = key;
    }

    const handleRedirect = useCallback(async ({ referenceKey }) => {
        let references = referenceKey.split("-");
        // let initialReference = references[0].split(".");
        // const el = {
        //     id: uuid(),
        //     taken: false,
        //     data: {
        //         use: "thePage",
        //         type: "book",
        //         book: tags.IdToName[initialReference[0]],
        //         bookId: initialReference[0],
        //         chapter: initialReference[1],
        //         translation: "BSB",
        //     },
        // }
        // AddTab({
        //     ...el
        // });

        // SetActiveTab(el.id)

        // const checkEmpty = PanelsApps.find((e) => !e.tabData);
        // const id = uuid();
        // ReplaceApplication(checkEmpty.id, {
        //     id: id,
        //     App: <ThePageWithEditor tab={el} panelId={id} preferTab={true} />,
        //     to: "panel",
        //     minWidth: "30rem",
        // });
        updateReferences({ key: references[0] })
        openChapter({referenceKey: references[0]})
        // await os.sleep(2000)
        // let start = references[0].split(".")[2];
        // let end = references[1]?.split(".")[2] || references[0].split(".")[2];
        // console.log("starting highlight", start, end);
        // if (start <= end) {
        //     for (let i = start; i <= end; i++) {
        //         console.log(`highlighting verse ${i}`);
        //         HighlightVerse(i);
        //     }
        // }
    }, []);

    const openChapter = async ({ referenceKey }) => {
        let references = referenceKey.split("-");
        let initialReference = references[0].split(".");
        const el = {
            id: uuid(),
            taken: false,
            data: {
                use: "thePage",
                type: "book",
                book: tags.IdToName[initialReference[0]],
                bookId: initialReference[0],
                chapter: initialReference[1],
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
        updateReferences({ key: references[0] })
        await os.sleep(2000)
        let start = references[0].split(".")[2];
        let end = references[1]?.split(".")[2] || references[0].split(".")[2];
        console.log("starting highlight", start, end);
        if (start <= end) {
            for (let i = start; i <= end; i++) {
                console.log(`highlighting verse ${i}`);
                HighlightVerse(i);
            }
        }
    }

    const handleTitleContext = async ({ e, referenceKey }) => {
        e.stopPropagation();
        e.preventDefault();
        closePopupSettings();
        await os.sleep(100);
        const MenuOptions = {
            type: "normal",
            items: [
                {
                    icon: <></>,
                    title: `Open ${tags.IdToName[referenceKey.split(".")[0]]} ${referenceKey.split(".")[1]}`,
                    onClick: () => {
                        openChapter({ referenceKey: referenceKey })
                    },
                }
            ],
        };
        openPopupSettings(MenuOptions)
    }

    const showVerse = async ({ refId }) => {
        closePopupSettings();
        await os.sleep(100);
        openPopupSettings(
            <ReferenceComponent refId={refId} updateReferences={updateReferences} />,
            null,
            true
        )
    }

    useEffect(() => {
        if (referenceArray.length > 0 && referenceArrayKey) {
            console.log("populating", referenceArray, referenceArrayKey)
            populateReferenceData();
        }
    }, [referenceArray, referenceArrayKey])

    useEffect(() => {
        setReferenceArray(references.referencesArray);
        setReferenceArrayKey(references.key);
    }, [references])

    useEffect(() => {
        globalThis.SetReferenceArray = setReferenceArray;
        globalThis.SetReferenceArrayKey = setReferenceArrayKey;
        return () => {
            globalThis.SetReferenceArray = null;
            globalThis.SetReferenceArrayKey = null;
        }
    }, [])
    return <>
        <style>{styles}</style>
        <div class="reference-container" onContextMenu={e => e.stopPropagation()}>
            <div class="heading">
                <h2>{referenceArrayKey && `${tags.IdToName[referenceArrayKey.split(".")[0]]} ${referenceArrayKey.split(".")[1]}:${referenceArrayKey.split(".")[2]}`}</h2>
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
                referenceArray.map(referenceKey => {
                    return <div class="reference-components">
                        <span onClick={() => handleRedirect({ referenceKey })} onContextMenu={e => { handleTitleContext({ e, referenceKey }) }} class="reference-title">{referenceKey.toUpperCase()}</span>
                        {
                            rdLoading && <div class="loading-section"></div>
                        }
                        {
                            !rdLoading && referenceData[referenceKey] && <div class="reference-content">
                                <span>{referenceData[referenceKey].content}</span>
                                {
                                    referenceData[referenceKey].references.map(refKey => {
                                        const refArray = refKey.split("-");
                                        return refArray.map(refItem => {
                                            const separatedRef = refItem.split(",")[0].split(".");
                                            const refString = `(${separatedRef[0]} ${separatedRef[1]}:${separatedRef[2]}) `
                                            if(!separatedRef[0] || !separatedRef[1] || !separatedRef[2]){
                                                return <></>
                                            }
                                            return <span onClick={() => { showVerse({ refId: refItem.split(",")[0] }) }} class="subRef">{refString}</span>
                                        })
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