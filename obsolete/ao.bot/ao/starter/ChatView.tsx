import { OutputMessageLog } from "aiApps.voiceAssistant.HandleMessageLog";
import { useAssistantContext } from "aiApps.voiceAssistant.VoiceAssistant";
import FluidAvatarCircle from "aiApps.voiceAssistant.VoiceAvatar";
import { AOIcon2 } from "aiApps.voiceAssistant.icons";

const { useState, useEffect, useRef, useMemo } = os.appHooks;

const voiceAssistant = getBot("system", "aiApps.voiceAssistant");

// Move QRCodeComponent OUTSIDE and memoize it
const QRCodeComponent = ({ url, index }) => {
  const qrRef = useRef(null);
  const expandedQrRef = useRef(null);
  const [qrGenerated, setQrGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Generate small QR code
  useEffect(() => {
    if (url && qrRef.current && !qrGenerated && window.QRCode) {
      qrRef.current.innerHTML = "";
      new window.QRCode(qrRef.current, {
        text: url,
        width: 120,
        height: 120,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel.H,
      });
      setQrGenerated(true);
    }
  }, [url, qrGenerated]);

  // Generate large QR code when expanded
  useEffect(() => {
    if (url && isExpanded && expandedQrRef.current && window.QRCode) {
      expandedQrRef.current.innerHTML = "";
      new window.QRCode(expandedQrRef.current, {
        text: url,
        width: 400,
        height: 400,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: window.QRCode.CorrectLevel.H,
      });
    }
  }, [isExpanded, url]);

  const handleOpenLink = () => {
    if (url) {
      window.open(url, "_blank");
    }
  };

  const handleCopyLink = async () => {
    try {
      // await navigator.clipboard.writeText(url);
      os.setClipboard(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getLabel = () => {
    try {
      const u = new URL(url);
      const book = u.searchParams.get("book");
      const chapter = u.searchParams.get("chapter");
      const verse = u.searchParams.get("verse");
      const translation = u.searchParams.get("translation");

      if (book && chapter) {
        return (
          `${book.toUpperCase()} ${chapter}${verse ? `:${verse}` : ""}` +
          `${translation ? ` (${translation})` : ""}`
        );
      }
      return `Passage ${index + 1}`;
    } catch {
      return `Link ${index + 1}`;
    }
  };

  const getTruncatedUrl = () => {
    if (url.length > 40) {
      return url.substring(0, 37) + "...";
    }
    return url;
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          padding: "16px",
          backgroundColor: "#2a2a2a",
          borderRadius: "12px",
          border: "1px solid #3a3a3a",
        }}
      >
        <div style={{ fontSize: "12px", fontWeight: "600", color: "#e67e50" }}>
          {getLabel()}
        </div>
        <div
          ref={qrRef}
          onClick={() => setIsExpanded(true)}
          title="Click to enlarge QR code"
          style={{
            backgroundColor: "#ffffff",
            padding: "8px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "transform 0.2s, box-shadow 0.2s",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(230, 126, 80, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
          }}
        />
        <div
          style={{
            fontSize: "10px",
            color: "#888",
            maxWidth: "200px",
            textAlign: "center",
            wordBreak: "break-all",
            marginTop: "4px",
          }}
          title={url}
        >
          {getTruncatedUrl()}
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
          <button
            onClick={handleOpenLink}
            style={{
              padding: "8px 16px",
              backgroundColor: "#e67e50",
              border: "none",
              borderRadius: "8px",
              color: "#1a1a1a",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "scale(1.05)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            Open Link
          </button>
          <button
            onClick={handleCopyLink}
            style={{
              padding: "8px 16px",
              backgroundColor: copied ? "#4ade80" : "#3a3a3a",
              border: "none",
              borderRadius: "8px",
              color: copied ? "#1a1a1a" : "#e0e0e0",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!copied) {
                e.currentTarget.style.backgroundColor = "#4a4a4a";
              }
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              if (!copied) {
                e.currentTarget.style.backgroundColor = "#3a3a3a";
              }
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {copied ? "✓ Copied!" : "Copy Link"}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div
          onClick={() => setIsExpanded(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.95)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            cursor: "pointer",
            animation: "fadeIn 0.3s ease-in-out",
          }}
        >
          <style>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }
          `}</style>
          <div
            style={{
              fontSize: "20px",
              fontWeight: "600",
              color: "#e67e50",
              marginBottom: "24px",
              animation: "slideDown 0.4s ease-out",
            }}
          >
            <style>{`
              @keyframes slideDown {
                from {
                  opacity: 0;
                  transform: translateY(-20px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
            `}</style>
            {getLabel()}
          </div>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#ffffff",
              padding: "32px",
              borderRadius: "16px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
              animation: "scaleUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            <style>{`
              @keyframes scaleUp {
                from {
                  opacity: 0;
                  transform: scale(0.5);
                }
                to {
                  opacity: 1;
                  transform: scale(1);
                }
              }
            `}</style>
            <div
              ref={expandedQrRef}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            />
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "#888",
              marginTop: "24px",
              animation: "fadeIn 0.6s ease-in-out",
            }}
          >
            Click anywhere to close
          </div>
        </div>
      )}
    </>
  );
};

// Memoize MessageContent component too
const MessageContent = ({ text, isWriting }) => {
  const urls = useMemo(() => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    return matches || [];
  }, [text]);

  return (
    <div>
      <div
        style={{
          padding: "16px",
          backgroundColor: "#2a2a2a",
          borderRadius: "12px",
          border: "1px solid #3a3a3a",
          color: "#e0e0e0",
          fontSize: "14px",
          lineHeight: "1.6",
          marginBottom: urls.length > 0 && !isWriting ? "16px" : "0",
          wordWrap: "break-word",
        }}
      >
        {text}
      </div>

      {!isWriting && urls.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginTop: "16px",
          }}
        >
          {urls.map((url, idx) => (
            <QRCodeComponent key={url} url={url} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
};

export const ChatView = ({ initialQuery, newMessageId }) => {
  const {
    setMicActive,
    setSpeakerActive,
    micActive,
    dcRef,
    aiState,
    isAssistantSpeaking,
    showAssistant,
    setShowAssistant,
    messages,
    setMessesages,
    messageHistory,
    currentMessageId,
    setMessageHistory,
    setCurrentMessageId,
  } = useAssistantContext();
  const [query, setQuery] = useState(initialQuery || "");
  const [userWriting, setUserWriting] = useState(false);
  const [assistantWriting, setAssistantWriting] = useState(false);

  const copyMessage = (text) => {
    navigator.clipboard.writeText(text).catch((err) => {
      console.error("Failed to copy:", err);
    });
  };

  const retryLastMessage = () => {
    // if (messages.length >= 2) {
    //     const lastUserMessage = [...messages].reverse().find((msg) => msg.type === "user");
    //     if (lastUserMessage) {
    //         setQuery(lastUserMessage.text);
    //         // Remove last bot response
    //         setMessages((prev) => prev.slice(0, -1));
    //         setTimeout(handleSendMessage, 100);
    //     }
    // }
  };

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
        voiceAssistant,
        "chatMessages",
        {
          ...voiceAssistant.masks.chatMessages,
          [`${uid}`]: {
            message: query,
            role: "user",
          },
        },
        "tempLocal"
      );
      setTagMask(
        voiceAssistant,
        "itemArray",
        [...voiceAssistant.masks.itemArray, uid],
        "tempLocal"
      );
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

  useEffect(async () => {
    if (initialQuery && newMessageId) {
      setCurrentMessageId(newMessageId);
      await os.sleep(100);
      handleSubmit();
    }
  }, []);

  useEffect(() => {
    if (showAssistant) {
      setMicActive(true);
      setSpeakerActive(true);
    } else {
      setMicActive(false);
      setSpeakerActive(false);
    }
  }, [showAssistant]);

  useEffect(() => {
    if (dcRef.current && dcRef.current.readyState === "open") {
      dcRef.current.send(
        JSON.stringify({
          type: "session.update",
          session: {
            instructions: `never include urls in response.`,
          },
        })
      );
    }
  }, []);

  useEffect(() => {
    const messageContainer = document.getElementById("message-container");
    messageContainer.scrollTo({
      top: messageContainer.scrollHeight,
      behavior: "smooth"
    });
    console.log("scrolling")
  }, [messages])

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <div
        className="allCont"
        style={{ height: "100%", display: "flex", gap: "10px" }}
        id="message-container"
      >
        {showAssistant && (
          <>
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
                <FluidAvatarCircle
                  className={aiState}
                  speaking={isAssistantSpeaking}
                />
              </button>
            </div>
            <div className="separaotr" />
          </>
        )}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "40px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "30px",
            height: "calc(100dvh - 150px)",
            scrollbarWidth: "none",
            width: "45dvw"
          }}
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                maxWidth: "800px",
                width: "100%",
                margin: msg.role === "user" ? "0 0 0 auto" : "0",
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
              }}
            >
              {msg.role === "assistant" && (
                <div
                  style={{
                    width: "28px", height: "28px", minWidth: "28px", backgroundColor: "#2a2a2a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px",
                  }}
                >
                  <img
                    style={{ width: "12px" }}
                    src="https://res.cloudinary.com/dfbtwwa8p/image/upload/v1760042693/AO_Lab_Logo_White_-_No_Text_sivdge.webp"
                  />
                </div>
              )}
              <div
                style={{
                  backgroundColor:
                    msg.role === "user" ? "#3a3d3d57" : "transparent",
                  padding: msg.role === "user" ? "12px 16px" : "0",
                  borderRadius: msg.role === "user" ? "12px" : "0",
                  fontSize: "14px",
                  lineHeight: 1.6,
                  color: "#e0e0e0",
                  maxWidth: "calc(100% - 40px)",
                  width: "fit-content",
                  marginLeft: msg.role === "user" ? "auto" : null,
                  marginRight: msg.role === "user" ? null : "auto",
                }}
              >
                {msg.role !== "assistant" ? <div>{msg.message}</div> : (
                  <MessageContent
                    text={msg.message}
                    isWriting={assistantWriting || userWriting}
                  />
                )}

                {msg.role === "assistant" && (
                  <div
                    style={{
                      marginTop: "12px",
                      display: "flex",
                      gap: "10px",
                    }}
                  >
                    <button
                      onClick={() => copyMessage(msg.message)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "transparent",
                        border: "1px solid #3a3a3a",
                        borderRadius: "6px",
                        color: "#999",
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "border-color 0.2s, color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#5a5a5a";
                        e.currentTarget.style.color = "#fff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#3a3a3a";
                        e.currentTarget.style.color = "#999";
                      }}
                    >
                      📋 Copy
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {assistantWriting && !userWriting && (
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  backgroundColor: "#2a2a2a",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                }}
              >
                <img
                  style={{ width: "12px" }}
                  src="https://res.cloudinary.com/dfbtwwa8p/image/upload/v1760042693/AO_Lab_Logo_White_-_No_Text_sivdge.webp"
                />
              </div>
              <div
                style={{ padding: "12px 0", fontSize: "14px", color: "#999" }}
              >
                Thinking...
              </div>
            </div>
          )}
          {aiState === "listening" && (
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
                marginLeft: "auto"
              }}
            >
              <div
                style={{ padding: "12px 0", fontSize: "14px", color: "#999" }}
              >
                Listening...
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          padding: "20px",
          backgroundColor: "#1a1a1a",
          borderTop: "1px solid #2a2a2a",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          {messages.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "10px",
                marginBottom: "15px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => setQuery("Tell me more about reading plans")}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #3a3a3a",
                  borderRadius: "20px",
                  color: "#999",
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "border-color 0.2s, color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#5a5a5a";
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#3a3a3a";
                  e.currentTarget.style.color = "#999";
                }}
              >
                Tell me more ↗
              </button>
              <button
                onClick={() => setQuery("How do I join a study group?")}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #3a3a3a",
                  borderRadius: "20px",
                  color: "#999",
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "border-color 0.2s, color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#5a5a5a";
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#3a3a3a";
                  e.currentTarget.style.color = "#999";
                }}
              >
                Study groups ↗
              </button>
              <button
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #3a3a3a",
                  borderRadius: "20px",
                  color: "#999",
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "border-color 0.2s, color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#5a5a5a";
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#3a3a3a";
                  e.currentTarget.style.color = "#999";
                }}
              >
                ···
              </button>
            </div>
          )}

          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder={
                messages.length === 0
                  ? "What is seed bible?"
                  : "Ask a follow-up..."
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              style={{
                width: "100%",
                backgroundColor: "#2a2a2a",
                border: "1px solid #3a3a3a",
                borderRadius: "12px",
                padding: "16px 120px 16px 20px",
                color: "#ffffff",
                fontSize: "15px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#4a4a4a")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#3a3a3a")}
            />
            <div
              style={{
                position: "absolute",
                right: "15px",
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                gap: "8px",
                alignItems: "center",
              }}
            >
              <button
                onClick={() => setMicActive((prev) => !prev)}
                style={{ color: micActive ? "red" : "white" }}
                style={{
                  width: "32px",
                  height: "32px",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: "0.6",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
              >
                <span
                  style={{ color: micActive ? "white" : "#1a1a1a" }}
                  class="material-symbols-outlined"
                >
                  mic
                </span>
              </button>
              <button
                onClick={() => {
                  setShowAssistant((prev) => !prev);
                }}
                style={{
                  width: "32px",
                  height: "32px",
                  backgroundColor: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: "0.6",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
              >
                <span
                  style={{ color: showAssistant ? "white" : "#1a1a1a" }}
                  class="material-symbols-outlined"
                >
                  graphic_eq
                </span>
              </button>
              <button
                onClick={handleSubmit}
                disabled={!query.trim()}
                style={{
                  width: "32px",
                  height: "32px",
                  backgroundColor: query.trim() ? "#e67e50" : "#3a3a3a",
                  border: "none",
                  borderRadius: "8px",
                  cursor: query.trim() ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "transform 0.2s",
                  opacity: query.trim() ? "1" : "0.5",
                }}
                onMouseEnter={(e) => {
                  if (query.trim())
                    e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              >
                <span style={{ fontSize: "16px", color: "#1a1a1a" }}>↑</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
