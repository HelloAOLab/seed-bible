import { OutputMessageLog } from "aiApps.voiceAssistant.HandleMessageLog";
import { AOIcon } from "aiApps.voiceAssistant.icons";

const { useState, useEffect } = os.appHooks;

const TextAi = ({
  setMicActive,
  setSpeakerActive,
  micActive,
  dcRef,
  aiState,
}: {
  setMicActive: any;
  setSpeakerActive: any;
  micActive: any;
  dcRef: any;
  aiState: any;
  speakerActive?: boolean;
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
    setMicActive(false);
    setSpeakerActive(false);
  }, []);

  useEffect(() => {
    const messageContainer = document.getElementById("message-container");
    messageContainer.scrollTo({
      top: messageContainer.scrollHeight,
      behavior: "smooth",
    });
    console.log("scrolling");
  }, [messages]);

  return (
    <div
      className="text-container"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div id="message-container" class="message-container">
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
                <span className={`assistant-message`}>{message.message}</span>
              </div>
            );
          } else {
            return <span className={`user-message`}>{message.message}</span>;
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
      <div class="input-mic-wrapper">
        <input
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          type="text"
          placeholder="Ask AO"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          onClick={() => setMicActive((prev) => !prev)}
          class={`mic-button ${micActive ? "mic-active" : "mic-not-active"}`}
          aria-label="Mic"
        >
          <span style={{ fontSize: "20px" }} class="material-symbols-outlined">
            mic
          </span>
        </button>
      </div>
    </div>
  );
};

export default TextAi;
