const { useState, useEffect, useCallback } = os.appHooks;
const styles = tags["Reference.css"]
import ReferenceComponent from "references.manager.ReferenceComponent";
import { ThePageWithEditor } from "app.components.thePage";

const ReferenceModal = ({ references, id, book, chapter, verse }) => {
    const [referenceArray, setReferenceArray] = useState([]);
    const [referenceArrayKey, setReferenceArrayKey] = useState(null);
    const [rdLoading, setRdLoading] = useState(true);
    const [referenceData, setReferenceData] = useState({});
    const [showMore, setShowMore] = useState(false);

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
        openChapter({ referenceKey: referenceKey });
        closePopupSettings();
    }

    useEffect(() => {
        if (referenceArray.length > 0 && referenceArrayKey) {
            console.log("populating", referenceArray, referenceArrayKey)
            populateReferenceData();
        }
    }, [referenceArray, referenceArrayKey])

    useEffect(() => {
        setReferenceArray(showMore ? references.referencesArray : references.referencesArray.slice(0, 3));
        setReferenceArrayKey(references.key);
    }, [references, showMore])

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
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
        <div class="reference-container" onClick={e => e.stopPropagation()} onContextMenu={e => e.stopPropagation()} style={{ height: "400px", width: "250px", boxShadow: "rgba(99, 99, 99, 0.2) 0px 2px 8px 0px" }}>
            <div class="heading">
                <h2>{referenceArrayKey && `${tags.IdToName[referenceArrayKey.split(".")[0]]} ${referenceArrayKey.split(".")[1]}:${referenceArrayKey.split(".")[2]}`}</h2>
                <span onClick={() => { shout("ToggleReference", { book, chapter, verse }); closePopupSettings(); }} class="openTab material-symbols-outlined">
                    open_in_new
                </span>
            </div>
            {
                referenceArray.map(referenceKey => {
                    return <div class="reference-components">
                        <span onClick={e => { handleTitleContext({ e, referenceKey }) }} class="reference-title">{referenceKey.toUpperCase()}</span>
                        {
                            rdLoading && <div class="loading-section"></div>
                        }
                        {
                            !rdLoading && referenceData[referenceKey] && <div class="reference-content">
                                <span>{referenceData[referenceKey].content}</span>
                            </div>
                        }
                    </div>
                })
            }
            <div class="reference-components" style="cursor: pointer; justify-content: center; align-items: center;">
                <span onClick={() => { setShowMore(prev => !prev) }} class="material-symbols-outlined">{showMore ? "keyboard_arrow_up" : "keyboard_arrow_down"}</span>
            </div>
        </div>
    </>
}

export default ReferenceModal;