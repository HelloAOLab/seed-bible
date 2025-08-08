await os.unregisterApp('aiPromt');
await os.registerApp('aiPromt', thisBot);
const css = thisBot.tags["App.css"];
const {useState, useEffect, useMemo, useCallback, useRef} = os.appHooks;
let aiChat = getBot('system', 'ext_canvas.aiChat');

const App = () => {
    const [position, setPosition] = useState({x: "calc(100vw - 270px)", y: "20px"});
    const [mode, setMode] = useState("Message");
    const [positivePromt, setPositivePromt] = useState("");
    const [negativePromt, setNegativePromt] = useState("");
    const [gptVersion, setGptVersion] = useState("gpt-4");
    const [promtInitiated, setPromtInitiated] = useState(false);

    const toggleMode = useCallback(() => {
        if(mode === "Message"){
            setMode("Image");
        }else{
            setMode("Message");
        }
    }, [mode]);

    const toggleVersion = useCallback(() => {
        if(gptVersion === "gpt-4"){
            setGptVersion("gpt-3.5-turbo");
        }else{
            setGptVersion("gpt-4");
        }
    }, [gptVersion]);

    useEffect(() => {
        let it = setInterval(() => {
            let aiSetting = getBot(byTag("aiSetting"));
            setTagMask(aiSetting, "formAddress", "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/a4a176e8fe212617e1802bdc1e90b32813d172a3dd10d87fa98de1bcf2dc7e93.png", "tempLocal");
            setTagMask(aiSetting, "onClick", `@ os.unregisterApp('aiPromt')`, "tempLocal");
        }, 50)
        return () => {
            clearInterval(it);
            let aiSetting = getBot(byTag("aiSetting"));
            aiSetting.masks.formAddress = null;
            aiSetting.masks.onClick = null;
        }
    }, []);

    useEffect(() => {
        if(promtInitiated){
            setTagMask(aiChat, "positivePromt", positivePromt, "local");
            setTagMask(aiChat, "negativePromt", negativePromt, "local");
            setTagMask(aiChat, "gptVersion", gptVersion, "local");
        }else{
            setPromtInitiated(true);
            if(aiChat.masks?.positivePromt){
                setPositivePromt(aiChat.masks.positivePromt)
            }
            if(aiChat.masks?.negativePromt){
                setNegativePromt(aiChat.masks.negativePromt)
            }
            if(aiChat.masks?.gptVersion){
                setGptVersion(aiChat.masks.gptVersion.value)
            }
        }
    }, [positivePromt, negativePromt, gptVersion, promtInitiated]);

    useEffect(() => {
        globalThis.promtInitiated = promtInitiated;
        globalThis.setPromtInitiated = setPromtInitiated;
        return () => {
            globalThis.promtInitiated = null;
            globalThis.setPromtInitiated = null;
        }
    }, [promtInitiated])
    
    return <>
        <style>{css}</style>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
        <div style={{left: `${position.x}`, top: `${position.y}`}} class="chaism-tools-container">
            <div class="dragTool" draggable={true} onDrag={e => {
                if(e.screenX !== 0 && e.screenY > 150){
                    setPosition({x: `${e.screenX + 150}px`, y: `${e.screenY - 110}px`})
                }
            }}>
                <span class="material-symbols-outlined">
                    more_horiz
                </span>
            </div>
            <div class="promt-container">
                <div class="promt-item">
                    <div class="promt-item-hor">
                        <span class="promt-item-title">Mode - {mode}</span>
                        <button onClick={toggleMode} class="nav-btn publish-btn">
                            <span class="material-symbols-outlined" style={{fontSize: "20px"}}>
                                autorenew
                            </span>
                        </button>
                    </div>
                </div>
                <div class="promt-item">
                    <span class="promt-item-title">Positive</span>
                    <textarea onChange={e => setPositivePromt(e.target.value)} type="text" class="promt-item-textarea" placeholder="Positive Promt">{positivePromt}</textarea>
                </div>
                {mode === "Image" && <div class="promt-item">
                    <span class="promt-item-title">Negative</span>
                    <textarea onChange={e => setNegativePromt(e.target.value)} type="text" class="promt-item-textarea" placeholder="Negative Promt">{negativePromt}</textarea>
                </div>}
                <div class="promt-item">
                    <div class="promt-item-hor">
                        <span class="promt-item-title">Version - {gptVersion}</span>
                        <button onClick={toggleVersion} class="nav-btn publish-btn">
                            <span class="material-symbols-outlined" style={{fontSize: "20px"}}>
                                autorenew
                            </span>
                        </button>
                    </div>
                </div>
                <div class="promt-item">
                    <button class="default-btn" onClick={() => {
                        os.unregisterApp('aiPromt');
                    }}>Close</button>
                </div>
            </div>
        </div>
    </>
}
os.compileApp('aiPromt',<App />);