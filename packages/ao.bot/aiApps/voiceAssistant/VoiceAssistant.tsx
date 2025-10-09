const { useEffect, useRef, useState, render, createContext, useContext } = os.appHooks;
const MyContext = createContext();
const style = tags["App.css"]

import AudioMonitor from 'aiApps.voiceAssistant.Audio';
import ConnectionManager from 'aiApps.voiceAssistant.ConnectionManager';
import DraggableContainer from 'aiApps.voiceAssistant.DraggableContainer';
import VoiceAi from 'aiApps.voiceAssistant.VoiceAI';
import ModeManager from 'aiApps.voiceAssistant.ModeManager';
import TextAi from 'aiApps.voiceAssistant.TextAI';
import UserSettings from 'aiApps.voiceAssistant.UserSettings';
import { AOIcon2, Voice, Text, } from 'aiApps.voiceAssistant.icons';
import StreamTextAi from "aiApps.voiceAssistant.StreamTextAI";
import TextAndAvatar from "aiApps.voiceAssistant.TextAndAvatar";
import { OutputMessageLog } from 'aiApps.voiceAssistant.HandleMessageLog';

export function VoiceAssistantProvider({ children }) {
    const [connected, setConnected] = useState(false);
    const [start, setStart] = useState(true);
    const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
    const [isAssistantListening, setIsAssistantListening] = useState(false);
    const [aiMode, setAIMode] = useState("Voice");
    const [micActive, setMicActive] = useState(false);
    const [speakerActive, setSpeakerActive] = useState(false);
    const [openSettings, setOpenSettings] = useState(false);
    const [aiState, setAiState] = useState("disconnected");
    const [currentAIConfig, setCurrentAIConfig] = useState({
        Name: "GPT-Realtime",
        Description: "The realtime AI using the latest gpt-5",
        Modes: [Voice, Text],
        type: "webrtc"
    })
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [showAssistant, setShowAssistant] = useState(false);
    const [messages, setMessesages] = useState([...OutputMessageLog()]);
    const [messageHistory, setMessageHistory] = useState({});
    const [currentMessageId, setCurrentMessageId] = useState(null);

    const audioRef = useRef(null);
    const pcRef = useRef(null);
    const micRef = useRef(null);
    const dcRef = useRef(null);

    useEffect(() => {
        if (currentMessageId && messageHistory[currentMessageId]) {
            setTagMask(thisBot, 'chatMessages', { ...messageHistory[currentMessageId].chatMessages }, "tempLocal");
            setTagMask(thisBot, 'itemArray', [...messageHistory[currentMessageId].itemArray], "tempLocal");
            setMessesages([...OutputMessageLog()])
        }else if(currentMessageId && !messageHistory[currentMessageId]){
            setTagMask(thisBot, 'chatMessages', {}, "tempLocal");
            setTagMask(thisBot, 'itemArray', [], "tempLocal");
            setMessageHistory({
                ...messageHistory,
                [currentMessageId]: {
                    chatMessages: {},
                    itemArray: []
                }
            })
            setMessesages([...OutputMessageLog()])
        }
    }, [currentMessageId])

    useEffect(() => {
        if (messages && messageHistory[currentMessageId]) {
            setMessageHistory({
                ...messageHistory,
                [currentMessageId]: {
                    chatMessages: { ...masks.chatMessages },
                    itemArray: [...masks.itemArray]
                }
            })
        }
    }, [messages])

    useEffect(() => {
        globalThis.AISetStart = setStart;
        return () => {
            globalThis.AISetStart = null;
        }
    }, [])

    useEffect(() => {
        console.log(messageHistory, "messageHistory")
    }, [messageHistory])

    useEffect(() => {
        if (start) {
            if (connected) {
                if (!micActive) {
                    setAiState("muted")
                } else if (isAssistantListening) {
                    setAiState("listening");
                } else if (isAssistantSpeaking) {
                    setAiState("speaking");
                } else {
                    setAiState("connected");
                }
            } else {
                setAiState("connecting");
            }
        } else {
            setAiState("disconnected")
        }
    }, [start, connected, isAssistantListening, isAssistantSpeaking, micActive])

    useEffect(() => {
        if (currentAIConfig.type === "webrtc") {
            setStart(true)
        } else {
            setStart(false)
        }
    }, [currentAIConfig])

    return (
        <MyContext.Provider
            value={{
                connected,
                start,
                isAssistantSpeaking,
                isAssistantListening,
                aiMode,
                micActive,
                speakerActive,
                openSettings,
                aiState,
                currentAIConfig,
                isFullScreen,
                setConnected,
                setStart,
                setIsAssistantSpeaking,
                setIsAssistantListening,
                setAIMode,
                setMicActive,
                setSpeakerActive,
                setOpenSettings,
                setAiState,
                setCurrentAIConfig,
                setIsFullScreen,
                audioRef,
                pcRef,
                micRef,
                dcRef,
                showAssistant,
                setShowAssistant,
                messages,
                setMessesages,
                messageHistory,
                currentMessageId,
                setMessageHistory,
                setCurrentMessageId,
            }}
        >
            <ConnectionManager
                start={start}
                setConnected={setConnected}
                audioRef={audioRef}
                pcRef={pcRef}
                micRef={micRef}
                micActive={micActive}
                speakerActive={speakerActive}
                dcRef={dcRef}
                setIsAssistantListening={setIsAssistantListening}
            />
            <AudioMonitor
                audioRef={audioRef}
                isAssistantSpeaking={isAssistantSpeaking}
                setIsAssistantSpeaking={setIsAssistantSpeaking}
            />
            {
                children
            }
        </MyContext.Provider>
    );
}

export function useAssistantContext() {
    return useContext(MyContext);
}