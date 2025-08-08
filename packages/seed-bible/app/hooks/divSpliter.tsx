const { useState, useRef, useEffect } = os.appHooks;
import { useBibleContext } from 'app.hooks.bibleVariables'

/**
 * useDivSpliter - Hook to manage split layout logic
 *
 * Returns:
 * - `containerProps`: Container state & event handlers
 * - `updateContainerSize`: Function to resize container
 * - `addApplication`: Function to add new panels
 */
export const useDivSpliter = ({
    components = [],
    containerWidth = 800,
    containerHeight = 600,
    minSize = 100,
    onResize,
}) => {
    const [apps, setApps] = useState(components);
    const count = apps.length;
    globalThis.SetApps = setApps
    const { panelMode, setPanelMode, screens } = useBibleContext()
    // useEffect(() => {
    //     if (apps.length > 0) {
    //         const findPanel = apps.find(e => e?.to === 'panel')
    //         os.log(findPanel, 'findPanel')
    //         if (findPanel) {
    //             setPanelMode(true)
    //         } else {
    //             setPanelMode(false)
    //         }
    //     }
    // }, [apps])
    // State for container dimensions
    const [currentContainerWidth, setCurrentContainerWidth] = useState(containerWidth);
    const [currentContainerHeight, setCurrentContainerHeight] = useState(containerHeight);

    // State for split sizes
    const defaultLeftWidth = currentContainerWidth * 0.7;
    const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
    const defaultTopHeight = currentContainerHeight * 0.5;
    const [topHeight, setTopHeight] = useState(defaultTopHeight);

    // Store previous container dimensions
    const prevContainerSize = useRef({ width: containerWidth, height: containerHeight });

    // Drag refs for resizing
    const verticalDragRef = useRef({ isDragging: false, startX: 0, startLeftWidth: 0 });
    const horizontalDragRef = useRef({ isDragging: false, startY: 0, startTopHeight: 0 });

    // Mouse event handlers
    const handleVerticalMouseDown = (e) => {
        os.log('mouse down vertical', e.clientX)
        verticalDragRef.current = { isDragging: true, startX: e.clientX, startLeftWidth: leftWidth };
    };

    const handleHorizontalMouseDown = (e) => {
        os.log('mouse down horo', e)
        horizontalDragRef.current = { isDragging: true, startY: e.clientY, startTopHeight: topHeight };
    };

    const handleMouseMove = (e) => {
        if (verticalDragRef.current.isDragging) {
            const deltaX = e.clientX - verticalDragRef.current.startX;
            let newLeftWidth = verticalDragRef.current.startLeftWidth + deltaX;
            newLeftWidth = Math.max(minSize, Math.min(newLeftWidth, currentContainerWidth - minSize));
            setLeftWidth(newLeftWidth);
        }
        if (horizontalDragRef.current.isDragging) {
            const deltaY = e.clientY - horizontalDragRef.current.startY;
            let newTopHeight = horizontalDragRef.current.startTopHeight + deltaY;
            newTopHeight = Math.max(minSize, Math.min(newTopHeight, currentContainerHeight - minSize));
            os.log(e, newTopHeight, 'horo')
            setTopHeight(newTopHeight);
        }
    };

    const handleMouseUp = () => {
        verticalDragRef.current.isDragging = false;
        horizontalDragRef.current.isDragging = false;
    };

    // Update container size while preserving ratios
    const updateContainerSize = (newWidth, newHeight) => {
        if (
            newWidth === prevContainerSize.current.width &&
            newHeight === prevContainerSize.current.height
        ) {
            return;
        }

        // Preserve ratios
        const leftRatio = leftWidth / currentContainerWidth;
        const topRatio = topHeight / currentContainerHeight;

        setCurrentContainerWidth(newWidth);
        setCurrentContainerHeight(newHeight);

        setLeftWidth(newWidth * leftRatio);
        setTopHeight(newHeight * topRatio);

        prevContainerSize.current = { width: newWidth, height: newHeight };

        if (onResize) {
            onResize({
                leftWidth: newWidth * leftRatio,
                topHeight: newHeight * topRatio,
                containerWidth: newWidth,
                containerHeight: newHeight,
            });
        }
    };

    // Add new panel dynamically
    const addApplication = (newApp) => {
        if (newApp.to === 'panel') {
            if (apps.length > 2) {
                setApps([apps[0], apps[1], newApp])
            } else {
                setApps(prev => [...prev, newApp])
            }
            // setApps((prevApps) => {
            //     if (prevApps.length > 2)
            //         [...prevApps, newApp]

            // });
        } else {
            setApps((prevApps) => [...prevApps, newApp]);
        }
    }
    const resetApps = () => {
        setApps((prevApps) => [prevApps[0]]);
    }
    const removeApplication = (id) => {
        setApps((prevApps) => prevApps.filter(e => e.id !== id));
    }

    const removeApplicationByID = (oldAppID) => {
        setApps((prevApps) => {
            const old = [...prevApps];
            const index = old.findIndex(ele => ele.id === oldAppID);
            if (index > -1) old.splice(index, 1);
            return old;
        });
    }

    return {
        containerProps: {
            apps,
            count,
            currentContainerWidth,
            currentContainerHeight,
            leftWidth,
            topHeight,
            handleMouseMove,
            handleMouseUp,
            handleVerticalMouseDown,
            handleHorizontalMouseDown,
        },
        updateContainerSize,
        addApplication,
        removeApplication,
        resetApps,
        removeApplicationByID
    };
};



