import { AOIcon } from "aiApps.voiceAssistant.icons";

const { useState, useEffect } = os.appHooks;

const StreamTextAi = ({ aiConfig }) => {
  const [messages, setMessesages] = useState<
    { role: string; content: string }[]
  >([]);
  const [query, setQuery] = useState("");
  const [userWriting, setUserWriting] = useState(false);
  const [assistantWriting, setAssistantWriting] = useState(false);
  const [aiData, setAiData] = useState(null);

  const handleSubmit = async () => {
    setAssistantWriting(true);
    setMessesages([
      ...messages,
      {
        role: "user",
        content: query,
      },
    ]);
    setQuery("");
    let res = await web.post(
      aiData.domain,
      JSON.stringify({
        model: "openai/gpt/4o",
        stream: false,
        messages: [
          ...messages,
          {
            role: "user",
            content: query,
          },
        ],
        response_format: {
          type: "json",
        },
      }),
      {
        headers: {
          Authorization: `Bearer ${aiData.apiKey}`,
          ["Content-Type"]: "application/json",
        },
      }
    );
    setAssistantWriting(false);
    setMessesages([
      ...messages,
      {
        role: "user",
        content: query,
      },
      res.data.choices[0].message,
    ]);
  };

  const getAiConfig = async () => {
    let res = await web.get(
      `https://aolab-bible-api.netlify.app/api/ai/getApologistKey?agent=${aiConfig.agent}`
    );
    setAiData({ ...res.data.data });
  };

  useEffect(() => {
    getAiConfig();
  }, [aiConfig]);

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
                <span className={`assistant-message`}>{message.content}</span>
              </div>
            );
          } else {
            return <span className={`user-message`}>{message.content}</span>;
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
      </div>
    </div>
  );
};

export default StreamTextAi;
