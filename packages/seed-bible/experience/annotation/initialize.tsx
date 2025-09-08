await os.unregisterApp('annotation');
await os.registerApp('annotation', thisBot);
const css = thisBot.tags["App.css"];
const dim = os.getCurrentDimension();
const { useState, useEffect, useMemo, useCallback, useRef } = os.appHooks;

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


// setOpenSidebar(false);

const App = () => {
    const [position, setPosition] = useState({ x: "calc(100vw - 315px)", y: "20px" });
    const [title, setTitle] = useState("");
    const [disable, setDisable] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [annotations, setAnnotations] = useState([]);
    const [update, setUpdate] = useState(false);
    const [mode, setMode] = useState(0);
    const [annots, setAnnots] = useState([]);
    const [selectedAnnot, setSelectedAnnot] = useState(null);
    const [loading, setLoading] = useState(false);
    const [botIds, setBotIds] = useState([...that.botIds]);
    const [page, setPage] = useState(1);
    const [nextPage, setNextPage] = useState(0);
    const [count, setCount] = useState(5);
    const [query, setQuery] = useState("");
    const [date, setDate] = useState(new Date().toJSON().slice(0,10));
    const [searchType, setSearchType] = useState("query");
    const [authId, setAuthId] = useState(null);

    const annotTypes = [
        {
            icon: "edit_note",
            title: "Text",
            type: "text",
            value: "",
            color: ""
        },
        {
            icon: "link",
            title: "Link",
            type: "link",
            value: "",
            color: ""
        },
        {
            icon: "volume_up",
            title: "Audio Note",
            type: "audio",
            value: null,
            color: "",
            recording: false
        },
    ]

    const publish = async () => {
        setDisable(true);
        setUploading(true);
        os.toast("Uploading Annotation")
        let body = JSON.stringify({
            annotations: JSON.stringify(annotations),
            title,
            bots: botIds.map(item => {
                let thatBot = getBot(byID(item));
                return {
                    label: thatBot.masks.label,
                    formAddress: thatBot.masks.formAddress,
                    x: thatBot.tags[dim + "X"],
                    y: thatBot.tags[dim + "Y"],
                }
            })
        });

        let blob = new Blob([body], { type: 'text/plain' });

        const record = await os.recordFile("vRK2.YW5ub3RhdGlvblJlY29yZA==.WmptMWdDa1RLMFYvQlhQR2hKa3hhUT09.subjectfull", blob);
        if(record.success){
            const result = await web.post("https://theographic-bible-api.netlify.app/api/annotations/postAnnotation", {
                recordAddress: record.url,
                recordName: "annotationRecord",
                title
            })
            if (result.status === 200) {
                console.log(result)
                os.toast("Annotation Uploaded")
            } else {
                os.toast("Uploading Failed")
            }
        }else{
            os.toast("Uploading Failed")
        }
        setDisable(false);
        setUploading(false);
    }

    useEffect(() => {
        globalThis.annotInitialized = true;
        return () => {
            globalThis.annotInitialized = false;
        }
    }, [])

    useEffect(() => { }, [update])

    useEffect(async () => {
        if(mode === 1){
            if(searchType === "query"){
                setLoading(true);
                const body = {
                    page,
                    count,
                    query
                }
                const url = attachQueryToURL("https://theographic-bible-api.netlify.app/api/annotations/getAnnotations", body)
                const result = await web.get(url);
                console.log(result)
                if(result.status === 200 && result.data.status === 200){
                    setAnnots([...result.data.data]);
                    setNextPage(result.data.nextCount)
                }else{
                    os.toast("failed to load data")
                }
                setLoading(false);
            }else{
                setLoading(true);
                const body = {
                    page,
                    count,
                    date
                }
                const url = attachQueryToURL("https://theographic-bible-api.netlify.app/api/annotations/getAnnotations", body)
                const result = await web.get(url);
                if(result.status === 200 && result.data.status === 200){
                    setAnnots([...result.data.data]);
                    setNextPage(result.data.nextCount)
                }else{
                    os.toast("failed to load data")
                }
                setLoading(false);
            }
        }
    }, [mode, page, query, searchType, date, authId])

    useEffect(() => {
        globalThis.annotBotIds = botIds;
        globalThis.setAnnotBotIds = setBotIds;
        globalThis.selectedAnnot = selectedAnnot;
        globalThis.setSelectedAnnot = setSelectedAnnot;
        globalThis.annotations = annotations;
        globalThis.setAnnotations = setAnnotations;
        globalThis.title = title;
        globalThis.setTitle = setTitle;
        globalThis.mode = mode;
        globalThis.setMode = setMode;
        return () => {
            globalThis.annotBotIds = null;
            globalThis.setAnnotBotIds = null;
            globalThis.selectedAnnot = null;
            globalThis.setSelectedAnnot = null;
            globalThis.annotations = null;
            globalThis.setAnnotations = null;
            globalThis.title = null;
            globalThis.setTitle = null;
            globalThis.mode = mode;
            globalThis.setMode = setMode;
        }
    }, [botIds, selectedAnnot, annotations, title, mode]);

    useEffect(() => {
        botIds.forEach(item => {
            const it = setInterval(() => {
                let thatBot = getBot(byID(item));
                setTagMask(thatBot, "strokeColor", "red", "tempLocal");
                if(thatBot.tags?.indexBot){
                    setTagMask(getBot(byID(thatBot.tags?.indexBot)), "strokeColor", "red", "tempLocal");
                }
            }, 100);
            setTagMask(getBot(byID(item)), "it", it, "tempLocal")
        })
        return () => {
            botIds.forEach(item => {
                let annotBot = getBot(byID(item));
                clearInterval(annotBot.masks.it);
                annotBot.masks.it = null;
                annotBot.masks.strokeColor = null;
                if(annotBot.tags?.indexBot){
                    getBot(byID(annotBot.tags?.indexBot)).masks.strokeColor = null;
                }
            })
        }
    }, [botIds]);

    useEffect(() => {
        if(authBot){
            setAuthId(authBot.tags.id);
        }
    }, [])

    return <>
        <style>{css}</style>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
        <div style={{ left: `${position.x}`, top: `${position.y}` }} class="chaism-tools-container">
            <div class="dragTool" draggable={true} onDrag={e => {
                if (e.screenX !== 0 && e.screenY > 20) {
                    setPosition({ x: `${e.screenX + 20}px`, y: `${e.screenY - 100}px` })
                }
            }}>
                <span class="material-symbols-outlined">
                    more_horiz
                </span>
            </div>
            <div class="animate-container">
                {
                    mode === 0 && <>
                        <div class="annot-item">
                            <span class="annot-item-title">Title</span>
                            <input disabled={disable} onChange={e => {
                                setTitle(e.target.value);
                            }} value={title} class="annot-item-input" placeholder="Title">{title}</input>
                        </div>
                        {
                            annotations.map((item, index) => {
                                switch (item.type) {
                                    case "text": {
                                        return <div class="annot-item">
                                            <span class="annot-item-title">{item.title}</span>
                                            <textarea disabled={disable} onChange={e => {
                                                let tempAnnot = [...annotations];
                                                tempAnnot[index].value = e.target.value;
                                                setAnnotations([...tempAnnot]);
                                            }} value={item.value} type="text" class="annot-item-textarea">{item.value}</textarea>
                                            <span onClick={() => {
                                                let tempAnnot = [...annotations];
                                                tempAnnot.splice(index, 1);
                                                setAnnotations([...tempAnnot]);
                                            }} class="del-btn">X</span>
                                        </div>
                                    }
                                    case "link": {
                                        return <div class="annot-item">
                                            <span class="annot-item-title">{item.title}</span>
                                            <input disabled={disable} onChange={e => {
                                                let tempAnnot = [...annotations];
                                                tempAnnot[index].value = e.target.value;
                                                setAnnotations([...tempAnnot]);
                                            }} value={item.value} type="url" class="annot-item-input">{item.value}</input>
                                            <span onClick={() => {
                                                let tempAnnot = [...annotations];
                                                tempAnnot.splice(index, 1);
                                                setAnnotations([...tempAnnot]);
                                            }} class="del-btn">X</span>
                                        </div>
                                    }
                                    case "audio": {
                                        return <div class="annot-item">
                                            <span class="annot-item-title">{item.title}</span>
                                            <div class="recording-section"></div>
                                            {
                                                annotations[index].value === null && <button onClick={async () => {
                                                    let tempAnnot = [...annotations];
                                                    if (!item.recording) {
                                                        os.beginAudioRecording();
                                                        tempAnnot[index].recording = true;
                                                        setAnnotations([...tempAnnot]);
                                                        setUpdate(!update);
                                                    } else {
                                                        const data = await os.endAudioRecording();
                                                        data.arrayBuffer().then(buffer => {
                                                            const base64 = bytes.toBase64Url(new Uint8Array(buffer), data.type.split(";")[0]);
                                                            // setAudio([...audio, base64]);
                                                            tempAnnot[index].recording = false;
                                                            tempAnnot[index].value = base64;
                                                            setAnnotations([...tempAnnot]);
                                                            setUpdate(!update);
                                                            os.toast("Recording Saved");
                                                        })
                                                    }
                                                }} class="audio-btn">{item.recording ? "Stop ⏹️" : "Record ⏺️"}</button>
                                            }
                                            {
                                                annotations[index].value !== null && <button class="audio-btn" onClick={() => {
                                                    os.playSound(item.value)
                                                }}>Play Audio Note</button>
                                            }
                                            <span onClick={() => {
                                                let tempAnnot = [...annotations];
                                                if (tempAnnot[index].value) {
                                                    tempAnnot[index].value = null
                                                } else {
                                                    tempAnnot.splice(index, 1);
                                                }
                                                setAnnotations([...tempAnnot]);
                                            }} class="del-btn">X</span>
                                        </div>
                                    }
                                }
                            })
                        }
                        <div class="annot-types">
                            <span class="available-annot">Available Annotations</span>
                            {
                                annotTypes.map((item, index) => {
                                    return <button disabled={disable} onClick={() => {
                                        setAnnotations([...annotations, item])
                                    }} class="annot-type">
                                        <span class="annot-type-title">{item.title}</span>
                                        <span class="annot-type-icon material-symbols-outlined">
                                            {item.icon}
                                        </span>
                                    </button>
                                })
                            }
                        </div>

                        

                        <div class="annot-item">
                            <button disabled={disable} onClick={publish} class="publish-btn">{uploading ? "Publishing" : "Publish"}</button>
                        </div>
                    </>
                }
                {
                    mode === 1 && <>
                        <div class="search-section">
                            {
                                loading && <div style={{display: "grid", placeItems: 'center', height: '100%',width: '100%'}}>
                                    <img src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/b2c0239dfc73b7f41fe4e5c39e5784348f88f0150a70d58ef4e63fdb4befe397.png" alt="AO" className="img-loader" />
                                </div>
                            }
                            {
                                !loading && annots.length > 0 && <>
                                    {annots.map((item, index) => {
                                        let time = new Date(item.createdAt);
                                        return <div class="annot--item" id={`${index}-annnot`}>
                                                <div class="annot-content">
                                                    <span class="annot-content-title">{item.title}</span>
                                                    <span class="annot-content-period">
                                                        <span class="annot-content-year">{`${time.getMonth() + 1}-${time.getDate() - 1}-${time.getFullYear()}`}</span>
                                                        <span class="annot-content-time">{`${time.getHours()}:${time.getMinutes()}`}</span>
                                                    </span>
                                                </div>
                                                <div class="vote-section">
                                                    <div class="vote-arrows">
                                                        <button id={`${index}-upvote`} class="vote-arrow"
                                                            onClick={async () => {
                                                                let authKey;
                                                                if(authId !== null){
                                                                    authKey = authId;
                                                                }else{
                                                                    let authBot = await os.requestAuthBot();
                                                                    if(authBot){
                                                                        authKey = authBot.tags.id;
                                                                        setAuthId(authBot.tags.id);
                                                                        return
                                                                    }else{
                                                                        os.toast("Authentication Failed!");
                                                                        return
                                                                    }
                                                                }
                                                                let tempAnnots = [...annots];
                                                                if(tempAnnots[index].upvoters.includes(authKey)){
                                                                    tempAnnots[index].upvoters = tempAnnots[index].upvoters.filter(upvoter => upvoter !== authKey)
                                                                }else{
                                                                    tempAnnots[index].upvoters.push(authKey);
                                                                    tempAnnots[index].downvoters = tempAnnots[index].downvoters.filter(downvoter => downvoter !== authKey)
                                                                }
                                                                setAnnots(tempAnnots);
                                                                let body = {
                                                                    uid: item.uid,
                                                                    authId: authKey
                                                                }
                                                                const url = attachQueryToURL("https://theographic-bible-api.netlify.app/api/annotations/upvoteAnnot", body);
                                                                const result = await web.get(url);
                                                            }}
                                                            >
                                                            <span class={`material-symbols-outlined ${item.upvoters.includes(authId) ? "upvote-arrow" : ""} `}>
                                                                arrow_upward
                                                            </span>
                                                        </button>
                                                        <div class="vote-count" style={{color: item.upvoters.length - item.downvoters.length > 0 ? "red" : item.upvoters.length - item.downvoters.length < 0 ? "blue" : "black"}}>
                                                            {item.upvoters.length - item.downvoters.length}
                                                        </div>
                                                        <button id={`${index}-downvote`} class="vote-arrow"
                                                            onClick={async () => {
                                                                let authKey;
                                                                if(authId !== null){
                                                                    authKey = authId;
                                                                }else{
                                                                    let authBot = await os.requestAuthBot();
                                                                    if(authBot){
                                                                        authKey = authBot.tags.id;
                                                                        setAuthId(authBot.tags.id);
                                                                        return
                                                                    }else{
                                                                        os.toast("Authentication Failed!");
                                                                        return
                                                                    }
                                                                }
                                                                let tempAnnots = [...annots];
                                                                if(tempAnnots[index].downvoters.includes(authKey)){
                                                                    tempAnnots[index].downvoters = tempAnnots[index].downvoters.filter(downvoter => downvoter !== authKey)
                                                                }else{
                                                                    tempAnnots[index].downvoters.push(authKey);
                                                                    tempAnnots[index].upvoters = tempAnnots[index].upvoters.filter(upvoter => upvoter !== authKey)
                                                                }
                                                                setAnnots(tempAnnots);
                                                                let body = {
                                                                    uid: item.uid,
                                                                    authId: authKey
                                                                }
                                                                const url = attachQueryToURL("https://theographic-bible-api.netlify.app/api/annotations/upvoteAnnot", body);
                                                                const result = await web.get(url);
                                                            }}
                                                        >
                                                            <span class={`material-symbols-outlined ${item.downvoters.includes(authId) ? "downvote-arrow" : ""} `}>
                                                                arrow_downward
                                                            </span>
                                                        </button>
                                                    </div>
                                                    <button class="vote-arrow"
                                                        onClick={() => {
                                                            if(selectedAnnot){
                                                                setSelectedAnnot(null);
                                                                sendIcon(null);
                                                            }else{
                                                                setSelectedAnnot(item);
                                                                sendIcon({ type: 'newAnnot', trayColor: "#ffffff", dragerColor: "#000000", action: null });
                                                            }
                                                        }}
                                                    >
                                                        <span class={`material-symbols-outlined`}>
                                                            content_copy
                                                        </span>
                                                    </button>
                                                </div>
                                        </div>
                                    })}
                                </>
                            }
                            {
                                !loading && annots.length === 0 && <span style={{marginTop: "10px"}}>No similar annotations found!</span>
                            }
                        </div>
                        <div class="navigation-section">
                            <button disabled={page === 1 || loading} class="nav-btn publish-btn" onClick={() => setPage(page - 1)}>{`<`}</button>
                            {
                                searchType === "query" && <input type="text" class="nav-input" placeholder="Search" value={query} onChange={e => setQuery(e.target.value)}></input>
                            }
                            {
                                searchType === "date" && <input type="date" class="nav-input" value={date} onChange={e => setDate(e.target.value)}></input>
                            }
                            <button disabled={loading} class="nav-btn publish-btn" onClick={() => setSearchType(searchType === "query" ? "date" : "query")}>
                                <span class="material-symbols-outlined">
                                    autorenew
                                </span>
                            </button>
                            <button disabled={nextPage === 0 || loading} class="nav-btn publish-btn" onClick={() => setPage(page + 1)}>{`>`}</button>
                        </div>
                    </>
                }
                <div class="annot-item">
                    <button disabled={disable} onClick={() => setMode(mode === 0 ? 1 : 0)} class="publish-btn">{mode === 0 ? "Explore" : "Back"}</button>
                </div>
                <div class="annot-item">
                    <button disabled={disable} onClick={() => os.unregisterApp('annotation')} class="publish-btn">Close</button>
                </div>
            </div>
        </div>
    </>
}
os.compileApp('annotation', <App />);