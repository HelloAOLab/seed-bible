const { useState, useLayoutEffect, useRef, useMemo } = os.appHooks;
const G = globalThis as any;
const limitOfLines = 45;

const RecordingVoiceUI = (props: any) => {
  const { data, setData } = props;
  const videoRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecorded, setIsRecorded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const dataFreq = useRef<any>([]);
  const incrementCount = useRef(0);

  G.isRecording = isRecording;

  useLayoutEffect(() => {
    (async () => {
      const val = await thisBot.getAudioSeconds({ blob: data });
      incrementCount.current = limitOfLines / Math.ceil(val);
    })();
  }, [data]);

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
      if (isRecording) DataManager.endVoiceRecord();
    };
  }, [playCount, isPlaying]);

  const handleRecord = async () => {
    setIsRecording(true);
    setIsRecorded(false);
    setIsPlaying(false);
    DataManager.recordVoice();
  };

  const handleStop = () => {
    setIsRecording(false);
    dataFreq.current = new Array(limitOfLines)
      .fill(0)
      .map(() => Math.random() * 70 + 20);
    setIsRecorded(true);
    DataManager.endVoiceRecord({ setData });
  };

  const handleStopPlay = () => {
    setIsPlaying(false);
    setPlayCount(0);
    DataManager.cancelCurrentPlayingSound();
  };

  G.HandleStopPlayVoice = handleStop;

  const handlePlay = async () => {
    await DataManager.playSound({ data });
    setPlayCount(0);
    setIsPlaying(true);
  };

  const handleReRecord = () => {
    setData(null);
    setIsRecorded(false);
    setIsPlaying(false);
  };

  return (
    <>
      <style>{thisBot.tags["RecordingVoiceUI.css"]}</style>
      <div className="media-recorder">
        <div className={`oscillogram ${isRecording ? "active-recording" : ""}`}>
          {isRecording &&
            Array(limitOfLines)
              .fill(0)
              .map((_: any, i: number) => (
                <div
                  key={i}
                  style={{ backgroundColor: G.GetColor(i, limitOfLines) }}
                  className={`bar ${i < 6 ? `bar-${i + 1}` : ""}`}
                ></div>
              ))}

          {isRecorded &&
            dataFreq.current.map((_: any, i: number) => (
              <div
                key={i}
                style={{ height: `${_}%` }}
                className={`bar static-bar greyed`}
              ></div>
            ))}

          {isRecorded && (
            <div className="oscillogram play-overlay">
              {dataFreq.current.map((_: any, i: number) => (
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
        <div className="controls">
          {!isRecording && !isRecorded && (
            <p className="mic-container">
              <span
                className="material-symbols-outlined unfollow icon"
                onClick={handleRecord}
              >
                mic
              </span>
            </p>
          )}
          {isRecording && (
            <p className="mic-container">
              <span
                className="material-symbols-outlined unfollow icon"
                onClick={handleStop}
              >
                stop
              </span>
            </p>
          )}

          {isRecorded && !isPlaying && (
            <>
              <p className="mic-container">
                <span
                  className="material-symbols-outlined unfollow icon"
                  onClick={handlePlay}
                >
                  play_arrow
                </span>
              </p>
              <p className="mic-container">
                <span
                  className="material-symbols-outlined unfollow icon"
                  onClick={handleReRecord}
                >
                  replay
                </span>
              </p>
            </>
          )}
          {isPlaying && (
            <p className="mic-container">
              <span
                className="material-symbols-outlined unfollow icon"
                onClick={handleStopPlay}
              >
                stop
              </span>
            </p>
          )}
        </div>
      </div>
    </>
  );
};

return RecordingVoiceUI;
