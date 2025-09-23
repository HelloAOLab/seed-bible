const { src, isYoutube, videoID, content } = that;
const { useRef, useState, useEffect } = os.appHooks

function VideoPlayerApp() {
    const videoRef = useRef(null);
    const seekRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [volume, setVolume] = useState(1);

    useEffect(() => {
        const video = videoRef.current;

        const updateTime = () => {
            setProgress((video.currentTime / video.duration) * 100 || 0);
        };

        video.addEventListener("timeupdate", updateTime);
        return () => {
            video.removeEventListener("timeupdate", updateTime);
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
        const video = videoRef.current;
        const newTime = (e.target.value / 100) * video.duration;
        video.currentTime = newTime;
        setProgress(e.target.value);
    };

    const handleVolume = (e) => {
        const newVol = e.target.value;
        videoRef.current.volume = newVol;
        setVolume(newVol);
    };

    const goFullscreen = () => {
        const video = videoRef.current;
        if (video.requestFullscreen) video.requestFullscreen();
    };

    return (
        <div
            className=""
            style={{
                width: "100%",
                height: "100%",
                borderRadius: "16px",
                background: "#111",
                padding: "8px",
                boxSizing: "border-box",
                color: "#fff",
            }}
        >
            {isYoutube ? <iframe
                className="item-need-full-height"
                src={`${globalThis.CONSTANTS.YT_PREFIX}/${videoID}`}
                style={{ borderRadius: "16px", width: '100%', height: '100%' }}
                title={content}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope;"
                allowFullScreen
            /> : <video autoPlay ref={videoRef} width="100%" height="auto" style={{ maxHeight: 'calc(100% - 32px)' }}>
                <source
                    src={src || "https://www.w3schools.com/html/mov_bbb.mp4"}
                    type="video/mp4"
                />
                Your browser does not support HTML video.
            </video>}

            {!isYoutube && <div
                style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "6px",
                    alignItems: "center",
                }}
            >
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
            </div>}
        </div>
    );
}

globalThis.AddFloatingApp({
    App: <VideoPlayerApp />,
    title: `Video Playlist`,
    position: { x: 200, y: 150 },
    size: { width: 500, height: 330 },
});