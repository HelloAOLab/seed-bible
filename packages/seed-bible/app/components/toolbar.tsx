import { getStyleOf } from 'app.styles.styler';
const { useEffect, useState, useRef } = os.appHooks;

import { useSideBarContext } from 'app.hooks.sideBar';
import { useMouseMove } from 'app.hooks.mouseMove';
import SurroundingDivs from 'app.components.surroundingDivs';
import { useBibleContext } from 'app.hooks.bibleVariables';
import { useTabsContext } from 'app.hooks.tabs';

function Toolbar() {
    const { navFunctions, setScreens, tools, canvasMode, canvasTools, mapTools, mapMode, setTools, setCanvasTools, setMapTools } = useBibleContext();
    const { sidebarMode } = useSideBarContext();
    const { setIsDragging, isDragging, setElement, Element } = useMouseMove();
    const { activeSpace, updateToolsForSpace, getToolsForActiveSpace } = useTabsContext();

    const TabTools = getToolsForActiveSpace();
    const setNewTools = (newTools) => updateToolsForSpace(activeSpace, newTools);

    const [oldList, setOldList] = useState(null);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const holdTimeoutRef = useRef(null);
    const hasHeldRef = useRef(false);

    useEffect(() => {
        globalThis.SetScreens = setScreens;
    }, []);

    useEffect(() => {
        return () => clearTimeout(holdTimeoutRef.current);
    }, []);

    function handleMouseEnter(targetIndex) {
        if (!isDragging || draggedIndex === null) return;
        if (targetIndex === draggedIndex) return;

        const reordered = [...TabTools];
        const [movedItem] = reordered.splice(draggedIndex, 1);
        reordered.splice(targetIndex, 0, movedItem);

        setNewTools(reordered);
        setDraggedIndex(targetIndex);
    }

    function handleMouseLeaveContainer() {
        if (isDragging) {
            setIsDragging(false);
            setNewTools(oldList);
            setDraggedIndex(null);
        }
    }

    function handleMouseUp() {
        if (!isDragging) return;
        setIsDragging(false);
        setElement(null);
        setDraggedIndex(null);
    }

    function handleMouseDown({ tool, index }) {
        setIsDragging(true);
        setOldList(TabTools);
        setDraggedIndex(index);
        setElement({
            App: <span className="material-symbols-outlined">{tool.icon}</span>,
            type: 'toolbar',
            data: { tool, index },
        });
    }

    useEffect(() => {
        if(canvasMode && !mapMode){
            setNewTools([...canvasTools])
        }else if(mapMode){
            setNewTools([...mapTools])
        }else{
            setNewTools([...tools])
        }
    }, [canvasMode, mapMode, canvasTools, mapTools, tools])

    useEffect(() => {
        globalThis.SetTools = setTools; 
        globalThis.SetCanvasTools = setCanvasTools; 
        globalThis.SetMapTools = setMapTools; 
        return () => {
            globalThis.SetTools = null; 
            globalThis.SetCanvasTools = null; 
            globalThis.SetMapTools = null; 
        }
    }, [])

    return (
        <div className="toolbar-container-1">
            <SurroundingDivs action={handleMouseLeaveContainer}>
                <div
                    onMouseUp={handleMouseUp}
                    className="toolbar-1"
                    style={{
                        border: sidebarMode === 'toolbarSettings' ? '2px solid #4459F3' : null
                    }}
                >
                    <div className="toolbar-item-wrapper">
                        <button
                            onClick={() => navFunctions?.openPrevChapter()}
                            className="toolbar-button"
                        >
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                    </div>

                    {TabTools.map((tool, index) => tool?.active && (
                        <div
                            key={tool.icon}
                            className="toolbar-item-wrapper"
                            onMouseEnter={() => handleMouseEnter(index)}
                        >
                            {index === draggedIndex ? (
                                <div className="toolbar-button placeholder"></div>
                            ) : (
                                <button
                                    className="toolbar-button"
                                    onMouseDown={() => {
                                        hasHeldRef.current = false;

                                        holdTimeoutRef.current = setTimeout(() => {
                                            hasHeldRef.current = true;
                                            setIsDragging(true);
                                            setOldList(TabTools);
                                            setDraggedIndex(index);
                                            setElement({
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
                                        clearTimeout(holdTimeoutRef.current);

                                        if (!hasHeldRef.current && tool.onClick) {
                                            tool.onClick();
                                        }

                                        if (isDragging) {
                                            setIsDragging(false);
                                            setElement(null);
                                            setDraggedIndex(null);
                                        }
                                    }}
                                    onMouseLeave={() => {
                                        clearTimeout(holdTimeoutRef.current);
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
                            onClick={() => navFunctions?.openNextChapter()}
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

export { Toolbar };
