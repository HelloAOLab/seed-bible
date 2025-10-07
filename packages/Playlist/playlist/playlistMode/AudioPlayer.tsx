const { useState, useLayoutEffect, useRef } = os.appHooks;

const limitOfLines = 45;

const { LoaderSecondary } = Components;

const AudioPlayer = ({ mediaURL, secondaryClose, close = false }) => {
  const [loading, setLoading] = useState(true);
  const [isRecorded, setIsRecorded] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [blobMp3Data, setBlobMp3Data] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const dataFreq = useRef(
    new Array(limitOfLines).fill(0).map(() => Math.random() * 70 + 20)
  );
  const incrementCount = useRef(0);

  const setIncrementalCount = async () => {
    if (!mediaURL) return setLoading(false);
    try {
      const data = await web.get(mediaURL);
      const val = await thisBot.getAudioSeconds({ blob: data.data });
      setBlobMp3Data(data.data);
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
    await DataManager.cancelCurrentPlayingSound({ data: blobMp3Data });
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
        className="align-center"
        style={{ gap: "0.5rem", display: secondaryClose ? "flex" : "" }}
      >
        {isPlaying ? (
          <p className="mic-container">
            <span
              className="material-symbols-outlined unfollow icon"
              onClick={handleStopPlay}
            >
              stop
            </span>
          </p>
        ) : (
          <p className="mic-container">
            <span
              className="material-symbols-outlined unfollow icon"
              onClick={handlePlay}
            >
              play_arrow
            </span>
          </p>
        )}
        <div
          className={`oscillogram`}
          style={{
            flexGrow: secondaryClose ? 1 : "",
            width: secondaryClose ? "auto" : "90%",
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
            <div className="oscillogram play-overlay" style={{ padding: "0" }}>
              {dataFreq.current.map((_, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor:
                      i < playCount
                        ? globalThis.GetColor(i, dataFreq.current.length)
                        : "transparent",
                    height: `${_}%`,
                  }}
                  className={`bar static-bar`}
                ></div>
              ))}
            </div>
          )}
        </div>
        {close ? (
          !secondaryClose ? (
            <p className="mic-container">
              <span
                className="material-symbols-outlined unfollow icon"
                onClick={() => {
                  DataManager.cancelCurrentPlayingSound();
                  globalThis.SetMediaURL(null);
                }}
              >
                close
              </span>
            </p>
          ) : (
            <span
              style={{
                position: "absolute",
                top: "0rem",
                right: "1rem",
                color: "black",
              }}
              className="material-symbols-outlined unfollow icon"
              onClick={() => {
                DataManager.cancelCurrentPlayingSound();
                globalThis.SetMediaURL(null);
              }}
            >
              close
            </span>
          )
        ) : null}
        {secondaryClose && <div style={{ width: "2rem" }}></div>}
      </div>
    </>
  );
};

return AudioPlayer;
