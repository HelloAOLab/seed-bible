const { useEffect, useState } = os.appHooks;
import { getStyleOf } from 'app.styles.styler';
import { MenuIcon, AiIcon, T, MenuDown, FormatLine, ColorSelect, ToolbarIcon, Panal, Playlist, AiChatIcon } from 'app.components.icons';
import { useTabsContext } from 'app.hooks.tabs';
import { useSideBarContext } from 'app.hooks.sideBar';
import { useBibleContext } from 'app.hooks.bibleVariables';

const CanvasAiSettings = () => {
    const { sidebarMode, setSideBarMode, closePopupSettings } = useSideBarContext();

    // Chat AI
    const [chatAIOptions, setChatAIOptions] = useState([
        {
            title: "GPT4",
            value: "gpt-4"
        },
        {
            title: "GPT3",
            value: "gpt-3.5-turbo"
        },
        {
            title: "Claude",
            value: "claude-3-5-sonnet-20240620"
        }
    ]);
    const [selectedChatAI, setSelectedChatAI] = useState({
        title: "GPT4",
        value: "gpt-4"
    })
    const [chatPrompt, setChatPrompt] = useState('');

    // Image AI
    const [imageAIOptions, setImageAIOptions] = useState([
        {
            title: "dallE 3",
            value: "dall-e-2"
        },
        {
            title: "dallE 2",
            value: "dall-e-2"
        },
        {
            title: "StabilityAI",
            value: "stabilityAi"
        }
    ]);
    const [selectedImageAI, setSelectedImageAI] = useState({
        title: "dallE 3",
        value: "dall-e-2"
    })
    const [imagePrompt, setImagePrompt] = useState('');

    // Assistant AI
    const [enableAssistant, setEnabltAssistant] = useState(false);
    const [assistantAIOptions, setAssistantAIOptions] = useState([
        {
            title: "GPT4",
            value: "gpt-4"
        },
        {
            title: "GPT3",
            value: "gpt-3.5-turbo"
        },
        {
            title: "Claude",
            value: "claude-3-5-sonnet-20240620"
        }
    ]);
    const [selectedAssistantAI, setSelectedAssistantAI] = useState({
        title: "GPT4",
        value: "gpt-4"
    })
    const [assistantVoiceOptions, setAssistantVoiceOptions] = useState([
        {
            title: "Alloy",
            value: "alloy"
        },
        {
            title: "Echo",
            value: "echo"
        },
        {
            title: "Fable",
            value: "fable"
        },
        {
            title: "Onyx",
            value: "onyx"
        },
        {
            title: "Nova",
            value: "nova"
        },
        {
            title: "Shimmer",
            value: "shimmer"
        },
    ]);
    const [selectedAssistantVoice, setSelectedAssistantVoice] = useState({
        title: "Alloy",
        value: "alloy"
    })

    const [switcher, setSwitcher] = useState(1);
    const [initiated, setInitiated] = useState(false);

    useEffect(() => {
        if (initiated) {
            let aiChat = getBot('system', 'ext_canvas.aiChat');
            setTagMask(aiChat, "dallEVersion", selectedImageAI, "local")
            setTagMask(aiChat, "gptVersion", selectedChatAI, "local")
            setTagMask(aiChat, "positivePromt", chatPrompt, "local")
            setTagMask(aiChat, "positiveImagePromt", imagePrompt, "local")
        }
    }, [selectedChatAI, selectedImageAI, chatPrompt, imagePrompt, initiated])

    useEffect(() => {
        let aiChat = getBot('system', 'ext_canvas.aiChat');
        if (aiChat) {
            setSelectedImageAI(aiChat.masks?.dallEVersion)
            setSelectedChatAI(aiChat.masks?.gptVersion)
            setChatPrompt(aiChat.masks?.positivePromt)
            setImagePrompt(aiChat.masks?.positiveImagePromt)
        }
        setInitiated(true);
    }, [])

    return (
        <div className="aiSettings-container boundElements">

            <div className="routerOptions">
                <div onClick={() => setSideBarMode('settings')} className="blackText">
                    <MenuIcon name="arrow_back" />
                </div>
                <div className="softText">Canvas AI settings</div>
                <div className="softText"><MenuIcon name="chevron_right" /></div>
                <div className="softText">Toolbar</div>
            </div>

            <div className="routerTitle blackText">
                <div className="blackText"><AiIcon /></div>
                <div>AI</div>
            </div>

            <div className="mediumText">Settings for AI features in the canvas</div>

            <div className="ai-chat">
                <div onClick={() => setSwitcher(prev => prev === 1 ? null : 1)} className="ai-chat">
                    <AiChatIcon />
                    <div className="blackText">AI Chat</div>
                    <MenuIcon name={`keyboard_arrow_${switcher === 1 ? 'up' : "down"}`} />
                </div>
            </div>
            <div style={{ height: '20px' }}></div>
            {switcher === 1 && <>
                <div className="blackText">Select model</div>
                <div style={{ height: '20px' }}></div>
                <select value={JSON.stringify(selectedChatAI)} onChange={e => {
                    setSelectedChatAI(JSON.parse(e.target.value))
                }} style={{ width: '100%' }} className="selectInput">
                    {
                        chatAIOptions.map(aiOption => {
                            return <option key={JSON.stringify(aiOption)} value={JSON.stringify(aiOption)}>{aiOption.title}</option>
                        })
                    }
                </select>
                <div style={{ marginTop: '10px' }} className="mediumText">Different AI models can produce different or better results so feel free to experiment.</div>
                <div className="blackText">Positive prompt</div>
                <div style={{ height: '10px' }}></div>
                <textarea
                    style={{ height: '150px', width: '100%' }}
                    className="selectInput"
                    value={chatPrompt}
                    onChange={(e) => setChatPrompt(e.target.value)}
                ></textarea>
            </>}

            <div className="ai-chat">
                <div onClick={() => setSwitcher(prev => prev === 2 ? null : 2)} className="ai-chat">
                    <AiChatIcon />
                    <div className="blackText">AI Image</div>
                    <MenuIcon name={`keyboard_arrow_${switcher === 2 ? 'up' : "down"}`} />
                </div>
            </div>
            <div style={{ height: '20px' }}></div>
            {switcher === 2 && <>
                <div className="blackText">Select model</div>
                <div style={{ height: '20px' }}></div>
                <select value={JSON.stringify(selectedImageAI)} onChange={e => {
                    setSelectedImageAI(JSON.parse(e.target.value))
                }} style={{ width: '100%' }} className="selectInput">
                    {
                        imageAIOptions.map(aiOption => {
                            return <option key={JSON.stringify(aiOption)} value={JSON.stringify(aiOption)}>{aiOption.title}</option>
                        })
                    }
                </select>
                <div style={{ marginTop: '10px' }} className="mediumText">Different AI models can produce different or better results so feel free to experiment.</div>
                <div className="blackText">Positive prompt</div>
                <div style={{ height: '10px' }}></div>
                <textarea
                    style={{ height: '150px', width: '100%' }}
                    className="selectInput"
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                ></textarea>
            </>}

            <div className="ai-chat">
                <div onClick={() => setSwitcher(prev => prev === 3 ? null : 3)} className="ai-chat">
                    <AiChatIcon />
                    <div className="blackText">AI Assistant</div>
                    <MenuIcon name={`keyboard_arrow_${switcher === 3 ? 'up' : "down"}`} />
                </div>
            </div>
            <div style={{ height: '20px' }}></div>
            {switcher === 3 && <>
                <div className="blackText">Select model</div>
                <div style={{ height: '20px' }}></div>
                <select value={JSON.stringify(selectedAssistantAI)} onChange={e => {
                    setSelectedAssistantAI(JSON.parse(e.target.value))
                }} style={{ width: '100%' }} className="selectInput">
                    {
                        assistantAIOptions.map(aiOption => {
                            return <option key={JSON.stringify(aiOption)} value={JSON.stringify(aiOption)}>{aiOption.title}</option>
                        })
                    }
                </select>
                <div className="blackText">Select voice</div>
                <div style={{ height: '20px' }}></div>
                <select value={JSON.stringify(selectedAssistantVoice)} onChange={e => {
                    setSelectedAssistantVoice(JSON.parse(e.target.value))
                }} style={{ width: '100%' }} className="selectInput">
                    {
                        assistantVoiceOptions.map(aiOption => {
                            return <option key={JSON.stringify(aiOption)} value={JSON.stringify(aiOption)}>{aiOption.title}</option>
                        })
                    }
                </select>
            </>}

            <style>{getStyleOf('aiSettings.css')}</style>
        </div>
    );
};

export { CanvasAiSettings };