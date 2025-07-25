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
    const { activeSpace, updateToolsForSpace, getToolsForActiveSpace, updateTab } = useTabsContext();

    const TabTools = getToolsForActiveSpace();
    const setActiveTools = (newTools) => updateToolsForSpace(activeSpace, newTools);

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

        setActiveTools(reordered);
        setDraggedIndex(targetIndex);
    }

    function handleMouseLeaveContainer() {
        if (isDragging) {
            setIsDragging(false);
            setActiveTools(oldList);
            setDraggedIndex(null);
        }
    }

    function handleMouseUp() {
        if (!isDragging) return;
        setIsDragging(false);
        setElement(null);
        setDraggedIndex(null);
    }

    useEffect(() => {
        if (canvasMode && !mapMode) {
            setActiveTools([...canvasTools])
        } else if (mapMode) {
            setActiveTools([...mapTools])
        } else {
            setActiveTools([...tools])
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

    useEffect(() => {
        if (globalThis?.SetToolBarProps) {
            SetToolBarProps({
                handleMouseLeaveContainer,
                handleMouseUp,
                sidebarMode,
                navFunctions,
                TabTools,
                handleMouseEnter,
                draggedIndex,
                hasHeldRef,
                holdTimeoutRef,
                setIsDragging,
                setOldList,
                setDraggedIndex,
                setElement,
                isDragging
            })
        } else {
            thisBot.renderToolbar({
                handleMouseLeaveContainer,
                handleMouseUp,
                sidebarMode,
                navFunctions,
                TabTools,
                handleMouseEnter,
                draggedIndex,
                hasHeldRef,
                holdTimeoutRef,
                setIsDragging,
                setOldList,
                setDraggedIndex,
                setElement,
                isDragging
            });
        }
    }, [
        handleMouseLeaveContainer,
        handleMouseUp,
        sidebarMode,
        navFunctions,
        TabTools,
        handleMouseEnter,
        draggedIndex,
        hasHeldRef,
        holdTimeoutRef
    ])

    return <></>
}

export { Toolbar };
