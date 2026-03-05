const { useState, useRef, useEffect } = os.appHooks;

function NowBar() {
  const [apps, setApps] = useState<
    (prevApps: never[]) => { id: number; component: any }[]
  >([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [startY, setStartY] = useState(0);
  const [startDragIndex, setStartDragIndex] = useState(0);
  const [extraHeight, setExtraHeight] = useState(0);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 400
  );
  const cardRef = useRef(null);

  // Track window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    globalThis.SetExtraHeight = setExtraHeight;

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      globalThis.SetExtraHeight = null;
    };
  }, []);

  // Global function to add apps to NowBar
  useEffect(() => {
    globalThis.AddNowBarApp = (appComponent, appId = null) => {
      const id = appId || Date.now() + Math.random();
      const newApp = {
        id,
        component: appComponent,
      };

      setApps((prevApps) => {
        // Check if app with same ID already exists
        const existingIndex = prevApps.findIndex((app) => app.id === id);
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
      setApps((prevApps) => prevApps.filter((app) => app.id !== appId));
      setCurrentIndex((prevIndex) => {
        // Adjust current index if needed after removal
        const newAppsLength = apps.filter((app) => app.id !== appId).length;
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

  // Responsive dimensions based on screen size
  const getDimensions = () => {
    const isMobile = windowWidth <= 768;
    const isTablet = windowWidth > 768 && windowWidth <= 1024;

    if (isMobile) {
      return {
        // width: Math.min(windowWidth - 32, 350), // 16px margin on each side
        width: windowWidth - 7.5 * 16,
        height: 150, // Proportional height with max
        bottom: windowWidth <= 480 ? "40px" : "100px", // Adjust for very small screens
        borderRadius: "16px",
      };
    } else if (isTablet) {
      return {
        width: 380,
        height: 140,
        bottom: "80px",
        borderRadius: "18px",
      };
    } else {
      return {
        width: 400,
        height: 150,
        bottom: "85px",
        borderRadius: "20px",
      };
    }
  };

  const dimensions = getDimensions();

  const handleStart = (clientY) => {
    if (apps.length === 1) return;
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

    // Adjust auto-swipe threshold based on screen size
    const autoSwipeThreshold = windowWidth <= 768 ? 60 : 100;

    // Auto-swipe when reaching threshold during drag
    if (Math.abs(clampedOffset) >= autoSwipeThreshold) {
      if (clampedOffset > 0 && currentIndex < apps.length - 1) {
        // Swipe up - move current app to end of stack
        const currentApp = apps[currentIndex];
        const newApps = [
          ...apps.slice(0, currentIndex),
          ...apps.slice(currentIndex + 1),
          currentApp,
        ];
        setApps(newApps);
        setIsDragging(false);
        setDragOffset(0);
      } else if (clampedOffset < 0 && currentIndex > 0) {
        // Swipe down - move to previous app
        setCurrentIndex((prev) => prev - 1);
        setIsDragging(false);
        setDragOffset(0);
      }
    }
  };

  const handleEnd = () => {
    if (!isDragging) return;

    setIsDragging(false);

    // Responsive threshold - smaller on mobile for easier swiping
    const threshold = windowWidth <= 768 ? 20 : 30;

    console.log("Drag ended:", { dragOffset, threshold, currentIndex }); // Debug log

    // Swipe up (positive dragOffset) - move current app to end
    if (dragOffset > threshold) {
      const currentApp = apps[currentIndex];
      const newApps = [
        ...apps.slice(0, currentIndex),
        ...apps.slice(currentIndex + 1),
        currentApp,
      ];
      setApps(newApps);
    }
    // Swipe down (negative dragOffset) - go to previous app
    else if (dragOffset < -threshold && currentIndex > 0) {
      console.log("Swiping to previous app");
      setCurrentIndex((prev) => prev - 1);
    }

    setDragOffset(0);
  };

  // Mouse events
  const handleMouseDown = (e) => {
    // We need to click input box inside here
    // e.preventDefault();
    handleStart(e.clientY);
  };

  const handleMouseMove = (e) => {
    e.preventDefault();
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
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, startY]);

  // Don't render if no apps
  if (apps.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: dimensions.bottom,
        left: "50%",
        transform: "translateX(-50%)",
        width: `${dimensions.width}px`,
        transition: "all 0.3s linear",
        // Shall be min height not exact height
        minHeight: `${dimensions.height + extraHeight}px`,
        zIndex: "999999",
        // Ensure it doesn't overflow on very small screens
        maxWidth: "95vw",
      }}
    >
      {apps.map((app, index) => {
        const isVisible = index >= currentIndex;
        const stackIndex = index - currentIndex;

        if (!isVisible) return null;

        const isTopApp = index === currentIndex;

        // Responsive scaling - less dramatic on mobile
        const baseScale = windowWidth <= 768 ? 0.03 : 0.05;
        const dragScale = windowWidth <= 768 ? 0.0003 : 0.0005;
        const opacityScale = windowWidth <= 768 ? 0.002 : 0.003;

        const transform = isTopApp
          ? `translateY(${-dragOffset}px) scale(${1 - Math.abs(dragOffset) * dragScale})`
          : `scale(${1 - stackIndex * baseScale})`;

        const opacity = isTopApp
          ? Math.max(0.3, 1 - Math.abs(dragOffset) * opacityScale)
          : Math.max(0.3, 1 - stackIndex * 0.2);

        const zIndex = apps.length - stackIndex;

        // Responsive shadow - smaller on mobile
        const shadowBlur =
          windowWidth <= 768
            ? `0 ${3 + stackIndex}px ${8 + stackIndex * 3}px rgba(0,0,0,0.2)`
            : `0 ${5 + stackIndex * 2}px ${15 + stackIndex * 5}px rgba(0,0,0,0.2)`;

        return (
          <div
            key={app.id}
            ref={isTopApp ? cardRef : null}
            onMouseDown={isTopApp ? handleMouseDown : undefined}
            onTouchStart={isTopApp ? handleTouchStart : undefined}
            onTouchMove={isTopApp ? handleTouchMove : undefined}
            onTouchEnd={isTopApp ? handleTouchEnd : undefined}
            style={{
              // We dont need absolute in this since we have upper parent fixed.
              // position: 'absolute',
              // bottom: '0',
              // left: '0',
              width: "100%",
              height: "100%",
              borderRadius: dimensions.borderRadius,
              boxShadow: shadowBlur,
              cursor: isTopApp ? (isDragging ? "grabbing" : "grab") : "default",
              transform,
              opacity,
              zIndex,
              transition: isDragging
                ? "none"
                : "transform 0.3s ease, opacity 0.3s ease",
              overflow: "hidden",
              userSelect: "none",
              touchAction: "none",
              // Prevent text selection on mobile
              WebkitUserSelect: "none",
              WebkitTouchCallout: "none",
              backgroundColor: "white",
            }}
          >
            {app.component}
          </div>
        );
      })}
    </div>
  );
}

export { NowBar };
