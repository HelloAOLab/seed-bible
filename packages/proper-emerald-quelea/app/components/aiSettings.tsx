const { useEffect, useState } = os.appHooks;
import { getStyleOf } from 'app.styles.styler';
import { MenuIcon, AiIcon, T, MenuDown, FormatLine, ColorSelect, ToolbarIcon, Panal, Playlist, AiChatIcon } from 'app.components.icons';
import { useTabsContext } from 'app.hooks.tabs';
import { useSideBarContext } from 'app.hooks.sideBar';
import { useBibleContext } from 'app.hooks.bibleVariables';

const AiSettings = () => {
    const { updateSpace, activeSpace, spaces } = useTabsContext();
    const { sidebarMode, setSideBarMode, closePopupSettings } = useSideBarContext();
    const { tools, setTools } = useBibleContext();
    const [switcher, setSwitcher] = useState(1);
    const [chatPrompt, setChatPrompt] = useState('');
    const [chatResponse, setChatResponse] = useState('');
    const [imagePrompt, setImagePrompt] = useState('');
    const [imageResult, setImageResult] = useState(null);
    const [loading, setLoading] = useState(false)
    const handleChatSubmit = async () => {
        try {
            setLoading(true)
            const response = await ai.chat(chatPrompt);
            setChatResponse(response);
            setLoading(false)
        } catch (error) {
            setLoading(false)
            console.error('Error with AI Chat:', error);
        }
    };

    const handleImageSubmit = async () => {

        try {
            setLoading(true)
            const result = await ai.generateImage({
                prompt: imagePrompt,
            });
            setImageResult(result.images[0].url);
            setLoading(false)

        } catch (error) {
            setLoading(false)

            console.error('Error generating image:', error);
        }
    };

    return (
        <div className="aiSettings-container">

            <div className="routerOptions">
                <div onClick={() => setSideBarMode('settings')} className="blackText">
                    <MenuIcon name="arrow_back" />
                </div>
                <div className="softText">Page settings</div>
                <div className="softText"><MenuIcon name="chevron_right" /></div>
                <div className="softText">Toolbar</div>
            </div>

            <div className="routerTitle blackText">
                <div className="blackText"><AiIcon /></div>
                <div>AI</div>
            </div>

            <div className="mediumText">Settings for AI features in the page</div>

            <div className="ai-chat">
                <div onClick={() => setSwitcher(prev => prev === 1 ? null : 1)} className="ai-chat">
                    <AiChatIcon />
                    <div className="blackText">AI Chat</div>
                </div>
                <div>
                    <MenuIcon name={`keyboard_arrow_${switcher === 1 ? 'up' : "down"}`} />
                </div>
            </div>
            <div style={{ height: '20px' }}></div>
            {switcher === 1 && <>
                <div className="blackText">Select model</div>
                <div style={{ height: '20px' }}></div>
                <select style={{ width: '100%' }} className="selectInput">
                    <option>gpt-4o</option>
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
                <button onClick={handleChatSubmit} className="submitButton selectInput">Submit to AI {loading && <span class="material-symbols-outlined spin">
                    sync
                </span>}</button>
                {chatResponse && <div className="aiResponse blackText">Response: {chatResponse}</div>}
            </>}

            <div className="ai-chat">
                <div onClick={() => setSwitcher(prev => prev === 2 ? null : 2)} className="ai-chat">
                    <AiChatIcon />
                    <div className="blackText">AI Image</div>
                </div>
                <div>
                    <MenuIcon name={`keyboard_arrow_${switcher === 2 ? 'up' : "down"}`} />
                </div>
            </div>
            <div style={{ height: '20px' }}></div>
            {switcher === 2 && <>
                <div className="blackText">Select model</div>
                <div style={{ height: '20px' }}></div>
                <select style={{ width: '100%' }} className="selectInput">
                    <option>DALL - E 3</option>
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
                <button onClick={handleImageSubmit} className="submitButton selectInput">Generate Image {loading && <span class="material-symbols-outlined spin">
                    sync
                </span>}</button>
                {imageResult && <div className="imageResult">
                    <img src={imageResult} alt="Generated AI" style={{ width: '100%', marginTop: '10px' }} />
                </div>}
            </>}

            <div className="ai-chat">
                <div onClick={() => setSwitcher(prev => prev === 3 ? null : 3)} className="ai-chat">
                    <AiChatIcon />
                    <div className="blackText">Editor AI</div>
                </div>
                <div>
                    <MenuIcon name={`keyboard_arrow_${switcher === 3 ? 'up' : "down"}`} />
                </div>
            </div>
            <div style={{ height: '20px' }}></div>
            {switcher === 3 && <>
                <div className="blackText">Select model</div>
                <div style={{ height: '20px' }}></div>
                <select style={{ width: '100%' }} className="selectInput">
                    <option>gpt-4o</option>
                </select>
                <div style={{ marginTop: '10px' }} className="mediumText">Different AI models can produce different or better results so feel free to experiment.</div>
                <div className="blackText">Positive prompt</div>
                <div style={{ height: '10px' }}></div>
                <textarea
                    style={{ height: '150px', width: '100%' }}
                    className="selectInput"
                    value={masks?.editorAIPostive || ""}
                    onChange={(e) => setTagMask(thisBot, "editorAIPostive", e.target.value, "local")}
                ></textarea>
                <div className="blackText">Negative prompt</div>
                <div style={{ height: '10px' }}></div>
                <textarea
                    style={{ height: '150px', width: '100%' }}
                    className="selectInput"
                    value={masks?.editorAINegative || ""}
                    onChange={(e) => setTagMask(thisBot, "editorAINegative", e.target.value, "local")}
                ></textarea>
            </>}

            <style>{getStyleOf('aiSettings.css')}</style>
        </div>
    );
};

export { AiSettings };