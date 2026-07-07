const { useEffect } = os.appHooks;

import FluidAvatarCircle from "aiApps.voiceAssistant.VoiceAvatar";
import { AOIcon2 } from "aiApps.voiceAssistant.icons";

const VoiceAI = ({
  start,
  connected,
  isAssistantSpeaking,
  setStart,
  setMicActive,
  setSpeakerActive,
  aiState,
  micActive,
}) => {
  useEffect(() => {
    setMicActive(true);
    setSpeakerActive(true);
  }, []);
  return (
    <div className="voice-container">
      <button
        className={`ai-btn`}
        onClick={() => {
          console.log(!micActive);
          setMicActive((prev) => !prev);
          setSpeakerActive((prev) => !prev);
        }}
      >
        <AOIcon2 className="AO" />
        <FluidAvatarCircle className={aiState} speaking={isAssistantSpeaking} />
      </button>
      {!start ? (
        <p>Disconnected</p>
      ) : connected ? (
        <p> Connected</p>
      ) : (
        <p> Connecting...</p>
      )}
    </div>
  );
};

export default VoiceAI;
