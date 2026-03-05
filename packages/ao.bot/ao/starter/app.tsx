/* global os, ai, tags */

// AO Seed Bible Chat UI (single-file React component)
// Notes:
// - Relies on `os.appHooks` for React hooks in the AO runtime.
// - Uses `ai.chat` if available.
// - Dynamically loads qrcodejs if not already present.

const { useState, useEffect, useRef } = os.appHooks;
import {
  VoiceAssistantProvider,
  useAssistantContext,
} from "aiApps.voiceAssistant.VoiceAssistant";
import { ChatView } from "ao.starter.ChatView";
const style = tags["App.css"];

// QR Code Component
function QRCodeComponent({ url, index }) {
  const qrRef = useRef(null);
  const [qrGenerated, setQrGenerated] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // (Re)generate once QRCode library is available
    if (qrRef.current && !qrGenerated && window.QRCode) {
      // Clear any existing QR code
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

  const handleOpenLink = () => {
    os.openURL(url);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Extract readable label from URL
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

  // Truncate URL for display
  const getTruncatedUrl = () => {
    if (url.length > 40) {
      return url.substring(0, 37) + "...";
    }
    return url;
  };

  return (
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
        style={{
          backgroundColor: "#ffffff",
          padding: "8px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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
  );
}

export function AOBotInterface() {
  const assistantContext = useAssistantContext();

  if (!assistantContext) {
    return null;
  }
  const {
    setMicActive,
    setSpeakerActive,
    messageHistory,
    currentMessageId,
    setMessageHistory,
    setCurrentMessageId,
    dcRef,
  } = assistantContext;
  const [currentView, setCurrentView] = useState("home");
  const [inputValue, setInputValue] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [messages, setMessages] = useState<{ type: string; text: string }[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);

  // Build with Seed Bible form state
  const [translationID, setTranslationID] = useState("NASB95");
  const [book, setBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [enableCollaboration, setEnableCollaboration] = useState(false);
  useEffect(() => {
    console.log(messages);
  }, [messages]);
  // Chat history management
  const [chatHistory, setChatHistory] = useState<
    {
      id: string;
      title: string;
      messages: { type: string; text: string }[];
      timestamp: number;
    }[]
  >([]);
  const [currentChatId, setCurrentChatId] = useState<null | string>(null);

  const messagesEndRef = useRef(null);

  // Dynamically load QRCode library once (if not present)
  useEffect(() => {
    if (!window.QRCode) {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Load chat history from state on mount (noop placeholder for persistence hook)
  useEffect(() => {
    const savedHistory = chatHistory;
    if (savedHistory.length > 0 && !currentChatId) {
      // Auto-load the most recent chat
      const mostRecent = savedHistory[0];
      setCurrentChatId(mostRecent.id);
      setMessages(mostRecent.messages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save current chat to history when messages change
  useEffect(() => {
    if (messages.length > 0 && currentChatId) {
      const chatIndex = chatHistory.findIndex(
        (chat) => chat.id === currentChatId
      );
      const chatTitle = messages[0]?.text?.slice(0, 50) || "New Chat";
      const updatedChat = {
        id: currentChatId,
        title: chatTitle,
        messages: messages,
        timestamp: Date.now(),
      };

      if (chatIndex >= 0) {
        const newHistory = [...chatHistory];
        newHistory[chatIndex] = updatedChat;
        setChatHistory(newHistory);
      } else {
        setChatHistory([updatedChat, ...chatHistory]);
      }
    }
  }, [messages, currentChatId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue;
    setMessages((prev) => [...prev, { type: "user", text: userMessage }]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Build conversation history for AI context
      const conversationHistory = messages.map((msg) => ({
        role: msg.type === "user" ? "user" : "assistant",
        content: msg.text,
      }));

      // Add current message
      conversationHistory.push({ role: "user", content: userMessage });

      // Check if ai.chat is available
      if (typeof ai !== "undefined" && ai.chat) {
        let response = await ai.chat(
          [
            {
              role: "system",
              type: "json_object",
              content: `
                            # Seed Bible / AO Assistant – System Prompt

                            **Role:** You are an AI assistant for the Seed Bible and AO (Alpha Omega) platform. Use only information from **https://www.helloao.org/** to answer questions about the Seed Bible, Bible study resources, and spiritual growth tools.

                            **Primary behaviors**
                            1. Be helpful, concise, and encouraging.
                            2. When users ask to open the Bible (or a specific translation, book, chapter, or verse), return the correct **AO** launch link using these patterns:
                            - Launch Seed Bible: "https://ao.bot/?pattern=SeedBibleDev&noGridPortal=true"
                            - Specific translation: "https://ao.bot/?pattern=SeedBibleDev&noGridPortal=true&translation=[TRANSLATION]"
                            - Specific book: "https://ao.bot/?pattern=SeedBibleDev&noGridPortal=true&book=[BOOK_ID]"
                            - Specific book & chapter: "https://ao.bot/?pattern=SeedBibleDev&noGridPortal=true&book=[BOOK_ID]&chapter=[CHAPTER]"
                            - Specific verse: "https://ao.bot/?pattern=SeedBibleDev&noGridPortal=true&book=[BOOK_ID]&chapter=[CHAPTER]&verse=[VERSE]"

                            **Translations**
                            - Accept: "KJV", "NIV", "ESV", "NKJV", "NLT" (and others if explicitly provided by the user). If no translation is specified, do **not** add a translation param.

                            **Books**
                            - Use **book IDs** instead of full names (e.g., Genesis → "gen", John → "jhn", Psalms → "psa").
                            - here u can find all the ids ${tags.books} this is array of objects include the data 

                            **Output format (always)**
                            - Respond **only** with a JSON object (no additional text).
                            json
                            {
                            "content": "Natural language response here.",
                            "links": ["Full URL(s) if applicable, else empty array []"]
                            }

                            - "content": Plain, user-facing answer/guidance.
                            - "links": An array of AO URLs when the user asks to open/launch specific content; otherwise an empty array.
                            - Never include markdown, code fences (except the above example), or extra keys.

                            **Intent handling**
                            - If the user asks to **open**:
                            - Bible (no specifics) → use **Launch Seed Bible** link.
                            - Translation only → add "translation=[TRANSLATION]".
                            - Book only → add "book=[BOOK_ID]".
                            - Book + chapter → add "book=[BOOK_ID]" and "chapter=[CHAPTER]".
                            - Book + chapter + verse → add "book=[BOOK_ID]", "chapter=[CHAPTER]", and "verse=[VERSE]".
                            - Multiple passages → include multiple links in the "links" array.
                            - If the user gives an unsupported translation, gently note available ones and omit the param unless they choose one.
                            - If chapter/verse look invalid or missing, ask a brief follow-up **inside "content"** and set "links": [].

                            **Tone & safety**
                            - Be warm and encouraging (e.g., "Happy to help you get started in John 3!").
                            - Don't speculate about theology beyond what's on helloao.org.
                            - If you don't know, say so briefly and suggest exploring helloao.org.

                            **Examples**

                            1) Open the Seed Bible
                            json
                            {
                            "content": "Opening the Seed Bible for you.",
                            "links": ["https://ao.bot/?pattern=SeedBibleDev&noGridPortal=true"]
                            }

                            2) Open NIV
                            json
                            {
                            "content": "Launching the Seed Bible in the NIV translation.",
                            "links": ["https://ao.bot/?pattern=SeedBibleDev&noGridPortal=true&translation=NIV"]
                            }

                            3) Open John 3
                            json
                            {
                            "content": "Here's John 3 in the Seed Bible.",
                            "links": ["https://ao.bot/?pattern=SeedBibleDev&noGridPortal=true&book=jhn&chapter=3"]
                            }

                            4) Open John 3:16
                            json
                            {
                            "content": "Here's John 3:16 in the Seed Bible.",
                            "links": ["https://ao.bot/?pattern=SeedBibleDev&noGridPortal=true&book=jhn&chapter=3&verse=16"]
                            }

                            5) Open Genesis
                            json
                            {
                            "content": "Here's the book of Genesis in the Seed Bible.",
                            "links": ["https://ao.bot/?pattern=SeedBibleDev&noGridPortal=true&book=gen"]
                            }

                            6) Unsupported translation ("MSG")
                            json
                            {
                            "content": "I can open the Seed Bible. Available translations include KJV, NIV, ESV, NKJV, and NLT. Which would you like?",
                            "links": []
                            }

                            7) Ambiguous request ("open psalm 119 verse")
                            json
                            {
                            "content": "Do you mean Psalm 119:105 or another verse in Psalm 119?",
                            "links": []
                            }

                            8) General info (no link)
                            json
                            {
                            "content": "You can explore Seed Bible study plans and spiritual growth tools on helloao.org. Would you like a reading plan suggestion?",
                            "links": []
                            }

                            9) Multiple passages ("Open John 3:16 and Genesis 1:1")
                            json
                            {
                            "content": "Here are the passages you requested.",
                            "links": [
                            "https://ao.bot/?pattern=SeedBibleDev&noGridPortal=true&book=jhn&chapter=3&verse=16",
                            "https://ao.bot/?pattern=SeedBibleDev&noGridPortal=true&book=gen&chapter=1&verse=1"
                            ]
                            }

                            no additional just the json ouput is a must !!!! do not change that under any resons !
                            example {
                                "content":"",
                                "links":[] or null,
                            }
                            after u finish make sure the ouput is a valid json that i can use JS code JSON.parse() on it thats too impotnat 
                                        `,
            },
            ...conversationHistory,
          ],
          {
            preferredModel: "gpt-4o",
          }
        );
        console.log(response);
        if (response.content.includes("```json")) {
          response = response.content.replaceAll("```", "").replace("json", "");
        }
        response = JSON.parse(response.content);
        console.log(response);
        if (response?.links && response?.links.length === 1) {
          os.openURL(response.links[0]);
        }
        let botText =
          response.content ||
          "I'm here to help you with information about the Seed Bible and Bible study resources.";

        // Replace URLs with HTML anchors labeled by book/chapter/verse when possible
        const urlRegex = /(https?:\/\/[^\s]+)/g;

        // Helper to build a nice label for Seed Bible links
        const labelForSeedBibleDevURL = (raw: any) => {
          try {
            const u = new URL(raw);
            if (!/.?ao\.bot$/i.test(u.hostname)) return null;

            const pattern = u.searchParams.get("pattern");
            if (!pattern || pattern.toLowerCase() !== "seedbibledev")
              return null;

            const book = u.searchParams.get("book");
            const chapter = u.searchParams.get("chapter");
            const verse = u.searchParams.get("verse");
            const translation = u.searchParams.get("translation");

            const clean = (s: any) => (s || "").replace(/\s+/g, " ").trim();

            const bookLabel = clean(book);
            const chapLabel = clean(chapter);
            const verseLabel = clean(verse);
            const trLabel = clean(translation);

            let main = "Seed Bible";
            if (bookLabel && chapLabel) {
              main = `${bookLabel} ${chapLabel}${
                verseLabel ? `:${verseLabel}` : ""
              }`;
            } else if (trLabel && !bookLabel) {
              main = `Seed Bible — ${trLabel}`;
            }

            const suffix =
              trLabel && (bookLabel || verseLabel || chapLabel)
                ? ` (${trLabel})`
                : "";
            return `${main}${suffix}`;
          } catch {
            return null;
          }
        };

        let foundLink = false;
        const htmlText = botText.replace(urlRegex, (url: any) => {
          foundLink = true;
          const label = labelForSeedBibleDevURL(url) || "Open link";
          return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
        });

        setMessages((prev) => [
          ...prev,
          // foundLink
          // ? { type: "bot", text: htmlText, subtype: "html", links: response.links || [] }
          // /:
          { type: "bot", text: botText, links: response.links },
        ]);
      } else {
        // Enhanced fallback responses with context awareness
        let botResponse = "";
        const lowerMessage = userMessage.toLowerCase();

        if (
          lowerMessage.includes("seed bible") ||
          lowerMessage.includes("what is")
        ) {
          botResponse =
            "The Seed Bible is a comprehensive Bible study platform designed to help you grow in your faith. It offers:\n\n• Multiple Bible translations\n• Study notes and commentaries\n• Reading plans and devotionals\n• Collaborative study sessions\n• Cross-references and concordances\n\nThe platform is built to make Bible study more accessible and engaging for everyone, from beginners to advanced students of Scripture.";
        } else if (
          lowerMessage.includes("use") ||
          lowerMessage.includes("how")
        ) {
          botResponse =
            "You can use the Seed Bible in several ways:\n\n1. **Personal Study**: Launch the Seed Bible to read and study on your own\n2. **Group Sessions**: Join or create collaborative study sessions with others\n3. **Reading Plans**: Follow structured plans to read through the Bible\n4. **Search & Explore**: Use powerful search tools to find passages and topics\n5. **Audio Bible**: Listen to Scripture while on the go\n\nSimply click 'Launch Seed Bible' from the home screen to get started!";
        } else if (
          lowerMessage.includes("feature") ||
          lowerMessage.includes("reader")
        ) {
          botResponse =
            "The Seed Bible offers rich features for readers:\n\n**Reading Tools:**\n• Multiple translations (KJV, NIV, ESV, and more)\n• Adjustable fonts and themes\n• Night mode for comfortable reading\n• Bookmarks and highlights\n\n**Study Tools:**\n• Verse-by-verse commentaries\n• Cross-references\n• Original language tools\n• Study notes and insights\n\n**Listening:**\n• Audio Bible in multiple voices\n• Background play support\n• Speed controls\n\nWould you like to know more about any specific feature?";
        } else if (
          lowerMessage.includes("session") ||
          lowerMessage.includes("group")
        ) {
          botResponse =
            "Collaborative sessions are a powerful feature of the Seed Bible! Here's how they work:\n\n• **Join Sessions**: Enter a session code to join a group study\n• **Real-time Sync**: Follow along as everyone reads the same passages\n• **Share Insights**: Exchange interpretations and reflections\n• **Group Chat**: Discuss verses and ask questions together\n• **Study Together**: Great for Bible study groups, classes, or friends\n\nClick 'Join Session' from the home screen to get started, or ask your group leader for a session code!";
        } else if (
          lowerMessage.includes("plan") ||
          lowerMessage.includes("reading plan")
        ) {
          botResponse =
            "The Seed Bible offers various reading plans:\n\n• **Bible in a Year**: Complete the entire Bible in 365 days\n• **Chronological**: Read the Bible in historical order\n• **Topical Plans**: Focus on specific themes (prayer, faith, love, etc.)\n• **New Testament in 30 Days**: Quick overview of the NT\n• **Custom Plans**: Create your own reading schedule\n\nEach plan includes daily reminders and tracks your progress. Would you like to start a reading plan?";
        } else if (
          lowerMessage.includes("hello") ||
          lowerMessage.includes("hi")
        ) {
          botResponse =
            "Hello! Welcome to the Seed Bible AI assistant. I'm here to help you with:\n\n• Information about the Seed Bible\n• How to use the platform\n• Bible study resources\n• Reading plans and features\n• Joining collaborative sessions\n\nWhat would you like to know?";
        } else if (lowerMessage.includes("thank")) {
          botResponse =
            "You're very welcome! I'm glad I could help. Feel free to ask if you have any more questions about the Seed Bible or Bible study resources. May your study of Scripture be enriching and transformative!";
        } else {
          botResponse =
            "I'm here to help you with information about the Seed Bible and Bible study resources. I can answer questions about:\n\n• What the Seed Bible is\n• How to use the platform\n• Available features and tools\n• Reading plans and study guides\n• Collaborative sessions\n• Bible translations and resources\n\nWhat would you like to know?";
        }

        setMessages((prev) => [...prev, { type: "bot", text: botResponse }]);
      }
    } catch (error) {
      console.error("AI chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          text: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: any) => {
    setInputValue(question);
    if (currentView !== "chat") {
      setCurrentView("chat");
    }
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  const startNewChat = () => {
    const newChatId = `chat-${Date.now()}`;
    setCurrentChatId(newChatId);
    setMessages([]);
    setCurrentView("build");
    setEnableCollaboration(true);
  };

  const loadChat = (chatId: any) => {
    const chat = chatHistory.find((c) => c.id === chatId);
    if (chat) {
      setCurrentChatId(chat.id);
      setMessages(chat.messages);
      setCurrentView("chat");
    }
  };

  const deleteChat = (chatId: any, e: any) => {
    e.stopPropagation();
    const newHistory = chatHistory.filter((chat) => chat.id !== chatId);
    setChatHistory(newHistory);
    if (currentChatId === chatId) {
      startNewChat();
    }
  };

  const copyMessage = (text: any) => {
    navigator.clipboard.writeText(text).catch((err) => {
      console.error("Failed to copy:", err);
    });
  };

  const retryLastMessage = () => {
    if (messages.length >= 2) {
      const lastUserMessage = [...messages]
        .reverse()
        .find((msg) => msg.type === "user");
      if (lastUserMessage) {
        setInputValue(lastUserMessage.text);
        // Remove last bot response
        setMessages((prev) => prev.slice(0, -1));
        setTimeout(handleSendMessage, 100);
      }
    }
  };

  const handleJoinSession = () => {
    if (sessionCode.trim().length >= 6) {
      const newChatId = `session-${Date.now()}`;
      setCurrentChatId(newChatId);
      setCurrentView("chat");
      setMessages([
        {
          type: "bot",
          text: `Successfully joined session: ${sessionCode}\n\nYou are now connected to a collaborative Bible study session. You can start asking questions or sharing insights!`,
        },
      ]);
      setSessionCode("");
    }
  };

  useEffect(() => {
    // if (currentView === "chat") {
    //     setMicActive(true);
    //     setSpeakerActive(true);
    // } else {
    //     setMicActive(false);
    //     setSpeakerActive(false);
    // }
  }, [currentView]);

  // Views
  if (currentView === "join") {
    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100vw",
          backgroundColor: "#1a1a1a",
          color: "#ffffff",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          position: "relative",
        }}
      >
        <style>{style}</style>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
        <button
          onClick={() => setCurrentView("home")}
          style={{
            position: "absolute",
            top: "30px",
            left: "30px",
            backgroundColor: "transparent",
            border: "none",
            color: "#999",
            fontSize: "24px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#999")}
        >
          <span class="material-symbols-outlined" style={{ fontSize: "18px" }}>
            arrow_back
          </span>
          <span style={{ fontSize: "14px" }}>Back</span>
        </button>

        <div style={{ marginBottom: "40px", textAlign: "center" }}>
          <div
            style={{
              width: "100px",
              height: "60px",
              margin: "15px auto",
              position: "relative",
            }}
          >
            <img
              style={{ width: 100 }}
              src="https://res.cloudinary.com/dfbtwwa8p/image/upload/v1760042693/AO_Lab_Logo_White_-_No_Text_sivdge.webp"
              alt="AO Logo"
            />
          </div>
        </div>

        <div
          style={{
            width: "500px",
            maxWidth: "90%",
            backgroundColor: "#232323",
            border: "1px solid #2a2a2a",
            borderRadius: "16px",
            padding: "40px",
            textAlign: "center",
            margin: "10px auto",
          }}
        >
          <h2
            style={{
              fontSize: "24px",
              fontWeight: "600",
              marginBottom: "12px",
              color: "#ffffff",
            }}
          >
            Join Session
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "#999",
              marginBottom: "32px",
              lineHeight: 1.6,
            }}
          >
            Enter the session code shared by your group leader to join a
            collaborative Bible study session.
          </p>

          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                textAlign: "left",
                fontSize: "13px",
                color: "#ccc",
                marginBottom: "8px",
                fontWeight: "500",
              }}
            >
              Session Code
            </label>
            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
              maxLength={10}
              style={{
                width: "100%",
                backgroundColor: "#2a2a2a",
                border: "1px solid #3a3a3a",
                borderRadius: "10px",
                padding: "16px 20px",
                color: "#ffffff",
                fontSize: "16px",
                letterSpacing: "2px",
                textAlign: "center",
                outline: "none",
                transition: "border-color 0.2s",
                fontWeight: "600",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#4a4a4a")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#3a3a3a")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && sessionCode.trim().length >= 6)
                  handleJoinSession();
              }}
            />
          </div>

          <button
            onClick={handleJoinSession}
            disabled={sessionCode.trim().length < 6}
            style={{
              width: "100%",
              padding: "16px",
              backgroundColor:
                sessionCode.trim().length >= 6 ? "#e67e50" : "#3a3a3a",
              border: "none",
              borderRadius: "10px",
              color: sessionCode.trim().length >= 6 ? "#1a1a1a" : "#666",
              fontSize: "15px",
              fontWeight: "600",
              cursor:
                sessionCode.trim().length >= 6 ? "pointer" : "not-allowed",
              transition: "transform 0.2s, background-color 0.2s",
              marginBottom: "24px",
            }}
            onMouseEnter={(e) => {
              if (sessionCode.trim().length >= 6) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.backgroundColor = "#f08a5d";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              if (sessionCode.trim().length >= 6)
                e.currentTarget.style.backgroundColor = "#e67e50";
            }}
          >
            Join Session
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{ flex: 1, height: "1px", backgroundColor: "#3a3a3a" }}
            ></div>
            <span style={{ fontSize: "12px", color: "#666" }}>OR</span>
            <div
              style={{ flex: 1, height: "1px", backgroundColor: "#3a3a3a" }}
            ></div>
          </div>

          <button
            onClick={startNewChat}
            style={{
              width: "100%",
              padding: "16px",
              backgroundColor: "transparent",
              border: "1px solid #3a3a3a",
              borderRadius: "10px",
              color: "#ccc",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#5a5a5a";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#3a3a3a";
              e.currentTarget.style.color = "#ccc";
            }}
          >
            Create New Session
          </button>
        </div>

        <div
          style={{ marginTop: "40px", maxWidth: "500px", textAlign: "center" }}
        >
          <h3
            style={{
              fontSize: "16px",
              fontWeight: "600",
              marginBottom: "16px",
              color: "#fff",
            }}
          >
            Benefits of Session Mode
          </h3>
          <div
            style={{
              display: "flex",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "16px",
              fontSize: "13px",
              color: "#999",
            }}
          >
            <div
              style={{
                padding: "16px",
                backgroundColor: "#232323",
                borderRadius: "8px",
                border: "1px solid #2a2a2a",
              }}
            >
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>👥</div>
              <div
                style={{
                  fontWeight: "500",
                  color: "#ccc",
                  marginBottom: "4px",
                }}
              >
                Collaborate
              </div>
              <div style={{ fontSize: "12px" }}>
                Study together in real-time
              </div>
            </div>
            <div
              style={{
                padding: "16px",
                backgroundColor: "#232323",
                borderRadius: "8px",
                border: "1px solid #2a2a2a",
              }}
            >
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>💬</div>
              <div
                style={{
                  fontWeight: "500",
                  color: "#ccc",
                  marginBottom: "4px",
                }}
              >
                Share Insights
              </div>
              <div style={{ fontSize: "12px" }}>Exchange interpretations</div>
            </div>
            <div
              style={{
                padding: "16px",
                backgroundColor: "#232323",
                borderRadius: "8px",
                border: "1px solid #2a2a2a",
              }}
            >
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>📖</div>
              <div
                style={{
                  fontWeight: "500",
                  color: "#ccc",
                  marginBottom: "4px",
                }}
              >
                Sync Reading
              </div>
              <div style={{ fontSize: "12px" }}>Follow along together</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Home View
  if (currentView === "home") {
    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100vw",
          backgroundColor: "#1a1a1a",
          color: "#ffffff",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <style>{style}</style>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
        <div style={{ marginBottom: "60px", textAlign: "center" }}>
          <div
            style={{
              margin: "0 auto 15px",
              position: "relative",
            }}
          >
            <img
              style={{ width: 100 }}
              src="https://res.cloudinary.com/dfbtwwa8p/image/upload/v1760042926/aobot-logo-white_avr7ix.png"
              alt="AO Logo"
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "20px",
            marginBottom: "130px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => {
              os.goToURL(
                `https://ao.bot/?pattern=SeedBibleDev&noGridPortal=true&bios=free`
              );
            }}
            style={{
              width: "240px",
              height: "146px",
              backgroundColor: "#e67e50",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              position: "relative",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow =
                "0 8px 20px rgba(230, 126, 80, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  backgroundColor: "#ffffff5c",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  borderRadius: "100%",
                }}
              >
                <img
                  style={{ width: "50px" }}
                  src="https://res.cloudinary.com/dfbtwwa8p/image/upload/v1755365776/717a8527988cca7e0bdc9449ec68581a8400b977_vqc7mx.png"
                />
              </div>
              <div
                style={{
                  position: "absolute",
                  top: "20px",
                  right: "20px",
                  fontSize: "18px",
                }}
              >
                ↗
              </div>
            </div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "#1a1a1a",
                textAlign: "left",
              }}
            >
              Launch Seed Bible
            </div>
          </button>

          <div>
            <div style={{ maxWidth: "90%", marginBottom: "0" }}>
              <button
                onClick={() => setCurrentView("build")}
                style={{
                  width: "240px",
                  height: "146px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  position: "relative",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #3a3a3a",
                  borderRadius: "6px",
                  cursor: "pointer",
                  padding: "18px 20px",
                  display: "flex",
                  alignItems: "left",
                  gap: "12px",
                  transition: "transform 0.2s, border-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.borderColor = "#4a4a4a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "#3a3a3a";
                }}
              >
                <div style={{ fontSize: "16px", display: "flex" }}>
                  <span
                    style={{ color: "white" }}
                    class="material-symbols-outlined"
                  >
                    send_time_extension
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "15px",
                    color: "#ffffff",
                    textAlign: "left",
                  }}
                >
                  Build with Seed Bible
                </div>
              </button>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "20px",
            marginBottom: "40px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {[
            "What is Seed Bible?",
            "How can I use it?",
            "What features does it have?",
          ].map((text, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickQuestion(text)}
              style={{
                backgroundColor: "transparent",
                border: "1px solid #3a3a3a",
                borderRadius: "6px",
                padding: "10px 20px",
                color: "#999",
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                // width: '183px',
                height: "32px",
                gap: "8px",
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
              {text}
              <span style={{ fontSize: "10px" }}>↗</span>
            </button>
          ))}
        </div>

        <div
          style={{
            width: "718px",
            height: "123px",
            maxWidth: "90%",
            position: "relative",
          }}
        >
          <input
            type="text"
            placeholder="E.g. Give me a Seed Bible link set to a Chinese translation that opens to Matthew 3."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const newChatId = `chat-${Date.now()}`;
                setCurrentChatId(newChatId);
                setCurrentView("chat");
                setTimeout(handleSendMessage, 100);
              }
            }}
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: "#2a2a2a",
              border: "1px solid #3a3a3a",
              borderRadius: "10px",
              padding: "16px 60px 16px 20px",
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
              top: "95px",
              transform: "translateY(-50%)",
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <button
              onClick={() => {
                const newChatId = `chat-${Date.now()}`;
                setCurrentChatId(newChatId);
                setCurrentView("chat");
                setTimeout(handleSendMessage, 100);
              }}
              style={{
                width: "32px",
                height: "32px",
                backgroundColor: "#e67e50",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = "scale(1.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = "scale(1)")
              }
            >
              <span style={{ fontSize: "16px", color: "#1a1a1a" }}>↑</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Build View
  if (currentView === "build") {
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          boxSizing: "border-box",
          backgroundColor: "#1a1a1a",
          color: "#ffffff",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=arrow_back"
        />
        <button
          onClick={() => setCurrentView("home")}
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            backgroundColor: "transparent",
            border: "1px solid #3a3a3a",
            borderRadius: "6px",
            color: "#ffffff",
            cursor: "pointer",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#4a4a4a";
            e.currentTarget.style.backgroundColor = "#2a2a2a";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#3a3a3a";
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <span class="material-symbols-outlined" style={{ fontSize: "18px" }}>
            arrow_back
          </span>
          Back
        </button>

        <div style={{ marginBottom: "40px", textAlign: "center" }}>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "700",
              marginBottom: "12px",
            }}
          >
            Build with Seed Bible
          </h1>
          <p style={{ fontSize: "15px", color: "#a0a0a0" }}>
            Configure default settings for your Seed Bible instance
          </p>
        </div>

        <div
          style={{
            width: "500px",
            maxWidth: "90%",
            backgroundColor: "#2a2a2a",
            border: "1px solid #3a3a3a",
            borderRadius: "12px",
            padding: "32px",
          }}
        >
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px",
                color: "#e0e0e0",
              }}
            >
              Translation ID
            </label>
            <input
              type="text"
              placeholder="e.g., NASB95, ENGWEBP, etc."
              value={translationID}
              onChange={(e) => setTranslationID(e.target.value)}
              style={{
                width: "100%",
                backgroundColor: "#1a1a1a",
                border: "1px solid #3a3a3a",
                borderRadius: "6px",
                padding: "12px 16px",
                color: "#ffffff",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#4a4a4a")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#3a3a3a")}
            />
            <p style={{ fontSize: "12px", color: "#808080", marginTop: "6px" }}>
              The ID of the translation to load by default
            </p>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px",
                color: "#e0e0e0",
              }}
            >
              Book
            </label>
            <input
              type="text"
              placeholder="e.g., GEN, EXO, PSA"
              value={book}
              onChange={(e) => setBook(e.target.value)}
              style={{
                width: "100%",
                backgroundColor: "#1a1a1a",
                border: "1px solid #3a3a3a",
                borderRadius: "6px",
                padding: "12px 16px",
                color: "#ffffff",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#4a4a4a")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#3a3a3a")}
            />
            <p style={{ fontSize: "12px", color: "#808080", marginTop: "6px" }}>
              The ID of the book to load by default
            </p>
          </div>
          <div style={{ marginBottom: "32px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px",
                color: "#e0e0e0",
              }}
            >
              Chapter
            </label>
            <input
              type="number"
              placeholder="e.g., 1, 3, 10"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              style={{
                width: "100%",
                backgroundColor: "#1a1a1a",
                border: "1px solid #3a3a3a",
                borderRadius: "6px",
                padding: "12px 16px",
                color: "#ffffff",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#4a4a4a")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#3a3a3a")}
            />
            <p style={{ fontSize: "12px", color: "#808080", marginTop: "6px" }}>
              The chapter number to load by default
            </p>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <label
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#e0e0e0",
                }}
              >
                Enable Collaboration
              </label>
              <div
                onClick={() => setEnableCollaboration(!enableCollaboration)}
                style={{
                  width: "48px",
                  height: "26px",
                  backgroundColor: enableCollaboration ? "#e67e50" : "#3a3a3a",
                  borderRadius: "13px",
                  position: "relative",
                  cursor: "pointer",
                  transition: "background-color 0.3s",
                  border:
                    "1px solid " +
                    (enableCollaboration ? "#e67e50" : "#4a4a4a"),
                }}
                onMouseEnter={(e) => {
                  if (!enableCollaboration) {
                    e.currentTarget.style.backgroundColor = "#4a4a4a";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!enableCollaboration) {
                    e.currentTarget.style.backgroundColor = "#3a3a3a";
                  }
                }}
              >
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    backgroundColor: "#ffffff",
                    borderRadius: "50%",
                    position: "absolute",
                    top: "3px",
                    left: enableCollaboration ? "26px" : "4px",
                    transition: "left 0.3s",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  }}
                />
              </div>
            </div>
            <p style={{ fontSize: "12px", color: "#808080", marginTop: "6px" }}>
              {enableCollaboration
                ? "Multi-user collaboration enabled with unique instance ID"
                : "Static instance for single-user experience"}
            </p>
          </div>

          <button
            onClick={() => {
              // Generate UUID for collaboration mode
              const generateUUID = () => {
                return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
                  /[xy]/g,
                  function (c) {
                    const r = (Math.random() * 16) | 0;
                    const v = c === "x" ? r : (r & 0x3) | 0x8;
                    return v.toString(16);
                  }
                );
              };

              console.log("Form submitted:", {
                translationID,
                book,
                chapter,
                enableCollaboration,
              });

              const url = new URL(`https://ao.bot/?pattern=SeedBibleDev`);

              if (enableCollaboration) {
                // Collaboration mode: add inst and owner parameters
                url.searchParams.set("inst", generateUUID());
                url.searchParams.set("owner", "public");
              } else {
                // Static mode: add bios=local inst parameter
                url.searchParams.set("bios", "local inst");
              }

              if (translationID && translationID !== "NASB95") {
                url.searchParams.set("translation", translationID);
              }

              if (book && book !== "GEN") {
                url.searchParams.set("book", book);
              }
              if (chapter && chapter !== "1") {
                url.searchParams.set("chapter", chapter);
              }

              os.goToURL(`${url.href}&noGridPortal`);

              // For now, just go back to home
              setCurrentView("home");
            }}
            style={{
              width: "100%",
              backgroundColor: "#e67e50",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              padding: "14px 20px",
              fontSize: "15px",
              fontWeight: "600",
              color: "#1a1a1a",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow =
                "0 8px 20px rgba(230, 126, 80, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Generate Configuration
          </button>
        </div>

        <button
          onClick={() => {
            const url = new URL(`https://ao.bot/`);

            os.goToURL(`${url.href}`);
          }}
          style={{
            width: "220px",
            backgroundColor: "transparent",
            border: "solid 1px #3a3a3a",
            borderRadius: "6px",
            cursor: "pointer",
            padding: "14px 20px",
            fontSize: "15px",
            fontWeight: "600",
            color: "#ccc",
            transition: "all 0.2s",
            marginTop: "22px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow =
              "0 8px 20px rgba(179, 179, 179, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          Enter IDE
        </button>
      </div>
    );
  }

  // Chat View
  return (
    <div
      style={{
        display: "flex",
        width: "100vw",
        height: "100vh",
        backgroundColor: "#1a1a1a",
        color: "#ffffff",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />
      <style>{style}</style>

      <button
        style={{
          position: "fixed",
          top: 10,
          left: 10,
          zIndex: 1010,
          background: "#2a2a2a",
          color: "#fff",
          border: "1px solid #3a3a3a",
          padding: "8px 12px",
          borderRadius: "8px",
          cursor: "pointer",
          display: "none",
        }}
        className="mobileMenuBtn"
        onClick={() => {
          const chatSidebar = document.querySelector(".chatSideBar");
          chatSidebar.classList.toggle("visible");
        }}
      >
        ☰
      </button>
      <style>{`@media (max-width: 980px){ 
      .mobileMenuBtn { display: block !important; }
      .chatSideBar { display: none !important; } .chatSideBar.visible { display: flex !important; } 
      }`}</style>

      <div
        style={{
          width: "250px",
          backgroundColor: "#232323",
          borderRight: "1px solid #2a2a2a",
          display: "flex",
          flexDirection: "column",
          padding: "20px 0",
        }}
        className="chatSideBar"
      >
        <button
          onClick={startNewChat}
          style={{
            margin: "0 20px 20px",
            padding: "12px 16px",
            backgroundColor: "#e67e50",
            border: "none",
            borderRadius: "8px",
            color: "#1a1a1a",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "transform 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "translateY(-1px)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = "translateY(0)")
          }
        >
          <span style={{ fontSize: "16px" }}>+</span> New Chat
          <span style={{ marginLeft: "auto", opacity: 0.7, fontSize: "12px" }}>
            ⌘ + K
          </span>
        </button>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 10px" }}>
          <button
            onClick={() => setCurrentView("home")}
            style={{
              width: "100%",
              padding: "12px 16px",
              backgroundColor: "transparent",
              border: "none",
              color: "#fff",
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              borderRadius: "8px",
              textAlign: "left",
              transition: "background-color 0.2s",
              marginBottom: "8px",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#2a2a2a")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <span
              style={{ marginTop: "-5px" }}
              class="material-symbols-outlined"
            >
              home
            </span>{" "}
            Home
          </button>

          <div
            style={{
              fontSize: "12px",
              color: "#666",
              padding: "12px 16px",
              fontWeight: "600",
            }}
          >
            CHAT HISTORY
          </div>

          {Object.keys(messageHistory).map((key) => (
            <div
              key={key}
              onClick={() => {
                setCurrentMessageId(key);
                const dc = dcRef.current;
                if (dc && dc.readyState === "open") {
                  dc.send(
                    JSON.stringify({ type: "output_audio_buffer.clear" })
                  );
                }
              }}
              style={{
                width: "100%",
                padding: "12px 16px",
                backgroundColor:
                  currentMessageId === key ? "#2a2a2a" : "transparent",
                border: "none",
                color: "#fff",
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderRadius: "8px",
                textAlign: "left",
                transition: "background-color 0.2s",
                marginBottom: "4px",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#2a2a2a")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor =
                  currentMessageId === key ? "#2a2a2a" : "transparent")
              }
            >
              <div
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                💬{" "}
                {messageHistory[key]?.chatMessages[
                  messageHistory[key].itemArray[0]
                ]?.message || "New Chat"}
              </div>
            </div>
          ))}

          {Object.keys(messageHistory).length === 0 && (
            <div
              style={{
                padding: "20px 16px",
                fontSize: "13px",
                color: "#666",
                textAlign: "center",
              }}
            >
              No chat history yet.
              <br />
              Start a conversation!
            </div>
          )}
        </div>
      </div>

      <ChatView initialQuery={inputValue} newMessageId={uuid()} />
    </div>
  );
}
