const { useState, useEffect, useRef, useMemo } = os.appHooks;

const getColor = (index, total) => {
    const startColor = [255, 0, 127]; // Pink
    const endColor = [255, 165, 0]; // Orange

    const interpolate = (start, end, factor) =>
        Math.round(start + (end - start) * factor);

    const factor = index / (total - 1);
    const color = startColor.map((start, i) =>
        interpolate(start, endColor[i], factor)
    );

    return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
};

const limitOfLines = 45;

const RecordingVoiceUI = ({ data, setData }) => {

    const [isRecording, setIsRecording] = useState(false);
    const [isRecorded, setIsRecorded] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playCount, setPlayCount] = useState(0);
    const dataFreq = useRef([]);
    const incrementCount = useRef(0);

    useEffect(() => {
        (async () => {
            const val = await thisBot.getAudioSeconds({ blob: data });
            incrementCount.current = limitOfLines / Math.ceil(val);
        })();
    }, [data]);

    useEffect(() => {
        let timer = null;
        if (isPlaying) {
            if (playCount === 0) setPlayCount(p => p + incrementCount.current);
            timer = setTimeout(() => {
                if (playCount >= limitOfLines) {
                    setTimeout(() => {
                        setPlayCount(0);
                        setIsPlaying(false);
                    }, 1000);
                    return;
                }
                setPlayCount(p => p + incrementCount.current);
            }, 1000);
        }
        return () => {
            if (timer) {
                clearTimeout(timer);
            }
            if (isRecording) DataManager.endVoiceRecord();
        }
    }, [playCount, isPlaying]);


    const handleRecord = () => {
        setIsRecording(true);
        setIsRecorded(false);
        setIsPlaying(false);
        DataManager.recordVoice();
    };

    const handleStop = () => {
        setIsRecording(false);
        dataFreq.current = new Array(limitOfLines).fill(0).map(() => Math.random() * 70 + 20);
        setIsRecorded(true);
        DataManager.endVoiceRecord({ setData });
    };

    const handleStopPlay = () => {
        setIsPlaying(false);
        setPlayCount(0);
        DataManager.cancelCurrentPlayingSound();
    }

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
            <style>{thisBot.tags['RecordingVoiceUI.css']}</style>
            <div className="audio-recorder">
                <div className={`oscillogram ${(isRecording) ? 'active-recording' : ''}`}>
                    {(isRecording) && Array(limitOfLines).fill().map((_, i) => (
                        <div key={i} style={{ backgroundColor: getColor(i, limitOfLines), }} className={`bar ${i < 6 ? `bar-${i + 1}` : ''}`}></div>
                    ))}

                    {isRecorded &&
                        dataFreq.current.map((_, i) => (
                            <div key={i} style={{ height: `${_}%` }} className={`bar static-bar greyed`}></div>
                        ))
                    }

                    {isRecorded && <div className="oscillogram play-overlay">
                        {dataFreq.current.map((_, i) => (
                            <div key={i} style={{ backgroundColor: i < playCount ? getColor(i, dataFreq.current.length) : 'transparent', height: `${_}%` }} className={`bar static-bar`}></div>
                        ))
                        }
                    </div>
                    }

                </div>
                <div className="controls">
                    {!isRecording && !isRecorded && (
                        <p className='mic-container'>
                            <span className="material-symbols-outlined unfollow icon" onClick={handleRecord}>
                                mic
                            </span>
                        </p>
                    )}
                    {isRecording && (
                        <p className='mic-container'>
                            <span className="material-symbols-outlined unfollow icon" onClick={handleStop}>
                                stop
                            </span>
                        </p>
                    )}

                    {isRecorded && !isPlaying && (
                        <>
                            <p className='mic-container'>
                                <span className="material-symbols-outlined unfollow icon" onClick={handlePlay}>
                                    play_arrow
                                </span>
                            </p>
                            <p className='mic-container'>
                                <span className="material-symbols-outlined unfollow icon" onClick={handleReRecord}>
                                    replay
                                </span>
                            </p>
                        </>
                    )}
                    {isPlaying && (
                        <p className='mic-container'>
                            <span className="material-symbols-outlined unfollow icon" onClick={handleStopPlay}>
                                stop
                            </span>
                        </p>
                    )}
                </div>
            </div >
        </>
    );
};


return RecordingVoiceUI;



