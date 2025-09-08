const { useEffect, useState } = os.appHooks;
import { getStyleOf } from 'app.styles.styler';
import { MenuIcon, AiIcon, T, MenuDown, FormatLine, ColorSelect, ToolbarIcon, Panal, Playlist, AiChatIcon } from 'app.components.icons';
import { useTabsContext } from 'app.hooks.tabs';
import { useSideBarContext } from 'app.hooks.sideBar';
import { useBibleContext } from 'app.hooks.bibleVariables';

const PromtBarSettings = () => {
    const { sidebarMode, setSideBarMode } = useSideBarContext();
    const [switcher, setSwitcher] = useState(1);
    const [promtTools, setPromtTools] = useState(masks?.promtTools || [
        {
            icon: 'network_intel_node', label: 'ChatGPT', hasToggle: true, active: true, id: 1
        },
        {
            icon: 'robot_2', label: 'Dall-E', hasToggle: true, active: true, id: 2
        },
        // {
        //     icon: 'database', label: 'Data Ocean', hasToggle: true, active: false, id: 3
        // }
    ]);
    const [mindmapTools, setMindmapTools] = useState(masks?.mindmapTools || [
        {
            icon: 'close', label: 'Separate Node', hasToggle: true, active: true, id: 1
        },
        {
            icon: 'network_intel_node', label: 'ChatGPT', hasToggle: true, active: true, id: 2
        },
        {
            icon: 'robot_2', label: 'Dall-E', hasToggle: true, active: true, id: 3
        },
        {
            icon: 'mic', label: 'Voice Note', hasToggle: true, active: true, id: 4
        },
        {
            icon: 'delete', label: 'Delete', hasToggle: true, active: true, id: 5
        },
    ]);

    const toggleToolActive = (index, checked, type) => {
        os.log(checked)
        if (checked === undefined)
            checked = true
        if (type === "promt") {
            setPromtTools(
                promtTools.map((tool, i) =>
                    i === index ? { ...tool, active: checked } : tool
                )
            );
        } else if (type === "mindmap") {
            setMindmapTools(
                mindmapTools.map((tool, i) =>
                    i === index ? { ...tool, active: checked } : tool
                )
            );
        }
    };

    useEffect(() => {
        setTagMask(thisBot, "promtTools", promtTools, 'local');
        setTagMask(thisBot, "mindmapTools", mindmapTools, 'local');
    }, [promtTools, mindmapTools])

    return (
        <div className="aiSettings-container boundElements">

            <div className="routerOptions">
                <div onClick={() => setSideBarMode('settings')} className="blackText">
                    <MenuIcon name="arrow_back" />
                </div>
                <div className="softText">PromtBar settings</div>
                <div className="softText"><MenuIcon name="chevron_right" /></div>
                <div className="softText">Toolbar</div>
            </div>

            <div className="routerTitle blackText">
                <span class="material-symbols-outlined">
                    title
                </span>
                <div className="blackText">Word Tool</div>
            </div>

            <div className="mediumText">Settings for Word Tool and Mindmap features in the canvas</div>

            <div className="ai-chat">
                <div onClick={() => setSwitcher(prev => prev === 1 ? null : 1)} className="ai-chat">
                    <span class="material-symbols-outlined">
                        title
                    </span>
                    <div>Word Tool</div>
                    <MenuIcon name={`keyboard_arrow_${switcher === 1 ? 'up' : "down"}`} />
                </div>
            </div>
            <div style={{ height: '20px' }}></div>
            {switcher === 1 && <>
                <ul className="tool-list">
                    {promtTools.map((tool, index) => {
                        // os.log(tool)
                        return (
                            <li
                                key={index}
                                className={`tool-item ${tool.active ? 'active' : ''}`}
                                onClick={() => toggleToolActive(index, !tool.active, 'promt')}
                            >
                                <span className="icon">
                                    {typeof tool.icon === 'string' && !tool.isImg ? <MenuIcon name={tool.icon} /> : tool.isImg ? <img src={tool.icon} style={{ width: '20px' }} /> : tool.icon}
                                </span>
                                <span className="label">{tool.label}</span>
                                {tool.hasToggle && (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            style={{
                                                backgroundColor: tool.active ? '#4CAF50' : '#f1f1f1',
                                                color: tool.active ? '#fff' : '#000',
                                                padding: '5px 10px',
                                                borderRadius: '5px',
                                                border: 'none',
                                                cursor: 'pointer'
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleToolActive(index, true, 'promt');
                                            }}
                                        >
                                            On
                                        </button>
                                        <button
                                            style={{
                                                backgroundColor: !tool.active ? '#f44336' : '#f1f1f1',
                                                color: !tool.active ? '#fff' : '#000',
                                                padding: '5px 10px',
                                                borderRadius: '5px',
                                                border: 'none',
                                                cursor: 'pointer'
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleToolActive(index, false, 'promt');
                                            }}
                                        >
                                            Off
                                        </button>
                                    </div>
                                )}
                                {tool.hasToggle && <div className="menu-dots">⋮</div>}
                            </li>

                        )
                    })}
                </ul>
            </>}

            <div className="ai-chat">
                <div onClick={() => setSwitcher(prev => prev === 2 ? null : 2)} className="ai-chat">
                    <span class="material-symbols-outlined">
                        mindfulness
                    </span>
                    <div className="blackText">Mindmap</div>
                    <MenuIcon name={`keyboard_arrow_${switcher === 2 ? 'up' : "down"}`} />
                </div>
            </div>
            <div style={{ height: '20px' }}></div>
            {switcher === 2 && <>
                <ul className="tool-list">
                    {mindmapTools.map((tool, index) => {
                        return (
                            <li
                                key={index}
                                className={`tool-item ${tool.active ? 'active' : ''}`}
                                onClick={() => toggleToolActive(index, !tool.active, 'mindmap')}
                            >
                                <span className="icon">
                                    {typeof tool.icon === 'string' && !tool.isImg ? <MenuIcon name={tool.icon} /> : tool.isImg ? <img src={tool.icon} style={{ width: '20px' }} /> : tool.icon}
                                </span>
                                <span className="label">{tool.label}</span>
                                {tool.hasToggle && (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            style={{
                                                backgroundColor: tool.active ? '#4CAF50' : '#f1f1f1',
                                                color: tool.active ? '#fff' : '#000',
                                                padding: '5px 10px',
                                                borderRadius: '5px',
                                                border: 'none',
                                                cursor: 'pointer'
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleToolActive(index, true, 'mindmap');
                                            }}
                                        >
                                            On
                                        </button>
                                        <button
                                            style={{
                                                backgroundColor: !tool.active ? '#f44336' : '#f1f1f1',
                                                color: !tool.active ? '#fff' : '#000',
                                                padding: '5px 10px',
                                                borderRadius: '5px',
                                                border: 'none',
                                                cursor: 'pointer'
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleToolActive(index, false, 'mindmap');
                                            }}
                                        >
                                            Off
                                        </button>
                                    </div>
                                )}
                                {tool.hasToggle && <div className="menu-dots">⋮</div>}
                            </li>

                        )
                    })}
                </ul>
            </>}

            <style>{getStyleOf('aiSettings.css')}</style>
            <style>{getStyleOf('toolbarSettings.css')}</style>
        </div>
    );
};

export { PromtBarSettings };