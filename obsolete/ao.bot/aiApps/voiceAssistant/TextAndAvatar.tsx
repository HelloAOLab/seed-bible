import { OutputMessageLog } from "aiApps.voiceAssistant.HandleMessageLog";
import { AOIcon, AOIcon2 } from "aiApps.voiceAssistant.icons";
import FluidAvatarCircle from "aiApps.voiceAssistant.VoiceAvatar";

const { useState, useEffect } = os.appHooks;

const TextAndAvatar = ({
  setMicActive,
  dcRef,
  start,
  connected,
  isAssistantSpeaking,
  setStart,
  setSpeakerActive,
  aiState,
  micActive,
}) => {
  const [messages, setMessesages] = useState([...OutputMessageLog()]);
  const [query, setQuery] = useState("");
  const [userWriting, setUserWriting] = useState(false);
  const [assistantWriting, setAssistantWriting] = useState(false);

  const handleSubmit = () => {
    const dc = dcRef.current;
    if (dc && dc.readyState === "open") {
      dc.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: query }],
          },
        })
      );
      dc.send(JSON.stringify({ type: "response.create" }));
      let uid = uuid();
      setTagMask(
        thisBot,
        "chatMessages",
        {
          ...masks.chatMessages,
          [`${uid}`]: {
            message: query,
            role: "user",
          },
        },
        "tempLocal"
      );
      setTagMask(thisBot, "itemArray", [...masks.itemArray, uid], "tempLocal");
      setMessesages([...OutputMessageLog()]);
      setAssistantWriting(true);
      setQuery("");
    } else {
      console.warn("DataChannel not open yet, skipping:", dc);
    }
  };

  useEffect(() => {
    globalThis.SetAiTextMessages = setMessesages;
    globalThis.SetAssistantWriting = setAssistantWriting;
    globalThis.SetUserWriting = setUserWriting;
    return () => {
      globalThis.SetAiTextMessages = null;
      globalThis.SetAssistantWriting = null;
      globalThis.SetUserWriting = null;
    };
  }, [setMessesages]);

  useEffect(() => {
    const messageContainer = document.getElementById("message-container");
    messageContainer.scrollTo({
      top: messageContainer.scrollHeight,
      behavior: "smooth",
    });
    console.log("scrolling");
  }, [messages]);

  return (
    <div class="voice-text-container">
      <div class="voice-text-container-upper">
        <div
          style={{ width: "250dvw", paddingTop: "20px" }}
          className="voice-container"
        >
          <button
            className={`ai-btn`}
            onClick={() => {
              console.log(!micActive);
              setMicActive((prev) => !prev);
              setSpeakerActive((prev) => !prev);
            }}
          >
            <AOIcon2
              className="AO"
              style={{ width: "45dvh", height: "45dvh" }}
            />
            <FluidAvatarCircle
              className={`${aiState} big-avatar`}
              speaking={isAssistantSpeaking}
            />
          </button>
        </div>
        <div class="separator"></div>
        <div
          className="text-container"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            style={{
              height: "calc(100dvh - 125px)",
              padding: "10px",
              background: "#e7e7e7",
              margin: "15px 0px",
              borderRadius: "10px",
            }}
            id="message-container"
            class="message-container"
          >
            {messages.map((message) => {
              if (message.role === "assistant") {
                return (
                  <div style={{ display: "flex", width: "100%" }}>
                    <AOIcon
                      style={{
                        height: "10px",
                        width: "10px",
                        margin: "0px 5px",
                        marginTop: "3.5px",
                      }}
                    />
                    <span className={`assistant-message`}>
                      {message.message}
                    </span>
                  </div>
                );
              } else {
                return (
                  <span className={`user-message`}>{message.message}</span>
                );
              }
            })}
            {!userWriting && assistantWriting && (
              <div style={{ display: "flex", width: "100%" }}>
                <AOIcon
                  style={{
                    height: "10px",
                    width: "10px",
                    margin: "0px 5px",
                    marginTop: "3.5px",
                  }}
                />
                <span className={`assistant-message thinking`}>
                  Thinking.<span></span>
                </span>
              </div>
            )}
            {(userWriting || aiState === "listening") && (
              <div style={{ display: "flex", width: "100%" }}>
                <span className={`user-message thinking`}>
                  {aiState === "listening" ? "Listening." : "..."}
                  <span></span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div
        style={{ width: "95%", margin: "0px auto" }}
        class="input-mic-wrapper"
      >
        <input
          onClick={(e) => {
            console.log(e);
            e.target.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          type="text"
          placeholder="Ask AO"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ height: "90%", fontSize: "18px" }}
        />
        <button
          style={{
            width: "35px",
            height: "35px",
            display: "flex",
            justifyContent: "center",
            fontSize: "28px !important",
            borderRadius: "5px",
          }}
          onClick={() => {
            handleSubmit();
          }}
          class={`mic-button`}
          aria-label="Mic"
        >
          <span style={{ fontSize: "20px" }} class="material-symbols-outlined">
            arrow_upward
          </span>
        </button>
      </div>
    </div>
  );
};

export default TextAndAvatar;
