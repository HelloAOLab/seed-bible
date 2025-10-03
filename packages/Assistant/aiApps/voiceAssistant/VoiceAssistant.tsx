const { useEffect, useRef, useState, render } = os.appHooks;

const style = tags["App.css"]

import AudioMonitor from 'aiApps.voiceAssistant.Audio';
import ConnectionManager from 'aiApps.voiceAssistant.ConnectionManager';
import DraggableContainer from 'aiApps.voiceAssistant.DraggableContainer';
import VoiceAi from 'aiApps.voiceAssistant.VoiceAI';
import ModeManager from 'aiApps.voiceAssistant.ModeManager';
import TextAi from 'aiApps.voiceAssistant.TextAI';
import UserSettings from 'aiApps.voiceAssistant.UserSettings';

function VoiceAssistant() {
    const [connected, setConnected] = useState(false);
    const [start, setStart] = useState(true);
    const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
    const [aiMode, setAIMode] = useState("Voice");
    const [micActive, setMicActive] = useState(false);
    const [speakerActive, setSpeakerActive] = useState(false);
    const [openSettings,setOpenSettings] = useState(false);

    const audioRef = useRef(null);
    const pcRef = useRef(null);
    const micRef = useRef(null);
    const dcRef = useRef(null);

    useEffect(() => {
        globalThis.AISetStart = setStart;
        return () => {
            globalThis.AISetStart = null;
        }
    }, [])

    return (
        <>
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=mic" />
            <style>{style}</style>
            <DraggableContainer>
                <ConnectionManager
                    start={start}
                    setConnected={setConnected}
                    audioRef={audioRef}
                    pcRef={pcRef}
                    micRef={micRef}
                    micActive={micActive}
                    speakerActive={speakerActive}
                    dcRef={dcRef}
                />
                <AudioMonitor
                    audioRef={audioRef}
                    isAssistantSpeaking={isAssistantSpeaking}
                    setIsAssistantSpeaking={setIsAssistantSpeaking}
                />

                {!openSettings && <ModeManager
                    aiMode={aiMode}
                    setAIMode={setAIMode}
                    setOpenSettings={setOpenSettings}
                />}
                {aiMode === "Voice" && !openSettings && <VoiceAi
                    start={start}
                    connected={connected}
                    isAssistantSpeaking={isAssistantSpeaking}
                    setStart={setStart}
                    setMicActive={setMicActive}
                    setSpeakerActive={setSpeakerActive}
                />}
                {
                    aiMode === "Text" && !openSettings && <TextAi
                        micActive={micActive}
                        setMicActive={setMicActive}
                        speakerActive={speakerActive}
                        setSpeakerActive={setSpeakerActive}
                        dcRef={dcRef}
                    />
                }
                {
                    openSettings && <UserSettings
                        setMicActive={setMicActive}
                        setSpeakerActive={setSpeakerActive}
                        setOpenSettings={setOpenSettings}
                    />
                }
            </DraggableContainer>
        </>
    );
}

export default VoiceAssistant;