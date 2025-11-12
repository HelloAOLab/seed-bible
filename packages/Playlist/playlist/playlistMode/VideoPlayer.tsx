const { src, isYoutube, videoID, content } = that;
const { useRef, useState, useLayoutEffect } = os.appHooks;

thisBot.CloseFloatingApp();

const VideoPlayerApp = () => {
  const videoRef = useRef(null);
  const seekRef = useRef(null);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);

  useLayoutEffect(() => {
    const video = videoRef.current;

    const updateTime = () => {
      setProgress((video.currentTime / video.duration) * 100 || 0);
    };

    if (video) {
      video.addEventListener("timeupdate", updateTime);
    }
    return () => {
      if (video) {
        video.removeEventListener("timeupdate", updateTime);
      }
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const handleSeek = (e) => {
    if(!videoRef?.current) return;
    const video = videoRef.current;
    const newTime = (e.target.value / 100) * video.duration;
    video.currentTime = newTime;
    setProgress(e.target.value);
  };

  const handleVolume = (e) => {
    if(!videoRef.current) return;
    const newVol = e.target.value;
    videoRef.current.volume = newVol;
    setVolume(newVol);
  };

  const goFullscreen = () => {
    if(!videoRef?.current) return;
    const video = videoRef.current;
    if (video.requestFullscreen) video.requestFullscreen();
  };

  return (
    <div
      className=""
      style={{
        width: "auto",
        borderRadius: "16px",
        background: "#111",
        boxSizing: "border-box",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
      }}>
      {isYoutube ? (
        <iframe
          className="item-need-full-height"
          src={`${globalThis.CONSTANTS.YT_PREFIX}/${videoID}`}
          style={{
            width: "auto",
            flexGrow: "1",
            objectFit: "cover",
          }}
          title={content}
          allow="accelerometer;encrypted-media;gyroscope;"
        />
      ) : (
        <video
          autoPlay
          ref={videoRef}
          width="auto"
          height="auto"
          style={{
            flexGrow: "1",
            objectFit: "cover",
          }}>
          <source
            src={src || "https://www.w3schools.com/html/mov_bbb.mp4"}
            type="video/mp4"
          />
          Your browser does not support HTML video.
        </video>
      )}

      {!isYoutube && (
        <div
          onMouseDown={(e) => e.stopPropagation()} // block parent drag
          onClick={(e) => e.stopPropagation()} // block clicks bubbling
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "auto",
            alignItems: "center",
          }}>
          <button onClick={togglePlay}>{playing ? "⏸️" : "▶️"}</button>
          <input
            ref={seekRef}
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleSeek}
            style={{ flex: 1 }}
          />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolume}
          />
          <button onClick={goFullscreen}>⛶</button>
        </div>
      )}
    </div>
  );
}

globalThis.Previous_ID_Floading_App_PL = globalThis.AddFloatingApp({
  App: <VideoPlayerApp />,
  title: `Video Playlist`,
  position: { x: 200, y: 150 },
  size: { width: 500, height: 330 },
});
