import { ThePageWithEditor } from "app.components.thePage";
const { useState, useEffect, useCallback } = os.appHooks;
const styles = tags["Reference.css"]

const ReferenceComponent = ({ refId, updateReferences }) => {
    const [rdLoading, setRdLoading] = useState(true);
    const [rfContent, setRFContent] = useState("");

    const loadContent = useCallback(async ({ refKey }) => {
        setRdLoading(true);

        let references = refKey.split("-");
        let initialReference = references[0].split(",")[0].split(".");
        let contentReq = await web.get(`https://bible.helloao.org/api/BSB/${initialReference[0]}/${initialReference[1]}.json`)
        if (contentReq.status == 200) {
            const contentArray = [...contentReq.data.chapter.content];
            let content = "";
            let start = references[0].split(",")[0].split(".")[2];
            let end = references[1]?.split(",")[0].split(".")[2] || references[0].split(",")[0].split(".")[2];
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
            setRFContent(content);
        }
        setRdLoading(false);
    }, []);

    const handleRedirect = useCallback(async ({ referenceKey }) => {
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
    }, [])

    useEffect(() => {
        loadContent({ refKey: refId })
    }, [refId]);

    return <>
        <style>{styles}</style>
        <div class="reference-container" style={{ boxShadow: "rgba(99, 99, 99, 0.2) 0px 2px 8px 0px", width: "250px", height: "fit-content" }}>
            <div class="reference-components">
                <span onClick={() => { handleRedirect({ referenceKey: refId }) }} class="reference-title">{refId.split(",")[0].toUpperCase()}</span>
                {
                    rdLoading && <div class="loading-section"></div>
                }
                {
                    !rdLoading && <div class="reference-content">
                        <span>{rfContent}</span>
                    </div>
                }
            </div>
        </div>
    </>
}

export default ReferenceComponent;