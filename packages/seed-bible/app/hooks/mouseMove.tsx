// Float system with window on top and toolbar underneath
// Enhanced with slide-in/out functionality like iPhone
// + Mobile tweaks: center at top & keep toolbar visible

const { createContext, useContext, useState, useEffect, useRef } = os.appHooks;

const MyContext = createContext();

const MOBILE_QUERY = "(max-width: 768px)";
const isMobileNow = () =>
  (typeof window !== "undefined" &&
    window.matchMedia?.(MOBILE_QUERY)?.matches) ||
  false;

// Make the window 95% of viewport (and centered horizontally, near the top)
function computeMobilePlacement95() {
  const vw = Math.max(
    document.documentElement?.clientWidth || 0,
    window.innerWidth || 0
  );
  const vh = Math.max(
    document.documentElement?.clientHeight || 0,
    window.innerHeight || 0
  );

  const width = Math.round(vw * 0.95);
  const height = Math.round(vh - vh * 0.7);

  const x = Math.round((vw - width) / 2);
  const y = 12; // stick to top; change if you want centered: Math.round((vh - height) / 2)

  return { size: { width, height }, position: { x, y } };
}

export function MouseMoveProvider({ children }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [Element, setElement] = useState(null);
  const [showScreenPanelOption, setShowScreenPanelOption] = useState(false);
  const [isAbleToRightClick, setIsAbleToRightClick] = useState(false);
  const [floatingApps, setFloatingApps] = useState([]);
  const [slideIn, setSlideIn] = useState(false);
  const [hiddenApps, setHiddenApps] = useState([]);

  useEffect(() => {
    // safe if not defined
    globalThis.LocateCanvas?.();
  }, [floatingApps]);

  // expose your globals
  globalThis.SetElement = setElement;
  globalThis.SetIsDragging = setIsDragging;
  globalThis.isAbleToRightClick = isAbleToRightClick;

  // create
  globalThis.AddFloatingApp = (appConfig) => {
    const baseSize = appConfig.size || { width: 360, height: 240 };

    let initialSize = baseSize;
    let initialPos = appConfig.position || {
      x: 100 + floatingApps.length * 30,
      y: 100 + floatingApps.length * 30,
    };
    let autoCentered = false;

    if (isMobileNow()) {
      const mobile = computeMobilePlacement95();
      initialSize = mobile.size;
      initialPos = mobile.position;
      autoCentered = true;
    }

    const newApp = {
      id: Date.now() + Math.random(),
      App: appConfig.App,
      title: appConfig.title || "Floating App",
      position: initialPos,
      size: initialSize,
      minSize: appConfig.minSize || { width: 220, height: 160 },
      maxSize: appConfig.maxSize || { width: 1200, height: 900 },
      isMinimized: false,
      isDocked: false,
      isDragging: false,
      isResizing: false,
      isHidden: false,
      dragOffset: { x: 0, y: 0 },
      resizeHandle: null,
      // remember if we auto-centered for mobile so we can re-center on rotate
      __autoCenteredMobile: autoCentered,
    };

    setFloatingApps((prev) => [...prev, newApp]);
    return newApp.id;
  };

  // remove
  globalThis.RemoveFloatingApp = (appId) => {
    setFloatingApps((prev) => prev.filter((app) => app.id !== appId));
    setHiddenApps((prev) => prev.filter((app) => app.id !== appId));
    shout("onFloatingAppRemoved", {appId});
  };

  // update
  const updateFloatingApp = (appId, updates) => {
    setFloatingApps((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, ...updates } : app))
    );
  };

  // slide out (hide) app
  const slideOutApp = (appId) => {
    const app = floatingApps.find((a) => a.id === appId);
    if (app) {
      setHiddenApps((prev) => [...prev, app]);
      setFloatingApps((prev) => prev.filter((a) => a.id !== appId));
    }
  };

  // slide in (restore) app
  const slideInApp = (appId) => {
    const app = hiddenApps.find((a) => a.id === appId);
    if (app) {
      setFloatingApps((prev) => [...prev, app]);
      setHiddenApps((prev) => prev.filter((a) => a.id !== appId));
    }
  };

  // global mouse
  useEffect(() => {
    const handleMouseMove = (e) => {
      setFloatingApps((prev) =>
        prev.map((app) => {
          if (app.isDragging && !app.isDocked) {
            return {
              ...app,
              position: {
                x: e.clientX - app.dragOffset.x,
                y: e.clientY - app.dragOffset.y,
              },
            };
          }

          if (app.isResizing && !app.isDocked) {
            const rect = app.resizeStartBounds;
            const dx = e.clientX - app.resizeStartPos.x;
            const dy = e.clientY - app.resizeStartPos.y;

            let size = { ...app.size };
            let pos = { ...app.position };

            switch (app.resizeHandle) {
              case "se":
                size.width = Math.max(
                  app.minSize.width,
                  Math.min(app.maxSize.width, rect.width + dx)
                );
                size.height = Math.max(
                  app.minSize.height,
                  Math.min(app.maxSize.height, rect.height + dy)
                );
                break;
              case "sw":
                size.width = Math.max(
                  app.minSize.width,
                  Math.min(app.maxSize.width, rect.width - dx)
                );
                size.height = Math.max(
                  app.minSize.height,
                  Math.min(app.maxSize.height, rect.height + dy)
                );
                pos.x = rect.x + (rect.width - size.width);
                break;
              case "ne":
                size.width = Math.max(
                  app.minSize.width,
                  Math.min(app.maxSize.width, rect.width + dx)
                );
                size.height = Math.max(
                  app.minSize.height,
                  Math.min(app.maxSize.height, rect.height - dy)
                );
                pos.y = rect.y + (rect.height - size.height);
                break;
              case "nw":
                size.width = Math.max(
                  app.minSize.width,
                  Math.min(app.maxSize.width, rect.width - dx)
                );
                size.height = Math.max(
                  app.minSize.height,
                  Math.min(app.maxSize.height, rect.height - dy)
                );
                pos.x = rect.x + (rect.width - size.width);
                pos.y = rect.y + (rect.height - size.height);
                break;
              case "e":
                size.width = Math.max(
                  app.minSize.width,
                  Math.min(app.maxSize.width, rect.width + dx)
                );
                break;
              case "w":
                size.width = Math.max(
                  app.minSize.width,
                  Math.min(app.maxSize.width, rect.width - dx)
                );
                pos.x = rect.x + (rect.width - size.width);
                break;
              case "s":
                size.height = Math.max(
                  app.minSize.height,
                  Math.min(app.maxSize.height, rect.height + dy)
                );
                break;
              case "n":
                size.height = Math.max(
                  app.minSize.height,
                  Math.min(app.maxSize.height, rect.height - dy)
                );
                pos.y = rect.y + (rect.height - size.height);
                break;
            }

            return { ...app, size, position: pos };
          }

          return app;
        })
      );
    };

    const handleMouseUp = () => {
      setFloatingApps((prev) =>
        prev.map((app) => ({
          ...app,
          isDragging: false,
          isResizing: false,
          resizeHandle: null,
        }))
      );
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Re-center auto-centered mobile windows on rotate/resize
  useEffect(() => {
    const onResize = () => {
      if (!isMobileNow()) return;
      setFloatingApps((prev) =>
        prev.map((app) => {
          if (
            !app.__autoCenteredMobile ||
            app.isDragging ||
            app.isResizing ||
            app.isDocked
          )
            return app;
          const { size, position } = computeMobilePlacement95();
          return { ...app, size, position };
        })
      );
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // detect if any app is fullscreen
  const anyFullscreen = floatingApps.some((a) => a.isFullscreen);

  // exit all fullscreen apps (restores their prev size/position if available)
  const exitAnyFullscreen = () => {
    os.unregisterApp("exitButton");
    setFloatingApps((prev) =>
      prev.map((app) =>
        app.isFullscreen
          ? {
              ...app,
              isFullscreen: false,
              size: app.prevSize || app.size,
              position: app.prevPosition || app.position,
            }
          : app
      )
    );
  };

  // allow ESC to exit fullscreen
  useEffect(() => {
    if (!anyFullscreen) return;
    const onKey = (e) => {
      if (e.key === "Escape") exitAnyFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [anyFullscreen]);

  async function fullScreenButton(anyFullscreen) {
    try {
      if (!anyFullscreen) {
        await os.unregisterApp("exitButton");
        return;
      }
      await os.unregisterApp("exitButton");
      await os.registerApp("exitButton", thisBot);
      os.compileApp(
        "exitButton",
        <button
          onClick={exitAnyFullscreen}
          title="Exit full screen"
          aria-label="Exit full screen"
          style={{
            position: "fixed",
            top: 12,
            right: 12,
            zIndex: 999999,
            height: 40,
            padding: "0 16px",
            borderRadius: 999,
            border: "none",
            background: "rgba(0,0,0,0.7)",
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            backdropFilter: "blur(6px)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            close_fullscreen
          </span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            Exit Full Screen
          </span>
        </button>
      );
    } catch (e) {
      console.warn("Failed to manage exit button:", e);
    }
  }

  useEffect(() => {
    fullScreenButton(anyFullscreen);
  }, [anyFullscreen]);

  return (
    <MyContext.Provider
      value={{
        position,
        showScreenPanelOption,
        setShowScreenPanelOption,
        setPosition,
        setIsAbleToRightClick,
        isDragging,
        setIsDragging,
        Element,
        setElement,
        floatingApps,
        setFloatingApps,
        slideIn,
        setSlideIn,
        hiddenApps,
        slideOutApp,
        slideInApp,
      }}
    >
      {isDragging && (
        <div
          style={{
            position: "fixed",
            left: position.x,
            top: position.y,
            zIndex: 10000,
            pointerEvents: "none",
          }}
        >
          {Element?.App}
        </div>
      )}

      {floatingApps.map((app) => (
        <FloatingAppContainer
          key={app.id}
          app={app}
          slideIn={slideIn}
          setSlideIn={setSlideIn}
          updateFloatingApp={updateFloatingApp}
          slideOutApp={slideOutApp}
        />
      ))}

      {hiddenApps.length > 0 && (
        <div
          style={{
            position: "fixed",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 999998,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {hiddenApps.map((app) => (
            <button
              key={app.id}
              onClick={() => slideInApp(app.id)}
              title={`Restore ${app.title}`}
              style={{
                width: 25,
                height: 70,
                borderRadius: "12px 0 0 12px",
                border: "none",
                background: "rgba(0,0,0,0.8)",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(6px)",
                boxShadow: "-2px 0 10px rgba(0,0,0,0.3)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateX(-8px)";
                e.currentTarget.style.background = "rgba(0,0,0,0.9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateX(0)";
                e.currentTarget.style.background = "rgba(0,0,0,0.8)";
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 24 }}
              >
                chevron_left
              </span>
            </button>
          ))}
        </div>
      )}

      <div
        style={{
          width: "100%",
          height: "100%",
          pointerEvents: isAbleToRightClick ? "none" : "",
        }}
      >
        {children}
      </div>
    </MyContext.Provider>
  );
}

const FloatingAppContainer = ({
  app,
  updateFloatingApp,
  slideIn,
  setSlideIn,
  slideOutApp,
}) => {
  // visual constants to match the sketch
  const stroke = "rgba(255,255,255,0.85)";
  const radius = 16;
  const toolbarGap = 12;
  const toolbarH = 44;

  // per-window toolbar auto-hide state
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [forceVisable, setForceVisable] = useState(false);
  const hideDelayMs = 1000; // 1s
  const wrapRef = useRef(null);
  const hideTimerRef = useRef(null);

  // detect mobile
  const mobile =
    (typeof window !== "undefined" &&
      window.matchMedia?.(MOBILE_QUERY)?.matches) ||
    false;

  // keep toolbar visible / manage timers
  const kickVisibility = () => {
    if (mobile) {
      if (!toolbarVisible) setToolbarVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      return;
    }
    if (!toolbarVisible) setToolbarVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(
      () => !forceVisable && setToolbarVisible(false),
      hideDelayMs
    );
  };

  useEffect(() => {
    if (mobile) {
      // ensure visible, attach no timers/listeners on mobile
      setToolbarVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      return;
    }

    const wrapEl = wrapRef.current;
    if (!wrapEl) return;

    const onMove = () => kickVisibility();
    const onDown = () => kickVisibility();
    const onWheel = () => kickVisibility();
    const onTouch = () => kickVisibility();
    const onEnter = () => kickVisibility();

    wrapEl.addEventListener("mousemove", onMove);
    wrapEl.addEventListener("mousedown", onDown);
    wrapEl.addEventListener("wheel", onWheel, { passive: true });
    wrapEl.addEventListener("touchstart", onTouch, { passive: true });
    wrapEl.addEventListener("touchmove", onTouch, { passive: true });
    wrapEl.addEventListener("mouseenter", onEnter);

    const onKey = () => kickVisibility();
    window.addEventListener("keydown", onKey);

    // start initial countdown
    kickVisibility();

    return () => {
      wrapEl.removeEventListener("mousemove", onMove);
      wrapEl.removeEventListener("mousedown", onDown);
      wrapEl.removeEventListener("wheel", onWheel);
      wrapEl.removeEventListener("touchstart", onTouch);
      wrapEl.removeEventListener("touchmove", onTouch);
      wrapEl.removeEventListener("mouseenter", onEnter);
      window.removeEventListener("keydown", onKey);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [wrapRef, app.id, mobile]);

  // keep toolbar visible while dragging/resizing; re-hide after (desktop only)
  useEffect(() => {
    if (mobile) {
      setToolbarVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      return;
    }
    if (app.isDragging || app.isResizing) {
      setToolbarVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else {
      hideTimerRef.current = setTimeout(
        () => setToolbarVisible(false),
        hideDelayMs
      );
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [app.isDragging, app.isResizing, mobile]);

  const handleMouseDown = (e) => {
    // start drag only if not pressing controls/resize handles
    if (
      e.target.closest(".control-button") ||
      e.target.closest(".resize-handle")
    )
      return;

    const rect = e.currentTarget.getBoundingClientRect(); // wrapper rect
    updateFloatingApp(app.id, {
      isDragging: true,
      dragOffset: { x: e.clientX - rect.left, y: e.clientY - rect.top },
    });
  };

  useEffect(() => {
    setForceVisable(app.isMinimized);
    if (app.isMinimized) setToolbarVisible(true);
    kickVisibility();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.isMinimized]);

  const handleResizeStart = (handle, e) => {
    e.stopPropagation();
    updateFloatingApp(app.id, {
      isResizing: true,
      resizeHandle: handle,
      resizeStartPos: { x: e.clientX, y: e.clientY },
      resizeStartBounds: {
        x: app.position.x,
        y: app.position.y,
        width: app.size.width,
        height: app.size.height,
      },
    });
  };

  const handleMinimize = () => {
    updateFloatingApp(app.id, { isMinimized: !app.isMinimized });
  };

  const handleClose = () => {
    globalThis.RemoveFloatingApp(app.id);
  };

  const handleSlideOut = () => {
    slideOutApp(app.id);
  };

  const moveToPanel = () => {
    // optional: only if your host provides these globals
    if (
      typeof AddApplication === "function" &&
      typeof RemoveApplicationByID === "function"
    ) {
      const id = typeof uuid === "function" ? uuid() : `panel-${Date.now()}`;
      RemoveFloatingApp?.(app.id);
      AddApplication({
        id,
        App: (
          <PanelAppWrapper
            onReturnToFloat={() => {
              RemoveApplicationByID(id);
              AddFloatingApp(app);
            }}
            title={app.title}
            onClose={() => RemoveApplicationByID(id)}
          >
            {app.App}
          </PanelAppWrapper>
        ),
      });
    } else {
      // fallback: just minimize if panel infra is not present
      handleMinimize();
    }
  };

  // Clamp and adapt sizes/positions on mobile so the window is always visible
  let posX = app.position.x;
  let posY = app.position.y;
  let width = app.size.width;
  let height = app.size.height;

  if (mobile) {
    const margin = 12;
    const vw = Math.max(
      document.documentElement?.clientWidth || 0,
      window.innerWidth || 0
    );
    const vh = Math.max(
      document.documentElement?.clientHeight || 0,
      window.innerHeight || 0
    );

    width = Math.min(width, vw - margin * 2);
    height = Math.min(height, vh - margin * 2);

    posX = Math.min(Math.max(posX, margin), vw - margin - width);
    posY = Math.min(Math.max(posY, margin), vh - margin - height);
  }

  // sizes for layout: wrapper contains window (top) + toolbar (underneath)
  const wrapperStyle = {
    position: "fixed",
    left: `${posX}px`,
    top: `${posY}px`,
    width: `${width}px`,
    height: `${
      (app.isMinimized ? 0 : height) +
      (app.isDocked ? 0 : toolbarGap + toolbarH)
    }px`,
    zIndex: 1000,
    pointerEvents: "auto",
    transition: app.isDragging || app.isResizing ? "none" : "all 0.18s ease",
    cursor: app.isDragging ? "grabbing" : "default",
  };

  const windowStyle = {
    display: app.isMinimized ? "none" : "",
    position: "absolute",
    left: 0,
    top: 0,
    width: `${width}px`,
    height: `${app.isMinimized ? 0 : height}px`,
    borderRadius: `${radius}px`,
    boxShadow: `0 0 0 2px ${stroke}`,
    background: "rgba(17,17,17,0.75)",
    color: "#e5e7eb",
    overflow: "hidden",
    backdropFilter: "blur(6px)",
  };

  const contentStyle = {
    height: `calc(100%)`,
    display: app.isMinimized ? "none" : "block",
    overflow: "auto",
  };

  const toolbarStyle = {
    position: "absolute",
    top: `${(app.isMinimized ? 40 : height) + toolbarGap}px`,
    left: "50%",
    transform: "translateX(-50%)",
    width: `280px`,
    height: `${toolbarH}px`,
    borderRadius: 12,
    boxShadow: `0 0 0 2px ${stroke}`,
    background: "rgba(0, 0, 0, 0.65)",
    display: app.isDocked ? "none" : "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    // auto-hide bits (disabled on mobile)
    opacity: mobile ? 1 : toolbarVisible ? 1 : 0,
    pointerEvents: mobile ? "auto" : toolbarVisible ? "auto" : "none",
    transition: mobile ? "none" : "opacity 0.2s ease",
  };

  const pillBtn = {
    height: 30,
    minWidth: 30,
    padding: "0 12px",
    borderRadius: 999,
    border: "none",
    background: "transparent",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    cursor: "pointer",
    fontSize: 13,
  };

  const resizeHandleStyle = {
    position: "absolute",
    backgroundColor: "transparent",
    zIndex: 1001,
  };

  const ResizeHandle = ({ handle, style, cursor }) => (
    <div
      className="resize-handle"
      style={{ ...resizeHandleStyle, ...style, cursor }}
      onMouseDown={(e) => handleResizeStart(handle, e)}
    />
  );

  const handleFullscreen = () => {
    if (app.isFullscreen) {
      updateFloatingApp(app.id, {
        isFullscreen: false,
        size: app.prevSize || app.size,
        position: app.prevPosition || app.position,
      });
    } else {
      updateFloatingApp(app.id, {
        isFullscreen: true,
        prevSize: app.size,
        prevPosition: app.position,
        size: { width: window.innerWidth, height: window.innerHeight },
        position: { x: 0, y: 0 },
      });
    }
    setTimeout(() => {
      globalThis.LocateCanvas?.();
    }, 200);
  };

  const screen1 = () => {
    updateFloatingApp(app.id, {
      prevSize: app.size,
      prevPosition: app.position,
      size: { width: 525, height: 300 },
    });
  };

  const screen2 = () => {
    updateFloatingApp(app.id, {
      prevSize: app.size,
      prevPosition: app.position,
      size: { width: 350, height: 200 },
    });
  };

  return (
    <div
      className="floating-wrap"
      style={wrapperStyle}
      onMouseDown={handleMouseDown}
      ref={wrapRef}
    >
      <div className="floating-app" style={windowStyle}>
        <div style={contentStyle}>{app.App}</div>
        {!app.isDocked && !app.isMinimized && (
          <>
            <ResizeHandle
              handle="nw"
              style={{ top: -4, left: -4, width: 8, height: 8 }}
              cursor="nw-resize"
            />
            <ResizeHandle
              handle="ne"
              style={{ top: -4, right: -4, width: 8, height: 8 }}
              cursor="ne-resize"
            />
            <ResizeHandle
              handle="sw"
              style={{ bottom: -4, left: -4, width: 8, height: 8 }}
              cursor="sw-resize"
            />
            <ResizeHandle
              handle="se"
              style={{ bottom: -4, right: -4, width: 8, height: 8 }}
              cursor="se-resize"
            />
            <ResizeHandle
              handle="n"
              style={{ top: -4, left: 8, right: 8, height: 8 }}
              cursor="n-resize"
            />
            <ResizeHandle
              handle="s"
              style={{ bottom: -4, left: 8, right: 8, height: 8 }}
              cursor="s-resize"
            />
            <ResizeHandle
              handle="w"
              style={{ left: -4, top: 8, bottom: 8, width: 8 }}
              cursor="w-resize"
            />
            <ResizeHandle
              handle="e"
              style={{ right: -4, top: 8, bottom: 8, width: 8 }}
              cursor="e-resize"
            />
          </>
        )}
      </div>

      {!app.isDocked && (
        <div style={toolbarStyle}>
          <button
            onClick={screen2}
            style={pillBtn}
            title="Square"
            className="control-button"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 20 }}
            >
              rectangle
            </span>
          </button>

          <button
            onClick={screen1}
            style={pillBtn}
            title="Bring to front / Pop out"
            className="control-button"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 25 }}
            >
              rectangle
            </span>
          </button>

          <button
            onClick={() => handleFullscreen()}
            style={pillBtn}
            className="control-button"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 25 }}
            >
              fullscreen
            </span>
          </button>

          <button
            className="control-button"
            onClick={handleSlideOut}
            title="Hide to side panel"
            style={pillBtn}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 25 }}
            >
              chevron_right
            </span>
          </button>

          <button
            className="control-button"
            onClick={moveToPanel}
            title="Move to panel (or restore)"
            style={pillBtn}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 25 }}
            >
              dock_to_left
            </span>
          </button>

          {
            null /* <button
            className="control-button"
            onClick={handleMinimize}
            title={app.isMinimized ? "Restore" : "Minimize"}
            style={pillBtn}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 25 }}
            >
              {app.isMinimized ? "keyboard_arrow_up" : "keyboard_arrow_down"}
            </span>
          </button> */
          }

          <button
            className="control-button"
            onClick={handleClose}
            title="Close"
            style={{ ...pillBtn, outlineColor: "rgba(255,80,80,.9)" }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 25 }}
            >
              close
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

export function PanelAppWrapper({
  title = "App",
  onClose,
  onReturnToFloat,
  children,
}) {
  const headerStyle = {
    backgroundColor: "#f8f9fa",
    padding: "8px 12px",
    borderBottom: "1px solid #e9ecef",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    userSelect: "none",
  };

  const btn = {
    height: 28,
    minWidth: 28,
    padding: "0 8px",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    background: "#fff",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={headerStyle}>
        <h4 style={{ fontSize: 14, fontWeight: 600, color: "#333", margin: 0 }}>
          {title}
        </h4>
        <div style={{ display: "flex", gap: 6 }}>
          {onReturnToFloat && (
            <button
              className="control-button"
              style={btn}
              title="Return to floating window"
              onClick={onReturnToFloat}
            >
              <span className="material-symbols-outlined">open_in_new</span>
              <span style={{ fontSize: 12 }}>Return to Float</span>
            </button>
          )}
          {onClose && (
            <button
              className="control-button"
              style={{ ...btn, borderColor: "#ef4444", color: "#ef4444" }}
              title="Close"
              onClick={onClose}
            >
              <span className="material-symbols-outlined">close</span>
              <span style={{ fontSize: 12 }}>Close</span>
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>{children}</div>
    </div>
  );
}

export function useMouseMove() {
  return useContext(MyContext);
}
