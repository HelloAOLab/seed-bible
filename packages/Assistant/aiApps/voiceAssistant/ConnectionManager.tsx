const { useEffect } = os.appHooks;
import HandleEvents from 'aiApps.voiceAssistant.HandleEvents'
function generateQuery(params) {
    let queryArray = [];
    for (let key in params) {
        if (params.hasOwnProperty(key)) {
            queryArray.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
        }
    }
    return queryArray.join('&');
}

// Function to attach query string to URL
function attachQueryToURL(url, params) {
    const queryString = generateQuery(params);
    return url + (url.includes('?') ? '&' : '?') + queryString;
}
const ConnectionManager = ({ start, setConnected, audioRef, pcRef, micRef }) => {

    const init = async () => {

        let params = {
            tools: JSON.stringify([...tags.toolsArr])
        }
        let queryUrl = "https://aolab-bible-api.netlify.app/api/ai/getEmpericalKey";
        queryUrl = attachQueryToURL(queryUrl, params);
        let response = await web.get(queryUrl);

        const EPHEMERAL_KEY = response.data.data.value;

        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        pc.ontrack = (event) => {
            audioRef.current.srcObject = event.streams[0];
            setTimeout(() => {
                globalThis.initAssistantSpeechMonitoring();
            }, 500)
        };

        const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
        mic.getTracks().forEach((t) => pc.addTrack(t, mic));
        micRef.current = mic;

        const dc = pc.createDataChannel("oai-events");

        dc.onmessage = (e) => {
            const data = JSON.parse(e.data);

            if (data.type === "response.function_call_arguments.done") {
                HandleEvents({ dc, data })
            }
        };

        globalThis.AIDataChannel = dc;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);


        const baseUrl = "https://api.openai.com/v1/realtime/calls";
        const model = "gpt-realtime";

        const resp = await web.post(
            `${baseUrl}?model=${model}`,
            offer.sdp,
            {
                headers: {
                    Authorization: `Bearer ${EPHEMERAL_KEY}`,
                    "Content-Type": "application/sdp",
                },
                transformRequest: [(data) => data]
            }
        );

        const answerSDP = { type: "answer", sdp: resp.data };
        await pc.setRemoteDescription(answerSDP);

        setConnected(true);

        setTimeout(() => {
            whisper(thisBot, "onBookChanged", { ...BibleData });
        }, 2000)
    }
    useEffect(() => {
        if (!start) return;

        init();

        return () => {
            if (pcRef.current) pcRef.current.close();
            console.log(micRef, "micref")
            micRef.current.getTracks().forEach(track => track.stop());
            setConnected(false);
            globalThis.AIDataChannel = null;
        };
    }, [start, setConnected, audioRef, pcRef, micRef]);

    return null;
};

export default ConnectionManager;