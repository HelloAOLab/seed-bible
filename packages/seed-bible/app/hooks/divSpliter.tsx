const { useState, useRef, useEffect, useCallback } = os.appHooks;
import { useBibleContext } from 'app.hooks.bibleVariables'
import { useTabsContext } from 'app.hooks.tabs'
import { cloneElement } from "https://esm.sh/react@18";
/**
 * useDivSpliter - Hook to manage split layout logic
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
    globalThis.SetApps = setApps;
    globalThis.PanelsApps = apps

    const { activeSpace } = useTabsContext();
    const { panelMode } = useBibleContext();

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const [currentContainerWidth, setCurrentContainerWidth] = useState(containerWidth);
    const [currentContainerHeight, setCurrentContainerHeight] = useState(containerHeight);

    const defaultLeftWidth = containerWidth * 0.7;
    const defaultTopHeight = containerHeight * 0.5;

    const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
    const [topHeight, setTopHeight] = useState(defaultTopHeight);

    const prevContainerSize = useRef({ width: containerWidth, height: containerHeight });

    const verticalDragRef = useRef({ isDragging: false, startX: 0, startLeftWidth: 0 });
    const horizontalDragRef = useRef({ isDragging: false, startY: 0, startTopHeight: 0 });

    useEffect(() => {
        const layout = globalThis.SpaceLayouts?.[activeSpace];
        if (layout) {
            if (layout.leftWidth) setLeftWidth(layout.leftWidth);
            if (layout.topHeight) setTopHeight(layout.topHeight);
        }
    }, [activeSpace]);

    useEffect(() => {
        globalThis.SpaceLayouts[activeSpace] = { leftWidth, topHeight };
    }, [leftWidth, topHeight]);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleVerticalMouseDown = (e) => {
        verticalDragRef.current = { isDragging: true, startX: e.clientX, startLeftWidth: leftWidth };
    };

    const handleHorizontalMouseDown = (e) => {
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
            setTopHeight(newTopHeight);
        }
    };

    const handleMouseUp = () => {
        verticalDragRef.current.isDragging = false;
        horizontalDragRef.current.isDragging = false;
    };

    const updateContainerSize = (newWidth, newHeight) => {
        if (
            newWidth === prevContainerSize.current.width &&
            newHeight === prevContainerSize.current.height
        ) return;

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

    const addApplication = (newApp) => {
        const clone = cloneElement(newApp.App, { prop: 'test' })
        os.log(clone, 'cloned')
        if (newApp.to === 'panel') {
            if (apps.length > 2) {
                setApps([apps[0], apps[1], newApp]);
            } else {
                setApps(prev => [...prev, newApp]);
            }
        } else {
            setApps((prevApps) => [...prevApps, newApp]);
        }
    };

    const resetApps = () => {
        setApps([]);
    };

    const removeApplication = (id) => {
        setApps((prevApps) => prevApps.filter(e => e.id !== id));
    };

    const removeApplicationByID = (oldAppID) => {
        setApps((prevApps) => {
            const old = [...prevApps];
            const index = old.findIndex(ele => ele.id === oldAppID);
            if (index > -1) old.splice(index, 1);
            return old;
        });
    };
    const handleTouchMove = (e) => {
        const touch = e.touches[0];
        if (verticalDragRef.current.isDragging) {
            const deltaX = touch.clientX - verticalDragRef.current.startX;
            let newLeftWidth = verticalDragRef.current.startLeftWidth + deltaX;
            newLeftWidth = Math.max(minSize, Math.min(newLeftWidth, currentContainerWidth - minSize));
            setLeftWidth(newLeftWidth);
        }
        if (horizontalDragRef.current.isDragging) {
            const deltaY = touch.clientY - horizontalDragRef.current.startY;
            let newTopHeight = horizontalDragRef.current.startTopHeight + deltaY;
            newTopHeight = Math.max(minSize, Math.min(newTopHeight, currentContainerHeight - minSize));
            setTopHeight(newTopHeight);
        }
    };

    const handleTouchEnd = () => {
        verticalDragRef.current.isDragging = false;
        horizontalDragRef.current.isDragging = false;
    };
    const replaceApplication = (oldAppID, newApp) => {
        setApps((prevApps) => {
            const updated = [...prevApps];
            const index = typeof oldAppID === 'number' && 5 < oldAppID > 0 ? oldAppID + 1 : updated.findIndex(app => app.id === oldAppID);
            if (index !== -1) {
                updated[index] = newApp;
            }
            return updated;
        });
    };
    // Additions ------>
    const updateApplication = (id, changes) => {
        setApps(prev =>
            prev.map(app =>
                app.id === id
                    ? { ...app, ...changes }
                    : app
            )
        );
    };
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
            isMobile,
            handleTouchMove,
            handleTouchEnd,
        },
        updateContainerSize,
        addApplication,
        removeApplication,
        updateApplication,
        setApps,
        resetApps,
        removeApplicationByID,
        replaceApplication
    };
};



export const SplitApp = ({
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
    isMobile,
    handleTouchMove,
    handleTouchEnd

}) => {
    const { panelMode, screens } = useBibleContext();
    useEffect(() => {
        (function installScrollerScrollIndicator() {
            const timers = new WeakMap();

            const onScrollCapture = (e) => {
                const el = e.target;
                if (!(el instanceof Element)) return;
                if (!el.classList?.contains('scroller')) return;

                // Show scrollbar
                el.classList.add('scroll');

                // Reset timer
                clearTimeout(timers.get(el));
                timers.set(el, setTimeout(() => {
                    el.classList.remove('scroll');
                    timers.delete(el);
                }, 1000));
            };

            // Capture phase so it works for all scrollers
            document.addEventListener('scroll', onScrollCapture, { capture: true, passive: true });
        })();

    }, [])
    const { activeSpace } = useTabsContext();
    const [panelWidths, setPanelWidths] = useState(Array(count).fill(currentContainerWidth / count));
    const dragRefs = useRef(Array(count - 1).fill(null).map(() => ({ isDragging: false, startX: 0, startWidth: 0 })));

    const handleRowMouseDown = (index, e) => {
        dragRefs.current[index] = { isDragging: true, startX: e.clientX, startWidth: panelWidths[index] };
    };

    const handleRowMouseMove = (e) => {
        const updatedWidths = [...panelWidths];
        dragRefs.current.forEach((ref, index) => {
            if (ref.isDragging) {
                const deltaX = e.clientX - ref.startX;
                const newWidth = ref.startWidth + deltaX;

                if (newWidth > 10 && (currentContainerWidth - newWidth) > 10) {
                    updatedWidths[index] = newWidth;
                    updatedWidths[index + 1] = currentContainerWidth - updatedWidths.slice(0, index + 1).reduce((a, b) => a + b, 0);
                }
            }
        });
        setPanelWidths(updatedWidths);
    };

    const handleRowMouseUp = () => {
        dragRefs.current.forEach(ref => ref.isDragging = false);
    };

    useEffect(() => {
        const defaultWidth = currentContainerWidth / count;
        setPanelWidths(Array(count).fill(defaultWidth));
    }, [activeSpace, currentContainerWidth, count]);

    if (isMobile && apps.length > 1) {
        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: currentContainerWidth,
                    height: currentContainerHeight,
                    overflow: 'auto',
                    userSelect: 'none',
                    position: 'relative',
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div
                    key={apps[0]?.id}
                    style={{
                        height: topHeight,
                        overflow: 'auto',
                        padding: '0px',
                        borderRadius: '12px', overflow: 'auto',
                    }}
                >
                    {apps[0]?.App}
                </div>

                <div
                    style={{
                        height: 4,
                        width: '100%',
                        cursor: 'row-resize',
                        // background: '',
                        touchAction: 'none',
                    }}
                    onMouseDown={handleHorizontalMouseDown}
                    onTouchStart={(e) => {
                        const touch = e.touches[0];
                        horizontalDragRef.current = {
                            isDragging: true,
                            startY: touch.clientY,
                            startTopHeight: topHeight,
                        };
                    }}
                />

                <div
                    key={apps[1]?.id}
                    style={{
                        flex: 1,
                        overflow: 'auto',
                        padding: '0px',
                        borderRadius: '12px', overflow: 'auto',
                    }}
                >
                    {apps[1]?.App}
                </div>
            </div>

        );
    }
    if (panelMode || screens.row) {
        return (
            <div
                style={{
                    display: 'flex',
                    width: currentContainerWidth,
                    height: currentContainerHeight,
                    overflow: 'auto',
                    userSelect: 'none',
                    position: 'relative'
                }}
                onMouseMove={handleRowMouseMove}
                onMouseUp={handleRowMouseUp}
            >
                {apps.map(({ App, minWidth }, index) => (
                    <>
                        <div className="scroller" style={{ width: panelWidths[index], padding: '0px', minWidth: minWidth || '100px', overflow: 'auto', borderRadius: '12px', overflow: 'auto' }}>
                            {App}
                        </div>
                        {index < apps.length - 1 && (
                            <div
                                style={{
                                    width: 4,
                                    cursor: 'col-resize',
                                    // background: '',
                                    zIndex: 1
                                }}
                                onMouseDown={(e) => handleRowMouseDown(index, e)}
                            />
                        )}
                    </>
                ))}
            </div>
        );
    } else if (count === 2) {
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
                <div className="scroller" key={apps[0]?.id} style={{ width: leftWidth, height: '100%', overflow: 'auto', padding: '0px', borderRadius: '12px', overflow: 'auto' }}>
                    <div style={{ height: '100%', width: '100%', }}>
                        {apps[0]?.App}
                    </div>
                </div>
                <div
                    style={{ width: 4, cursor: 'col-resize', background: '' }}
                    onMouseDown={handleVerticalMouseDown}
                />
                <div className="scroller" key={apps[1]?.id} style={{ flex: 1, height: '100%', overflow: 'auto', padding: '0px', minWidth: '370px', borderRadius: '12px', overflow: 'auto' }}>
                    <div style={{ height: '100%', width: '100%', }}>
                        {apps[1]?.App}
                    </div>
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
                <div className="scroller" key={apps[0]?.id} style={{ width: leftWidth, height: '100%', overflow: 'auto', padding: '0px', borderRadius: '12px', overflow: 'auto' }}>
                    <div style={{ height: '100%', width: '100%', }}>
                        {apps[0]?.App}
                    </div>
                </div>
                <div
                    style={{ width: 4, cursor: 'col-resize', background: '' }}
                    onMouseDown={handleVerticalMouseDown}
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: '370px', borderRadius: '12px', overflow: 'auto' }}>
                    <div className="scroller" key={apps[1]?.id} style={{ height: topHeight, overflow: 'auto', padding: '1px' }}>
                        <div style={{ height: topHeight, width: '100%', }}>
                            {apps[1]?.App}
                        </div>
                    </div>
                    <div
                        style={{ height: 4, cursor: 'row-resize', background: '' }}
                        onMouseDown={handleHorizontalMouseDown}
                    />
                    <div className="scroller" key={apps[2]?.id} style={{ flex: 1, overflow: 'auto', padding: '0px', borderRadius: '12px', overflow: 'auto' }}>
                        <div style={{ height: topHeight, width: '100%', }}>
                            {apps[2]?.App}
                        </div>
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
                <div className="scroller" key={apps[0]?.id} style={{ position: 'absolute', left: 0, top: 0, width: leftWidth, height: topHeight, overflow: 'auto', padding: '0px', borderRadius: '12px', overflow: 'auto' }}>
                    <div style={{ height: '100%', width: '100%', }}>
                        {apps[0]?.App}
                    </div>
                </div>

                <div className="scroller" key={apps[1]?.id} style={{ position: 'absolute', left: leftWidth + 4, top: 0, width: currentContainerWidth - leftWidth - 4, height: topHeight, overflow: 'auto', padding: '0px', minWidth: '370px', borderRadius: '12px', overflow: 'auto' }}>
                    <div style={{ height: '100%', width: '100%', }}>
                        {apps[1]?.App}
                    </div>
                </div>

                <div className="scroller" key={apps[2]?.id} style={{ position: 'absolute', left: 0, top: topHeight + 4, width: leftWidth, height: currentContainerHeight - topHeight - 4, overflow: 'auto', padding: '0px', borderRadius: '12px', overflow: 'auto' }}>
                    <div style={{ height: '100%', width: '100%', }}>
                        {apps[2]?.App}
                    </div>
                </div>

                <div className="scroller" key={apps[3]?.id} style={{ position: 'absolute', left: leftWidth + 4, top: topHeight + 4, width: currentContainerWidth - leftWidth - 4, height: currentContainerHeight - topHeight - 4, overflow: 'auto', padding: '0px', borderRadius: '12px', overflow: 'auto' }}>
                    <div style={{ height: '100%', width: '100%', }}>
                        {apps[4]?.App}
                    </div>
                </div>

                <div style={{ position: 'absolute', left: leftWidth, top: 0, width: 4, height: currentContainerHeight, cursor: 'col-resize', background: '' }} onMouseDown={handleVerticalMouseDown} />

                <div style={{ position: 'absolute', top: topHeight, left: 0, height: 4, width: currentContainerWidth, cursor: 'row-resize', background: '' }} onMouseDown={handleHorizontalMouseDown} />
            </div>
        );
    } else {
        return (
            <div className="scroller" style={{ width: currentContainerWidth, height: currentContainerHeight, overflow: 'auto', padding: '0px', borderRadius: '12px' }}>
                {apps.map(({ App, id }, index) => (
                    <div style={{ height: '100%', width: '100%', }} key={id}>{App}</div>
                ))}
            </div>
        );
    }
};



// scroll-indicator.js
export function installGlobalScrollerIndicator({ delay = 1000, root = document } = {}) {
    // one timeout per element, without preventing GC
    const timers = new WeakMap();

    const onScrollCapture = (e) => {
        const el = e.target;
        if (!(el instanceof Element)) return;
        if (!el.classList?.contains('scroller')) return;

        // show while scrolling
        el.classList.add('scroll');

        // reset per-element timer
        const old = timers.get(el);
        if (old) clearTimeout(old);

        const t = setTimeout(() => {
            el.classList.remove('scroll');
            timers.delete(el);
        }, delay);

        timers.set(el, t);
    };

    // use capture because 'scroll' doesn't bubble
    root.addEventListener('scroll', onScrollCapture, { capture: true, passive: true });

    // return a cleanup if you ever need to unmount
    return () => {
        root.removeEventListener('scroll', onScrollCapture, { capture: true });
        // best-effort clear
        timers.forEach((id, el) => clearTimeout(id));
    };
}


export { SplitApp, useDivSpliter };
