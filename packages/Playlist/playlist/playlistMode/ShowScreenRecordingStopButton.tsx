const G = globalThis as any;
const { Button } = G.Components;
const { useState, useLayoutEffect, useRef } = os.appHooks;

const name = "ShowScreenRecordingStopButton";
const videoGIF =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/a06426963e6f35751bdc3e76b49527f24cf646ff1ca48aaec66db6ee483f3f1c.gif";
os.unregisterApp(name);
os.registerApp(name, thisBot);
G.StopVideoRecording = false;

const painterApp = getBot("system", "aiApps.painter");

const ShowScreenRecordingStopButton = () => {
  const [hidden, setHidden] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const [video, setVideo] = useState(!!that.video);

  const toggleVideo = () => {
    if (!video) {
      if (G.OpenVideoOverlay) G.OpenVideoOverlay();
    } else {
      if (G.CloseVideoOverlay) G.CloseVideoOverlay();
    }
    setVideo((p) => !p);
  };

  useLayoutEffect(() => {
    G.ToggleVideoLayout = toggleVideo;
    if (G.OpenVideoOverlay && !!that.video) G.OpenVideoOverlay();
    return () => {
      if (G.CloseVideoOverlay) G.CloseVideoOverlay();
    };
  }, []);

  const [position, setPosition] = useState({
    x: window.innerWidth / 2 - 90,
    y: 32,
  }); // px from top/left
  const draggingRef = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });
  const lastPosBeforeFullScreen = useRef({ x: 0, y: 0 });

  // ✅ Real-time drag handlers
  const handleMouseDown = (e: any) => {
    if (`${position.x}`.endsWith("w")) return;
    draggingRef.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    initialPos.current = { ...position };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: any) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPosition({
      x: initialPos.current.x + dx,
      y: initialPos.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    draggingRef.current = false;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  return hidden ? null : (
    <>
      <style>{thisBot.tags["ScreenRecording.css"]}</style>
      <div
        className="ScreenRecording"
        onMouseUp={handleMouseUp}
        onMouseDown={handleMouseDown}
        style={{
          top: `${position.y}${`${position.y}`.endsWith("h") ? "" : "px"}`,
          left: `${position.x}${`${position.x}`.endsWith("w") ? "" : "px"}`,
        }}
      >
        <span style={{ cursor: "grab" }} class="material-symbols-outlined">
          drag_indicator
        </span>
        {painterApp && (
          <span
            style={{ cursor: "pointer" }}
            onClick={() => {
              painterApp.togglePainter();
            }}
            class="material-symbols-outlined"
          >
            brush
          </span>
        )}
        <p>{t("youAreSharingYourScreen")}</p>
        <div
          src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/8c36b2ef970a1ddd51de47ff2157fc2d7746fcfbb2f02f8941018052d29dbb31.svg"
          className="pointer stop-recording align-center"
          onClick={() => {
            if (G.HandleStop) {
              G.HandleStop();
              return;
            }
            G.StopVideoRecording = true;
            // G.setTabPlaylist("create");
            thisBot.OpenSelf({ force: true });
          }}
        >
          <span class="material-symbols-outlined">cancel</span>
          <span>{t("stopRecording")}</span>
        </div>
        {!video && (
          <Button onClick={toggleVideo} secondary>
            {video ? t("turnOff") : t("turnOn")} {t("video")}
          </Button>
        )}
        <p
          className="hide"
          onClick={() => {
            setHidden(true);
          }}
        >
          {t("hide")}
        </p>
      </div>
    </>
  );
};

os.compileApp(name, <ShowScreenRecordingStopButton />);
