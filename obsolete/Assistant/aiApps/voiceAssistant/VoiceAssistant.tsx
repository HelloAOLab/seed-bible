const { useEffect, useRef, useState, render } = os.appHooks;

const style = tags["App.css"];

import AudioMonitor from "aiApps.voiceAssistant.Audio";
import ConnectionManager from "aiApps.voiceAssistant.ConnectionManager";
import DraggableContainer from "aiApps.voiceAssistant.DraggableContainer";
import VoiceAi from "aiApps.voiceAssistant.VoiceAI";
import ModeManager from "aiApps.voiceAssistant.ModeManager";
import TextAi from "aiApps.voiceAssistant.TextAI";
import UserSettings from "aiApps.voiceAssistant.UserSettings";
import { AOIcon2, Voice, Text } from "aiApps.voiceAssistant.icons";
import StreamTextAi from "aiApps.voiceAssistant.StreamTextAI";
import TextAndAvatar from "aiApps.voiceAssistant.TextAndAvatar";

function VoiceAssistant() {
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
    type: "webrtc",
  });
  const [isFullScreen, setIsFullScreen] = useState(false);

  const audioRef = useRef(null);
  const pcRef = useRef(null);
  const micRef = useRef(null);
  const dcRef = useRef(null);

  useEffect(() => {
    globalThis.AISetStart = setStart;
    return () => {
      globalThis.AISetStart = null;
    };
  }, []);

  useEffect(() => {
    if (start) {
      if (connected) {
        if (!micActive) {
          setAiState("muted");
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
      setAiState("disconnected");
    }
  }, [start, connected, isAssistantListening, isAssistantSpeaking, micActive]);

  useEffect(() => {
    if (currentAIConfig.type === "webrtc") {
      setStart(true);
    } else {
      setStart(false);
    }
  }, [currentAIConfig]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=mic"
      />
      <style>{style}</style>
      <DraggableContainer isFullScreen={isFullScreen}>
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

        {!openSettings && (
          <ModeManager
            aiMode={aiMode}
            setAIMode={setAIMode}
            setOpenSettings={setOpenSettings}
            currentAIConfig={currentAIConfig}
            isFullScreen={isFullScreen}
            setIsFullScreen={setIsFullScreen}
          />
        )}
        {aiMode === "Voice" &&
          !openSettings &&
          currentAIConfig.type === "webrtc" && (
            <VoiceAi
              start={start}
              connected={connected}
              isAssistantSpeaking={isAssistantSpeaking}
              setStart={setStart}
              setMicActive={setMicActive}
              setSpeakerActive={setSpeakerActive}
              aiState={aiState}
              micActive={micActive}
            />
          )}
        {aiMode === "Text" &&
          !openSettings &&
          currentAIConfig.type === "webrtc" && (
            <TextAi
              micActive={micActive}
              setMicActive={setMicActive}
              speakerActive={speakerActive}
              setSpeakerActive={setSpeakerActive}
              dcRef={dcRef}
              aiState={aiState}
            />
          )}
        {isFullScreen && (
          <TextAndAvatar
            setMicActive={setMicActive}
            dcRef={dcRef}
            start={start}
            connected={connected}
            isAssistantSpeaking={isAssistantSpeaking}
            setStart={setStart}
            setSpeakerActive={setSpeakerActive}
            aiState={aiState}
            micActive={micActive}
          />
        )}
        {openSettings && (
          <UserSettings
            setMicActive={setMicActive}
            setSpeakerActive={setSpeakerActive}
            setOpenSettings={setOpenSettings}
            setCurrentAIConfig={setCurrentAIConfig}
            currentAIConfig={currentAIConfig}
          />
        )}
        {currentAIConfig.type === "stream" && !openSettings && (
          <StreamTextAi aiConfig={currentAIConfig} />
        )}
      </DraggableContainer>
    </>
  );
}

export default VoiceAssistant;
