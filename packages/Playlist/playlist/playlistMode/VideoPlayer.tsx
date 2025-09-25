const { src, isYoutube, videoID, content } = that;
const { useRef, useState, useLayoutEffect } = os.appHooks

thisBot.CloseFloatingApp();

function VideoPlayerApp() {
    if (isYoutube) {
        return <iframe
            className="item-need-full-height"
            src={`${globalThis?.CONSTANTS.YT_PREFIX}/${videoID}`}
            style={{
                width: '100%',
                height: '100%',
                flexGrow: '1',
                marginBottom: '6px',
                borderRadius: '16px 16px 0 0',
                position: 'relative',
                zIndex: 1,
                border: 'none'
            }}
            title={content}
            allow="accelerometer;encrypted-media;gyroscope;"
        />
    }
    const videoRef = useRef(null);
    const seekRef = useRef(null);
    const [playing, setPlaying] = useState(true);
    const [progress, setProgress] = useState(0);
    const [volume, setVolume] = useState(1);
    const [showControls, setShowControls] = useState(true);
    const [isHovering, setIsHovering] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useLayoutEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateTime = () => {
            setProgress((video.currentTime / video.duration) * 100 || 0);
            setCurrentTime(video.currentTime);
            setDuration(video.duration);
        };

        const handleLoadedMetadata = () => {
            setDuration(video.duration);
        };

        video.addEventListener("timeupdate", updateTime);
        video.addEventListener("loadedmetadata", handleLoadedMetadata);

        return () => {
            video.removeEventListener("timeupdate", updateTime);
            video.removeEventListener("loadedmetadata", handleLoadedMetadata);
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

    const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const getVolumeIcon = () => {
        if (volume === 0) return "🔇";
        if (volume < 0.3) return "🔈";
        if (volume < 0.7) return "🔉";
        return "🔊";
    };

    return (
        <div
            className=""
            style={{
                width: "100%",
                height: "100%",
                borderRadius: "16px",
                background: "linear-gradient(145deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)",
                boxSizing: "border-box",
                color: "#fff",
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: `
                    0 25px 50px -12px rgba(0, 0, 0, 0.8),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1)
                `,
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            <div style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                flex: 1,
                borderRadius: '16px',
                overflow: 'hidden'
            }}>
                <video
                    autoPlay
                    ref={videoRef}
                    onClick={togglePlay}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        borderRadius: '16px',
                        cursor: 'pointer'
                    }}
                >
                    <source
                        src={src || "https://www.w3schools.com/html/mov_bbb.mp4"}
                        type="video/mp4"
                    />
                    Your browser does not support HTML video.
                </video>

                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        opacity: !playing || isHovering ? 1 : 0,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        zIndex: 10,
                        pointerEvents: !playing || isHovering ? 'auto' : 'none'
                    }}
                >
                    <button
                        onClick={togglePlay}
                        style={{
                            background: 'rgba(0, 0, 0, 0.6)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '50%',
                            width: '50px',
                            height: '50px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            color: '#fff'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(0, 0, 0, 0.6)';
                        }}
                    >
                        {playing ? <span class="material-symbols-outlined">pause</span> : <span class="material-symbols-outlined">play_arrow</span>}
                    </button>
                </div>

                <div
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'absolute',
                        bottom: 8,
                        left: 8,
                        right: 8,
                        padding: '8px',
                        opacity: isHovering || !playing ? 1 : 0,
                        transition: 'opacity 0.3s ease',
                        zIndex: 15
                    }}
                >
                    <div style={{
                        width: '100%',
                        height: '4px',
                        background: 'rgba(255, 255, 255, 0.3)',
                        borderRadius: '2px',
                        marginBottom: '8px',
                        position: 'relative',
                        cursor: 'pointer'
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            width: `${progress}%`,
                            background: '#fff',
                            borderRadius: '2px',
                            transition: 'width 0.1s ease'
                        }} />
                        <input
                            ref={seekRef}
                            type="range"
                            min="0"
                            max="100"
                            value={progress}
                            onChange={handleSeek}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                opacity: 0,
                                cursor: 'pointer',
                                margin: 0
                            }}
                        />
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px'
                    }}>
                        <button
                            onClick={togglePlay}
                            style={{
                                background: 'rgba(0, 0, 0, 0.5)',
                                border: 'none',
                                borderRadius: '4px',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#fff',
                                fontSize: '12px'
                            }}
                        >
                            {playing ? <span class="material-symbols-outlined">pause</span> : <span class="material-symbols-outlined">play_arrow</span>}
                        </button>

                        <div style={{
                            color: '#fff',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)'
                        }}>
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </div>

                        <div style={{ flex: 1 }} />

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <span style={{
                                fontSize: '12px',
                                filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8))'
                            }}>
                                {getVolumeIcon()}
                            </span>
                            <div style={{
                                position: 'relative',
                                width: '60px',
                                height: '4px',
                                background: 'rgba(255, 255, 255, 0.3)',
                                borderRadius: '2px'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    height: '100%',
                                    width: `${volume * 100}%`,
                                    background: '#fff',
                                    borderRadius: '2px',
                                    transition: 'width 0.1s ease'
                                }} />
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={volume}
                                    onChange={handleVolume}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        opacity: 0,
                                        cursor: 'pointer',
                                        margin: 0
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

globalThis.Previous_ID_Floading_App_PL = globalThis.AddFloatingApp({
    App: <VideoPlayerApp />,
    title: `Video Playlist`,
    position: { x: 200, y: 150 },
    size: { width: 500, height: 330 },
});