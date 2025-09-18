const { useState, useRef, useEffect } = os.appHooks


function NowBar() {
    const [apps, setApps] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [startY, setStartY] = useState(0);
    const [startDragIndex, setStartDragIndex] = useState(0);
    const cardRef = useRef(null);

    // Global function to add apps to NowBar
    useEffect(() => {
        globalThis.AddNowBarApp = (appComponent, appId = null) => {
            const id = appId || Date.now() + Math.random();
            const newApp = {
                id,
                component: appComponent
            };

            setApps(prevApps => {
                // Check if app with same ID already exists
                const existingIndex = prevApps.findIndex(app => app.id === id);
                if (existingIndex !== -1) {
                    // Update existing app
                    const updatedApps = [...prevApps];
                    updatedApps[existingIndex] = newApp;
                    return updatedApps;
                } else {
                    // Add new app
                    return [...prevApps, newApp];
                }
            });
        };

        // Global function to remove apps from NowBar
        globalThis.RemoveNowBarApp = (appId) => {
            setApps(prevApps => prevApps.filter(app => app.id !== appId));
            setCurrentIndex(prevIndex => {
                // Adjust current index if needed after removal
                const newAppsLength = apps.filter(app => app.id !== appId).length;
                return Math.min(prevIndex, Math.max(0, newAppsLength - 1));
            });
        };

        // Global function to clear all apps
        globalThis.ClearNowBarApps = () => {
            setApps([]);
            setCurrentIndex(0);
        };

        // Cleanup function
        return () => {
            delete globalThis.AddNowBarApp;
            delete globalThis.RemoveNowBarApp;
            delete globalThis.ClearNowBarApps;
        };
    }, [apps]);

    const handleStart = (clientY) => {
        setIsDragging(true);
        setStartY(clientY);
        setDragOffset(0);
        setStartDragIndex(currentIndex);
    };

    const handleMove = (clientY) => {
        if (!isDragging || !cardRef.current) return;

        const deltaY = startY - clientY; // Positive = swipe up, Negative = swipe down
        const cardHeight = cardRef.current.offsetHeight;

        // Limit drag offset to card height in both directions
        const clampedOffset = Math.max(-cardHeight, Math.min(cardHeight, deltaY));
        setDragOffset(clampedOffset);

        // Auto-swipe when reaching 100px threshold during drag
        if (Math.abs(clampedOffset) >= 100) {
            if (clampedOffset > 0 && currentIndex < apps.length - 1) {
                // Swipe up - move current app to end of stack
                const currentApp = apps[currentIndex];
                const newApps = [...apps.slice(0, currentIndex), ...apps.slice(currentIndex + 1), currentApp];
                setApps(newApps);
                setIsDragging(false);
                setDragOffset(0);
            } else if (clampedOffset < 0 && currentIndex > 0) {
                // Swipe down - move to previous app
                setCurrentIndex(prev => prev - 1);
                setIsDragging(false);
                setDragOffset(0);
            }
        }
    };

    const handleEnd = () => {
        if (!isDragging) return;

        setIsDragging(false);

        const threshold = 30; // Reduced threshold for easier swiping

        console.log('Drag ended:', { dragOffset, threshold, currentIndex }); // Debug log

        // Swipe up (positive dragOffset) - move current app to end
        if (dragOffset > threshold) {
            const currentApp = apps[currentIndex];
            const newApps = [...apps.slice(0, currentIndex), ...apps.slice(currentIndex + 1), currentApp];
            setApps(newApps);
        }
        // Swipe down (negative dragOffset) - go to previous app  
        else if (dragOffset < -threshold && currentIndex > 0) {
            console.log('Swiping to previous app');
            setCurrentIndex(prev => prev - 1);
        }

        setDragOffset(0);
    };

    // Mouse events
    const handleMouseDown = (e) => {
        e.preventDefault();
        handleStart(e.clientY);
    };

    const handleMouseMove = (e) => {
        handleMove(e.clientY);
    };

    const handleMouseUp = () => {
        handleEnd();
    };

    // Touch events
    const handleTouchStart = (e) => {
        handleStart(e.touches[0].clientY);
    };

    const handleTouchMove = (e) => {
        e.preventDefault();
        handleMove(e.touches[0].clientY);
    };

    const handleTouchEnd = () => {
        handleEnd();
    };

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, startY]);

    // Don't render if no apps
    if (apps.length === 0) {
        return null;
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: '85px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '400px',
            height: '150px'
        }}>
            {apps.map((app, index) => {
                const isVisible = index >= currentIndex;
                const stackIndex = index - currentIndex;

                if (!isVisible) return null;

                const isTopApp = index === currentIndex;
                const transform = isTopApp
                    ? `translateY(${-dragOffset}px) scale(${1 - Math.abs(dragOffset) * 0.0005})`
                    : `scale(${1 - stackIndex * 0.05})`;

                const opacity = isTopApp
                    ? Math.max(0.3, 1 - Math.abs(dragOffset) * 0.003)
                    : Math.max(0.3, 1 - stackIndex * 0.2);

                const zIndex = apps.length - stackIndex;

                return (
                    <div
                        key={app.id}
                        ref={isTopApp ? cardRef : null}
                        onMouseDown={isTopApp ? handleMouseDown : undefined}
                        onTouchStart={isTopApp ? handleTouchStart : undefined}
                        onTouchMove={isTopApp ? handleTouchMove : undefined}
                        onTouchEnd={isTopApp ? handleTouchEnd : undefined}
                        style={{
                            position: 'absolute',
                            bottom: '0',
                            left: '0',
                            width: '100%',
                            height: '100%',
                            borderRadius: '20px',
                            boxShadow: `0 ${5 + stackIndex * 2}px ${15 + stackIndex * 5}px rgba(0,0,0,0.2)`,
                            cursor: isTopApp ? (isDragging ? 'grabbing' : 'grab') : 'default',
                            transform,
                            opacity,
                            zIndex,
                            transition: isDragging ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
                            overflow: 'hidden',
                            userSelect: 'none',
                            touchAction: 'none'
                        }}
                    >
                        {app.component}
                    </div>
                );
            })}
        </div>
    );
}

export { NowBar }