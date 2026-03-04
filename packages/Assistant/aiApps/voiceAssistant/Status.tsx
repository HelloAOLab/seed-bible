const StatusIndicator = ({ start, connected, isAssistantSpeaking, setStart }) => {
    return (
        <>
            <button 
                onClick={() => { setStart(!start) }} 
                className={`ai-btn ${!start ? 'disconnected' : connected ? 'connected' : 'connecting'} ${isAssistantSpeaking ? "speaking" : ""}`}
            >
                <span className="material-symbols-outlined">
                    mic
                </span>
            </button>
            {!start ? <p>Disconnected</p> : connected ? <p> Connected</p> : <p> Connecting...</p>}
        </>
    );
};

export default StatusIndicator;