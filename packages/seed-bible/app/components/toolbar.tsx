import { getStyleOf } from 'app.styles.styler';
const { useEffect, useState, useRef } = os.appHooks;

import { useSideBarContext } from 'app.hooks.sideBar';
import { useMouseMove } from 'app.hooks.mouseMove';
import SurroundingDivs from 'app.components.surroundingDivs';
import { useBibleContext } from 'app.hooks.bibleVariables';
import { useTabsContext } from 'app.hooks.tabs';

function Toolbar() {
    const { navFunctions, setScreens, tools, canvasMode, canvasTools, mapTools, mapMode, setTools, setCanvasTools, setMapTools } = useBibleContext();
    const { sidebarMode, openOnMobile } = useSideBarContext();
    const { setIsDragging, isDragging, setElement, Element } = useMouseMove();
    const { activeSpace, updateToolsForSpace, getToolsForActiveSpace, updateTab, activeTab, tabs } = useTabsContext();
    const [showToolbar, setShowToolbar] = useState(true)
    useEffect(() => {
        setShowToolbar(!openOnMobile)
         
    }, [openOnMobile])
    // globalThis.ShowToolbar = setShowToolbar
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
        console.log(!activeTab || !tabs, "tools 1234", tools)
        if(!activeTab || !tabs) return;
        const activeTabObj = tabs.filter(item => item.id === activeTab)[0];
        console.log(activeTab, activeTabObj, "activetab")
        if(activeTabObj?.data.type === 'canvas'){
            setActiveTools([...canvasTools])
        }else{
            setActiveTools([...tools])
        }
    }, [activeTab, tabs, canvasTools, tools])

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
                isDragging,
                showToolbar
            })
        } else {
            // thisBot.renderToolbar({
            //     handleMouseLeaveContainer,
            //     handleMouseUp,
            //     sidebarMode,
            //     navFunctions,
            //     TabTools,
            //     handleMouseEnter,
            //     draggedIndex,
            //     hasHeldRef,
            //     holdTimeoutRef,
            //     setIsDragging,
            //     setOldList,
            //     setDraggedIndex,
            //     setElement,
            //     isDragging,
            //     showToolbar
            // });
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
