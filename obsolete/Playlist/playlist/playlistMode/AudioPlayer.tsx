const { useState, useLayoutEffect, useRef } = os.appHooks;

const limitOfLines = 45;

const G = globalThis as any;

const { LoaderSecondary } = G.Components;

const PlayIcon =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/219e9f9c02e51a49609923edd51fb72dfe7dec7b736ffc2b49a6bae28bac16ba.svg";
const StopIcon =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/677892ac61d44d3960e546c727201f33f68c7f344d0cfa5388fbbc25b13694cb.webp";
const ConvertSecondsToMinutesAndSeconds = (seconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
};

const AudioPlayer = (props: any) => {
  const {
    mediaURL,
    secondaryClose,
    close = false,
    style,
    fileName,
    shadow = false,
  } = props;
  const [loading, setLoading] = useState(true);
  const [isRecorded, setIsRecorded] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [blobMp3Data, setBlobMp3Data] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const dataFreq = useRef(
    new Array(limitOfLines).fill(0).map(() => Math.random() * 70 + 20)
  );
  const incrementCount = useRef(0);
  const currentSeconds = useRef(0);
  const audioLength = useRef(0);

  const setIncrementalCount = async () => {
    if (!mediaURL) return setLoading(false);
    try {
      const data = await web.get(mediaURL);
      const val = await thisBot.getAudioSeconds({ blob: data.data });
      setBlobMp3Data(data.data);
      audioLength.current = val;
      incrementCount.current = limitOfLines / Math.ceil(val);
      setIsRecorded(true);
      setLoading(false);
      setIsPlaying(true);
      await DataManager.playSound({ data: data.data });
    } catch (e) {
      ShowNotification({
        message: `Failed to fetch notification!`,
        severity: "error",
      });
      setIsRecorded(true);
      setLoading(false);
      setIsPlaying(true);
    }
  };

  useLayoutEffect(() => {
    setIncrementalCount();
  }, []);

  useLayoutEffect(() => {
    let timer = null;
    if (isPlaying) {
      if (playCount === 0) setPlayCount((p) => p + incrementCount.current);
      timer = setTimeout(() => {
        if (playCount >= limitOfLines) {
          setTimeout(() => {
            setPlayCount(0);
            setIsPlaying(false);
          }, 1000);
          return;
        }
        currentSeconds.current += 1;
        setPlayCount((p) => p + incrementCount.current);
      }, 1000);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [playCount, isPlaying]);

  const handleStopPlay = async () => {
    await DataManager.cancelCurrentPlayingSound();
    setIsPlaying(false);
    setPlayCount(0);
  };

  const handlePlay = async () => {
    await DataManager.playSound({ data: blobMp3Data });
    setPlayCount(0);
    setIsPlaying(true);
  };

  if (loading) {
    return (
      <div className="align-center" style={{ padding: "1rem", gap: "1rem" }}>
        <LoaderSecondary />
        <p>Fetching Audio</p>
      </div>
    );
  }

  return (
    <>
      <style>{thisBot.tags["RecordingVoiceUI.css"]}</style>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--pageBackground)",
          borderRadius: "6px",
          padding: "0.5rem",
          boxShadow: shadow ? "0px 0px 4px 3px #0000000D" : "",
          ...style,
        }}
      >
        <div
          className="align-center"
          style={{ gap: "0.5rem", justifyContent: "space-between" }}
        >
          {fileName && (
            <p style={{ margin: 0 }}>
              {G.GetTruncatedPlaylistLabel({ content: fileName }, 50)}
            </p>
          )}
          {close ? (
            !secondaryClose ? (
              <span
                className="material-symbols-outlined unfollow"
                onClick={() => {
                  DataManager.cancelCurrentPlayingSound();
                  G.SetMediaURL(null);
                }}
              >
                close
              </span>
            ) : (
              <span
                className="material-symbols-outlined unfollow"
                onClick={() => {
                  DataManager.cancelCurrentPlayingSound();
                  G.SetMediaURL(null);
                }}
              >
                close
              </span>
            )
          ) : null}
        </div>
        <div
          className="align-center"
          style={{
            gap: "0.5rem",
            display: secondaryClose ? "flex" : "",
          }}
        >
          {isPlaying ? (
            <p className="mic-container alter">
              <img
                style={{ height: "18px", width: "18px" }}
                className="img-icon"
                src={StopIcon}
                alt="stop"
                onClick={handleStopPlay}
              />
            </p>
          ) : (
            <p className="mic-container alter">
              <img
                className="img-icon"
                src={PlayIcon}
                alt="play"
                onClick={handlePlay}
              />
            </p>
          )}
          <div
            className={`oscillogram`}
            style={{
              flexGrow: secondaryClose ? 1 : "",
              width: secondaryClose ? "auto" : "90%",
              backgroundColor: "var(--pageBackground)",
            }}
          >
            {isRecorded &&
              dataFreq.current.map((_, i) => (
                <div
                  key={i}
                  style={{ height: `${_}%` }}
                  className={`bar static-bar greyed`}
                ></div>
              ))}

            {isRecorded && (
              <div
                className="oscillogram play-overlay"
                style={{ padding: "0" }}
              >
                {dataFreq.current.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      backgroundColor:
                        i < playCount
                          ? G.GetColor(i, dataFreq.current.length)
                          : "transparent",
                      height: `${_}%`,
                    }}
                    className={`bar static-bar`}
                  ></div>
                ))}
              </div>
            )}
          </div>
          <p style={{ fontSize: "12px", fontWeight: "500" }}>
            {ConvertSecondsToMinutesAndSeconds(
              Math.min(currentSeconds.current, audioLength.current)
            )}
            /{ConvertSecondsToMinutesAndSeconds(audioLength.current)}
          </p>

          {/* {secondaryClose && <div style={{ width: "2rem" }}></div>} */}
        </div>
      </div>
    </>
  );
};

return AudioPlayer;
