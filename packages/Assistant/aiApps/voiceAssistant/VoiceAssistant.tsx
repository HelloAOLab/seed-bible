const { useEffect, useRef, useState, render } = os.appHooks;

const style = tags["App.css"]

import AudioMonitor from 'aiApps.voiceAssistant.Audio';
import ConnectionManager from 'aiApps.voiceAssistant.ConnectionManager';
import DraggableContainer from 'aiApps.voiceAssistant.DraggableContainer';
import StatusIndicator from 'aiApps.voiceAssistant.Status';

function VoiceAssistant() {
    const [connected, setConnected] = useState(false);
    const [start, setStart] = useState(false);
    const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);

    const audioRef = useRef(null);
    const pcRef = useRef(null);
    const micRef = useRef(null);

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
                />
                <AudioMonitor
                    audioRef={audioRef}
                    isAssistantSpeaking={isAssistantSpeaking}
                    setIsAssistantSpeaking={setIsAssistantSpeaking}
                />
                <StatusIndicator
                    start={start}
                    connected={connected}
                    isAssistantSpeaking={isAssistantSpeaking}
                    setStart={setStart}
                />
            </DraggableContainer>
        </>
    );
}

export default VoiceAssistant;