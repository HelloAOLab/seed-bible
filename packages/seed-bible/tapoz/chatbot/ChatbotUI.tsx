const { useState } = os.appHooks;
const { Input, Modal, Button, Checkbox, ButtonsCover, Tooltip, Select } = Components;

const API_KEY = 'dVGoGdLEuE3qB175uWAyV2kbJFvNfizT7FoJAP9d';
const secret_key = '2U838B2Q0G9KR4FXREBL';



const TapozChat = ({ id }) => {

    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState("");
    const [chatText, setChatText] = useState('');

    const handleSend = async () => {
        if (!chatText.trim()) {
            return ShowNotification({ message: "Type something to get response!", severity: "error" });
        }
        if (loading) return;

        setMessages(prev => [...prev, { role: 'user', content: chatText }]);
        setChatText('');

        // Simulate bot response
        setLoading(true);
        try {
            const apiResults = await web.post(`https://zp8hxnp1yj.execute-api.us-east-1.amazonaws.com/dev/chat`, {
                "organization_id": "67355031aea5f406546577d0",
                "prompt": chatText,
                "history": [
                    ...messages
                ],
                "secret_key": "2U838B2Q0G9KR4FXREBL"
            }, {
                headers: {
                    "x-api-key": API_KEY,
                    "Content-Type": "application/json",
                }
            });
            const response = apiResults?.data?.data?.response.data;
            if (!response) {
                setLoading(false);
                setMessages(prev => [...prev, { role: 'assistant', content: "Error generating response. Please Try again!" }]);
                return ShowNotification({ message: "Error in Getting Response!", severity: "error" });
            }
            console.log("response", response);
            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
            setLoading(false);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Error generating response. Please Try again!" }]);
            setLoading(false);
        }
    };


    return <>
        <style>{thisBot.tags['TapozChatbot.css']}</style>
        <div
            id="tapoz-chat-container"
            style={{ width: '100%', height: '100%', padding: '1rem' }}
        >

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ margin: '0' }}>Tapos Chatbot</h2>
                <span
                    class="material-symbols-outlined unfollow"
                    style={{
                        fontSize: '24px',
                        padding: '0',
                        border: 'none',
                        cursor: 'pointer',
                        marginLeft: 'auto'
                    }}
                    onClick={() => {
                        if (globalThis.TapozChatboxPresent) {
                            RemoveApplicationByID(globalThis.TAPOZ_CHATBOX_UI_ID);
                            globalThis.TAPOZ_CHATBOX_UI_ID = null;
                            globalThis.TapozChatboxPresent = false;
                        }
                    }}
                >
                    close
                </span>
            </div>
            <p>Ask me anything!</p>

            <div className="chat-ui">
                {messages.length === 0 ? (
                    <div className="welcome-message">
                        <p>👋 Welcome! Start chatting with Tapos Bot.</p>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`chat-message ${msg.role}`}
                            >
                                {msg.content}
                            </div>
                        ))}
                        {loading && (
                            <div className="chat-message assistant loading">
                                ✨ Discerning a response from the Word...
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="input-footer">
                <Input
                    style={{ marginBottom: '0' }}
                    type="textarea"
                    value={chatText}
                    onChangeListener={setChatText}
                    placeholder="How can I help you grow in your walk with Christ?"
                />

                <Button
                    isDisabled={loading}
                    onClick={() => {
                        handleSend();
                    }}
                >
                    Ask
                </Button>
            </div>
        </div>
    </>
}

return TapozChat;