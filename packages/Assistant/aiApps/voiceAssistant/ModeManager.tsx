import { Voice, Text, Settings } from 'aiApps.voiceAssistant.icons';

const { useEffect } = os.appHooks;

const ModeManager = ({ aiMode, setAIMode, setOpenSettings, currentAIConfig, isFullScreen, setIsFullScreen }) => {

    useEffect(() => {
        if (currentAIConfig.type === "stream") {
            setAIMode("Text")
        }
    }, [currentAIConfig])
    return <div class="header-container">
        <div className="mode-container">
            {currentAIConfig.type === "webrtc" && !isFullScreen && <button className={`mode-btn ${aiMode === "Voice" && "selected-mode"}`} onClick={() => setAIMode("Voice")}>
                <Voice style={{ width: "24px", height: "24px" }} />
            </button>}
            {!isFullScreen && <button className={`mode-btn ${aiMode === "Text" && "selected-mode"}`} onClick={() => setAIMode("Text")}>
                <Text style={{ width: "24px", height: "24px" }} />
            </button>}
        </div>
        <div style={{display: "flex", gap: "5px"}}>
        <button className={`mode-btn`} onClick={() => setIsFullScreen(prev => {
                if (prev) {
                    setAIMode("Voice");
                    return !prev
                } else {
                    setAIMode(null);
                    return !prev
                }
            })}>
                <span class="material-symbols-outlined">
                    {isFullScreen ? "fullscreen_exit" : "fullscreen"}
                </span>
            </button>
            <button className={`mode-btn`} onClick={() => setOpenSettings(true)}>
                <Settings style={{ width: "24px", height: "24px" }} />
            </button>
        </div>
    </div>
}

export default ModeManager;