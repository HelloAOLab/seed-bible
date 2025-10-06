import { Voice, Text, Settings } from 'aiApps.voiceAssistant.icons';

const {useEffect} = os.appHooks;

const ModeManager = ({ aiMode, setAIMode, setOpenSettings, currentAIConfig }) => {

    useEffect(() => {
        if(currentAIConfig.type === "stream"){
            setAIMode("Text")
        }
    }, [currentAIConfig])
    return <div class="header-container">
        <div className="mode-container">
            {currentAIConfig.type === "webrtc" && <button className={`mode-btn ${aiMode === "Voice" && "selected-mode"}`} onClick={() => setAIMode("Voice")}>
                <Voice style={{ width: "24px", height: "24px" }} />
            </button>}
            <button className={`mode-btn ${aiMode === "Text" && "selected-mode"}`} onClick={() => setAIMode("Text")}>
                <Text style={{ width: "24px", height: "24px" }} />
            </button>
        </div>
        <button className={`mode-btn`} onClick={() => setOpenSettings(true)}>
            <Settings style={{ width: "24px", height: "24px" }} />
        </button>
    </div>
}

export default ModeManager;