import SurroundingDivs from 'app.components.surroundingDivs';
import { getStyleOf } from 'app.styles.styler';

await os.unregisterApp("main=toolbar")
await os.registerApp("main=toolbar")

const {useState, useEffect} = os.appHooks;

const Toolbar = () => {
    const [toolbarProps, setToolBarProps] = useState(that || null);
    const [toolbarBackground,setToolbarBackground] = useState('white')
    useEffect(() => {
        globalThis.SetToolBarProps = setToolBarProps;
    globalThis.SetToolbarBackground = setToolbarBackground
        return () => {
            globalThis.setToolBarProps = null;
            globalThis.SetToolbarBackground = null
        }
    }, [])

    if(!toolbarProps){
        return <></>
    }

    return (
        <div className="toolbar-container-1 boundElements">
            <SurroundingDivs action={toolbarProps.handleMouseLeaveContainer}>
                <div
                    onMouseUp={toolbarProps.handleMouseUp}
                    className="toolbar-1 boundElements"
                    style={{
                        border: toolbarProps.sidebarMode.includes('toolbarSettings') ? '2px solid #4459F3' : null,
                        background:toolbarBackground,
                    }}
                >
                    <div className="toolbar-item-wrapper">
                        <button
                            onClick={() => toolbarProps.navFunctions?.openPrevChapter()}
                            className="toolbar-button"
                        >
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                    </div>

                    {toolbarProps.TabTools.map((tool, index) => tool?.active && (
                        <div
                            key={tool.icon}
                            className="toolbar-item-wrapper"
                            onMouseEnter={() => toolbarProps.handleMouseEnter(index)}
                        >
                            {index === toolbarProps.draggedIndex ? (
                                <div className="toolbar-button placeholder"></div>
                            ) : (
                                <button
                                    className="toolbar-button"
                                    onMouseDown={() => {
                                        toolbarProps.hasHeldRef.current = false;

                                        toolbarProps.holdTimeoutRef.current = setTimeout(() => {
                                            tool?.onHold()
                                            return
                                            toolbarProps.hasHeldRef.current = true;
                                            toolbarProps.setIsDragging(true);
                                            toolbarProps.setOldList(tools);
                                            toolbarProps.setDraggedIndex(index);
                                            toolbarProps.setElement({
                                                App: tool.isImg
                                                    ? <ImageWrapper>
                                                        <img src={tool.icon} style={{ width: '20px' }} />
                                                    </ImageWrapper>
                                                    : <span className="material-symbols-outlined">{tool.icon}</span>,
                                                type: 'toolbar',
                                                data: { tool, index },
                                            });
                                        }, 1200);
                                    }}
                                    onMouseUp={() => {
                                        clearTimeout(toolbarProps.holdTimeoutRef.current);

                                        if (!toolbarProps.hasHeldRef.current && tool.onClick) {
                                            tool.onClick();
                                            // tool.onHold()
                                        }

                                        if (toolbarProps.isDragging) {
                                            toolbarProps.setIsDragging(false);
                                            toolbarProps.setElement(null);
                                            toolbarProps.setDraggedIndex(null);
                                        }
                                    }}
                                    onMouseLeave={() => {
                                        clearTimeout(toolbarProps.holdTimeoutRef.current);
                                    }}
                                >
                                    {tool.isImg
                                        ? <ImageWrapper>
                                            <img src={tool.icon} style={{ width: '20px' }} />
                                        </ImageWrapper>
                                        : <span className="material-symbols-outlined">{tool.icon}</span>}
                                </button>
                            )}
                        </div>
                    ))}

                    <div className="toolbar-item-wrapper">
                        <button
                            onClick={() => toolbarProps.navFunctions?.openNextChapter()}
                            className="toolbar-button"
                        >
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                </div>
            </SurroundingDivs>
            <style>{getStyleOf('toolbar.css')}</style>
        </div>
    );
}

os.compileApp('main=toolbar', <Toolbar />);