const SplitApp = ({
    apps,
    count,
    currentContainerWidth,
    currentContainerHeight,
    leftWidth,
    topHeight,
    handleMouseMove,
    handleMouseUp,
    // panelMode = true,
    handleVerticalMouseDown,
    handleHorizontalMouseDown,
}) => {

    const { panelMode, setPanelMode } = useBibleContext()
    const [panelWidths, setPanelWidths] = useState(Array(count).fill(currentContainerWidth / count));
    const dragRefs = useRef(Array(count - 1).fill(null).map(() => ({ isDragging: false, startX: 0, startWidth: 0 })));
    const handleRowMouseDown = (index, e) => {
        dragRefs.current[index] = { isDragging: true, startX: gridPortalBot.tags.pointerPixelX, startWidth: panelWidths[index] };
    };

    const handleRowMouseMove = (e) => {
        const updatedWidths = [...panelWidths];
        dragRefs.current.forEach((ref, index) => {
            if (ref.isDragging) {
                const deltaX = gridPortalBot.tags.pointerPixelX - ref.startX;
                const newWidth = ref.startWidth + deltaX;

                if (newWidth > 10 && (currentContainerWidth - newWidth) > 10) {
                    updatedWidths[index] = newWidth;
                    updatedWidths[index + 1] = currentContainerWidth - updatedWidths.slice(0, index + 1).reduce((a, b) => a + b, 0);
                }
            }
            setPanelWidths(updatedWidths);
        });

    };
    useEffect(() => {
        // Adjust panel widths proportionally if the container width changes
        const totalWidth = panelWidths.reduce((a, b) => a + b, 0);
        const updatedWidths = panelWidths.map(width => (width / totalWidth) * currentContainerWidth);

        setPanelWidths(updatedWidths);
    }, [currentContainerWidth]);
    const handleRowMouseUp = () => {
        dragRefs.current.forEach(ref => ref.isDragging = false);
    };
    if (panelMode) {
        // Fallback for any other number of panels
        return (
            <div
                style={{
                    display: 'flex',
                    width: currentContainerWidth,
                    height: currentContainerHeight,
                    overflow: 'auto', scrollbarWidth: "none",
                    userSelect: 'none',
                    position: 'relative'
                }}
                onMouseMove={handleRowMouseMove}
                onMouseUp={handleRowMouseUp}
            >
                {apps.map(({ App, minWidth }, index) => (
                    <>
                        <div style={{ width: panelWidths[index], padding: '1px', minWidth: minWidth || '100px', overflow: 'auto', scrollbarWidth: "none", 'border-radius': '12px' }}>
                            {App}
                        </div>
                        {index < apps.length - 1 && (
                            <div
                                style={{
                                    width: 4,
                                    cursor: 'col-resize',
                                    background: 'var(--primary-color)',
                                    zIndex: 1
                                }}
                                onMouseDown={(e) => handleRowMouseDown(index, e)}
                            />
                        )}
                    </>
                ))}
            </div>
        )
    }
    else if (count === 2) {
        return (
            <div
                style={{
                    display: 'flex',
                    width: currentContainerWidth,
                    height: currentContainerHeight,
                    position: 'relative',
                    userSelect: 'none',
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            >
                <div style={{ width: leftWidth, height: '100%', overflow: 'auto', scrollbarWidth: "none", padding: '1px', 'border-radius': '12px', }}>
                    {apps[0]?.App}
                </div>
                <div
                    style={{ width: 4, cursor: 'col-resize', background: 'var(--primary-color)' }}
                    onMouseDown={handleVerticalMouseDown}
                />
                <div style={{ flex: 1, height: '100%', overflow: 'auto', scrollbarWidth: "none", padding: '1px', minWidth: '370px', 'border-radius': '12px', }}>
                    {apps[1]?.App}
                </div>
            </div>
        );
    } else if (count === 3) {
        return (
            <div
                style={{
                    display: 'flex',
                    width: currentContainerWidth,
                    height: currentContainerHeight,
                    position: 'relative',
                    userSelect: 'none',
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            >
                <div style={{ width: leftWidth, height: '100%', overflow: 'auto', scrollbarWidth: "none", padding: '1px', 'border-radius': '12px', }}>
                    {apps[0]?.App}
                </div>
                <div
                    style={{ width: 4, cursor: 'col-resize', background: 'var(--primary-color)' }}
                    onMouseDown={handleVerticalMouseDown}
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: '370px', 'border-radius': '12px', }}>
                    <div style={{ height: topHeight, overflow: 'auto', scrollbarWidth: "none", padding: '1px' }}>
                        {apps[1]?.App}
                    </div>
                    <div
                        style={{ height: 4, cursor: 'row-resize', background: 'var(--primary-color)' }}
                        onMouseDown={handleHorizontalMouseDown}
                    />
                    <div style={{ flex: 1, overflow: 'auto', scrollbarWidth: "none", padding: '1px', 'border-radius': '12px', }}>
                        {apps[2]?.App}
                    </div>
                </div>
            </div>
        );
    } else if (count === 4) {
        return (
            <div
                style={{
                    position: 'relative',
                    width: currentContainerWidth,
                    height: currentContainerHeight,
                    userSelect: 'none',
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            >
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: leftWidth,
                        height: topHeight,
                        overflow: 'auto', scrollbarWidth: "none",
                        padding: '1px',
                        'border-radius': '12px',

                    }}
                >
                    {apps[0]?.App}
                </div>

                <div
                    style={{
                        position: 'absolute',
                        left: leftWidth + 4,
                        top: 0,
                        width: currentContainerWidth - leftWidth - 4,
                        height: topHeight,
                        overflow: 'auto', scrollbarWidth: "none",
                        padding: '1px',
                        minWidth: '370px',
                        'border-radius': '12px',
                    }}
                >
                    {apps[1]?.App}
                </div>

                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: topHeight + 4,
                        width: leftWidth,
                        height: currentContainerHeight - topHeight - 4,
                        overflow: 'auto', scrollbarWidth: "none",
                        padding: '1px', 'border-radius': '12px',
                    }}
                >
                    {apps[2]?.App}
                </div>

                <div
                    style={{
                        position: 'absolute',
                        left: leftWidth + 4,
                        top: topHeight + 4,
                        width: currentContainerWidth - leftWidth - 4,
                        height: currentContainerHeight - topHeight - 4,
                        overflow: 'auto', scrollbarWidth: "none",
                        padding: '1px',
                        'border-radius': '12px',
                    }}
                >
                    {apps[3]?.App}
                </div>

                <div
                    style={{
                        position: 'absolute',
                        left: leftWidth,
                        top: 0,
                        width: 4,
                        height: currentContainerHeight,
                        cursor: 'col-resize',
                        background: 'var(--primary-color)',
                    }}
                    onMouseDown={handleVerticalMouseDown}
                />

                <div
                    style={{
                        position: 'absolute',
                        top: topHeight,
                        left: 0,
                        height: 4,
                        width: currentContainerWidth,
                        cursor: 'row-resize',
                        background: 'var(--primary-color)',
                    }}
                    onMouseDown={handleHorizontalMouseDown}
                />
            </div >
        );
    } else {
        // Fallback for any other number of panels
        return (
            <div style={{ width: currentContainerWidth, height: currentContainerHeight, overflow: 'auto', scrollbarWidth: "none", padding: '1px' }}>
                {apps.map(({ App }, index) => (
                    <div style={{ height: '100%', width: '100%' }} key={index}>{App}</div>
                ))}
            </div>
        );
    }
};

export { SplitApp, useDivSpliter }
