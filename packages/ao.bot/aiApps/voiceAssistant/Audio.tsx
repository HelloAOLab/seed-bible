const { useRef, useEffect } = os.appHooks;

const AudioMonitor = ({ audioRef, isAssistantSpeaking, setIsAssistantSpeaking }) => {
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const monitoringIntervalRef = useRef(null);
    const silenceCounterRef = useRef(0);

    const initAssistantSpeechMonitoring = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContextRef.current = new AudioContext();

            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 2048;
            analyserRef.current.smoothingTimeConstant = 0.6;

            const stream = audioRef.current.srcObject;
            if (!stream) {
                console.log("No audio stream available");
                return;
            }

            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);

            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            let wasSpeaking = false;

            monitoringIntervalRef.current = setInterval(() => {
                if (!analyserRef.current || audioContextRef.current.state !== 'running') return;

                analyserRef.current.getByteFrequencyData(dataArray);

                let sum = 0;
                const speechBandStart = Math.floor(300 / (audioContextRef.current.sampleRate / analyserRef.current.frequencyBinCount));
                const speechBandEnd = Math.floor(3400 / (audioContextRef.current.sampleRate / analyserRef.current.frequencyBinCount));

                for (let i = speechBandStart; i < Math.min(speechBandEnd, dataArray.length); i++) {
                    sum += dataArray[i];
                }

                const average = sum / (speechBandEnd - speechBandStart);
                const speaking = average > 10;

                if (speaking) {
                    silenceCounterRef.current = 0;
                    if (!wasSpeaking) {
                        setIsAssistantSpeaking(true);
                        wasSpeaking = true;
                    }
                } else {
                    silenceCounterRef.current++;
                    if (wasSpeaking && silenceCounterRef.current > 3) {
                        setIsAssistantSpeaking(false);
                        wasSpeaking = false;
                    }
                }
            }, 100);
        } catch (error) {
            console.error("Error initializing speech monitoring:", error);
        }
    };

    const cleanupAudioMonitoring = () => {
        if (monitoringIntervalRef.current) {
            clearInterval(monitoringIntervalRef.current);
            monitoringIntervalRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }
        analyserRef.current = null;
        silenceCounterRef.current = 0;
        setIsAssistantSpeaking(false);
    };

    useEffect(() => {
        if (audioRef.current && audioRef.current.srcObject) {
            initAssistantSpeechMonitoring();
        }

        globalThis.initAssistantSpeechMonitoring = initAssistantSpeechMonitoring;
        
        return () => {
            globalThis.initAssistantSpeechMonitoring = null;
            cleanupAudioMonitoring();
        };
    }, [audioRef.current]);

    return <audio ref={audioRef} autoPlay onPlay={() => { console.log("playing") }} />;
};

export default AudioMonitor;