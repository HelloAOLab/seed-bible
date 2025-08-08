await os.unregisterApp('aiAssistant');
await os.registerApp('aiAssistant', thisBot);
const css = getBot('system', 'experience.animateTool').tags["App.css"];
const active = tags["active.css"];
const { useState, useEffect, useMemo, useCallback, useRef } = os.appHooks;

setOpenSidebar(false);

const filterData = audioBuffer => {
  const rawData = audioBuffer; // We only need to work with one channel of data
  const samples = 70; // Number of samples we want to have in our final data set
  const blockSize = Math.floor(rawData.length / samples); // Number of samples in each subdivision
  const filteredData = [];
  for (let i = 0; i < samples; i++) {
    filteredData.push(rawData[i * blockSize]); 
  }
  return filteredData;
}

const App = () => {
    const [currentCursor, setCurrentCursor] = useState("");
    const [position, setPosition] = useState({ x: "calc(100vw - 310px)", y: "20px" });
    const [humeStarted, setHumeStarted] = useState(false);
    const [aiReady, setAiReady] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiMessages, setAiMessages] = useState([]);
    const [shouldSend, setShouldSend] = useState(false);

    const onDown = async () => {
        if(!humeStarted && !aiLoading){
            if(masks?.ss){
                clearTimeout(masks.ss);
                masks.ss = null;
            }
            setShouldSend(false);
            let ss = setTimeout(() => {
                setShouldSend(true);
                masks.ss = null;
            }, 1000);
            setTagMask(thisBot, "ss", ss, "tempLocal");
            setHumeStarted(true);
            await os.beginAudioRecording({
                mimeType: 'audio/wav'
            });
        }
    }

    const onUp = async () => {
        if(shouldSend){
            setHumeStarted(false);
            let data = await os.endAudioRecording();
            if(data){
                const arrayBuffer = await data.arrayBuffer();
                console.log(arrayBuffer, data)
                let f = filterData(arrayBuffer);
                console.log(f, "fff")
                const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
                const file = new File([blob], "rec.wav");
                setAiLoading(true);
                const transcription = await openAIClient.audio.transcriptions.create({
                    file,
                    model: "whisper-1",
                    prompt: "The sentence may be cut off, do not make up words to fill in the rest of the sentence.",
                    language: "en",
                    temperature: 0.05
                });
                if(transcription.text === ""){
                    setAiLoading(false);
                }
                whisper(thisBot, "callChatGptResponse", {
                    role: "user",
                    content: transcription.text
                })
                setShouldSend(false);
            }
        }else{
            try{
                await os.endAudioRecording()
            }catch{() => {}}
            setHumeStarted(false);
            setAiLoading(false);
            setShouldSend(false);
            if(masks?.ss){
                clearTimeout(masks.ss);
                masks.ss = null;
            }
        }
    }

    useEffect(() => {
        setTagMask(thisBot, "initiated", true, "tempLocal");
        return () => {
            os.endAudioRecording()
            masks.initiated = null;
        }
    }, []);

    useEffect(() => {
        globalThis.humeStarted = humeStarted;
        globalThis.setHumeStarted = setHumeStarted;
        globalThis.aiReady = aiReady;
        globalThis.setAiReady = setAiReady;
        globalThis.aiLoading = aiLoading;
        globalThis.setAiLoading = setAiLoading;
        globalThis.aiMessages = aiMessages;
        globalThis.setAiMessages = setAiMessages;
        return () => {
            globalThis.humeStarted = null;
            globalThis.setHumeStarted = null;
            globalThis.aiReady = null;
            globalThis.setAiReady = null;
            globalThis.aiLoading = null;
            globalThis.setAiLoading = null;
            globalThis.aiMessages = null;
            globalThis.setAiMessages = null;
        }
    }, [humeStarted, aiReady, aiLoading, aiMessages])

    useEffect(() => {
        return () => {
            setHumeStarted(false);
        }
    }, [])

    useEffect(() => {
        const it = setInterval(() => {
            if (masks?.messages) {
                let tempMessages = [...masks.messages];
                setAiMessages([...tempMessages.reverse()]);
            }
        }, 200);
        return () => {
            clearInterval(it);
        }
    }, [])

    return <>
        <style>{css}</style>
        <style>{active}</style>
        {
            currentCursor !== "" && <style>{currentCursor}</style>
        }
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
        <div style={{ left: `${position.x}`, top: `${position.y}`, width: "300px" }} class="chaism-tools-container">
            <div class="dragTool" draggable={true} onDrag={e => {
                if (e.screenX !== 0 && e.screenY > 150) {
                    setPosition({ x: `${e.screenX + 0}px`, y: `${e.screenY - 110}px` })
                }
            }}>
                <span class="material-symbols-outlined">
                    more_horiz
                </span>
            </div>
            <div class="animate-container">
                <div class="mic-container">
                    <button disabled={aiLoading} onTouchStart={onDown} onMouseDown={onDown} onTouchEnd={onUp} onClick={onUp} onMouseUp={onUp} onMouseLeave={onUp} id="speech" class={`btn ${humeStarted ? "type2" : ""}`}>
                        {(humeStarted || aiLoading) && <div class="pulse-ring"></div>}
                        {!aiLoading && <span class={`material-symbols-outlined`} style={{fontSize: "30px"}}>
                            mic
                        </span>}
                        {aiLoading && <img src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/b2c0239dfc73b7f41fe4e5c39e5784348f88f0150a70d58ef4e63fdb4befe397.png" alt="AO" className="img-loader" style={{height: "30px", width: "30px"}} />}
                    </button>
                    {!humeStarted && <span class="active-status-msg">Hold to speak!</span>}
                </div>
                <div class="messages-container">
                    {
                        aiMessages.map(item => {
                            if(item.role === "user"){
                                return <MessageBox message={item.content} role={item.role} />
                            }else if(item.role === "assistant"){
                                let msg;
                                try{
                                    let content = item.content;
                                    msg = JSON.parse(content).message
                                }catch{() => {
                                    msg = "Unable to complete your request"
                                }}
                                return <MessageBox message={msg ? msg : "Unable to complete your request"} role={item.role} />
                            }else{
                                return <></>
                            }
                        })
                    }
                </div>
            </div>
        </div>
    </>
}

const MessageBox = ({message, role}) => {
    return <div class="message-container">
        <div class="arrow">
            <div class="outer"></div>
            <div class="inner" style={{borderRight: `20px solid ${role === "user" ? "var(--user-bg)" : "var(--assistant-bg)"}`}}></div>
        </div>
        <div class="message-body" style={{backgroundColor: role === "user" ? "var(--user-bg)" : "var(--assistant-bg)"}}>
            <p>{message}</p>
        </div>
    </div>
}

os.compileApp('aiAssistant', <App />);