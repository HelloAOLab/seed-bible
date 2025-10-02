import { OutputMessageLog } from 'aiApps.voiceAssistant.HandleMessageLog';

const { useState, useEffect } = os.appHooks;

const TextAi = ({ setMicActive, setSpeakerActive, micActive, dcRef }) => {
    const [messages, setMessesages] = useState([...OutputMessageLog()]);
    const [query, setQuery] = useState("");

    const handleSubmit = () => {
        const dc = dcRef.current;
        if (dc && dc.readyState === "open") {
            dc.send(
                JSON.stringify({
                    type: "conversation.item.create",
                    item: {
                        type: "message",
                        role: "user",
                        content: [{ type: "input_text", text: query }]
                    }
                })
            );
            dc.send(
                JSON.stringify({ type: "response.create" })
            );
            setQuery("")
        } else {
            console.warn("DataChannel not open yet, skipping:", dc);
        }
    }

    useEffect(() => {
        globalThis.SetAiTextMessages = setMessesages;
        return () => {
            globalThis.SetAiTextMessages = null;
        }
    }, [setMessesages])

    useEffect(() => {
        setMicActive(false);
        setSpeakerActive(false);
    }, [])

    useEffect(() => {
        const messageContainer = document.getElementById("message-container");
        messageContainer.scrollTo({
            top: messageContainer.scrollHeight,
            behavior: "smooth"
        });
        console.log("scrolling")
    }, [messages])

    return <div className="text-container" onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
        <div id="message-container" class="message-container">
            {
                messages.map(message => {
                    return <span className={`${message.role === "user" ? "user-message" : "assistant-message"}`}>{message.message}</span>
                })
            }
        </div>
        <div class="input-mic-wrapper">
            <input
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                type="text"
                placeholder="Ask AO"
                value={query}
                onChange={e => setQuery(e.target.value)}
            />
            <button onClick={() => setMicActive(prev => !prev)} class={`mic-button ${micActive ? "mic-active" : "mic-not-active"}`} aria-label="Mic">
                <span style={{ fontSize: "20px" }} class="material-symbols-outlined">
                    mic
                </span>
            </button>
        </div>
    </div>
}

export default TextAi;