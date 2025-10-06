import { AOIcon2, Voice, Text, } from 'aiApps.voiceAssistant.icons';
const { useState, useEffect } = os.appHooks;

const UserSettings = ({ setMicActive, setSpeakerActive, setOpenSettings, currentAIConfig, setCurrentAIConfig }) => {

    const [availableAgents, setAgents] = useState([
        {
            Name: "GPT-5",
            Description: "The latest chatgpt 5 model",
            Modes: [Voice, Text],
            type: "webrtc"
        },
        {
            Name: "GPT-4",
            Description: "The latest chatgpt 4 model",
            Modes: [Voice, Text],
            type: "webrtc"
        },
        {
            Name: "Apologist AO AI",
            Description: "Apologist AI designed by AO",
            Modes: [Text],
            type: "stream",
            agent: "ao"
        },
        {
            Name: "Apologist Alim AI",
            Description: "Apologist AI for muslims",
            Modes: [Text],
            type: "stream",
            agent: "ao"
        },
    ])

    useEffect(() => {
        setMicActive(false);
        setSpeakerActive(false);
    }, [])

    return <div class="card">

        <AOIcon2 />

        <h3 class="title">Choose an agent</h3>
        <div class="agents">
            {
                availableAgents.map((agent, index) => {
                    return <label class="agent">
                        <div class="agent-info">
                            <div style={{ display: "flex", gap: "10px" }}>
                                <span class="agent-name">{agent.Name}</span>
                                <span>
                                    {
                                        agent.Modes.map(Mode => {
                                            return <Mode style={{ marginRight: "5px" }} />
                                        })
                                    }
                                </span>
                            </div>
                            <span class="agent-desc">{agent.Description}</span>
                        </div>
                        <input onChange={() => {setCurrentAIConfig({...agent})}} type="radio" name="agent" checked={currentAIConfig.Name === agent.Name} />
                    </label>
                })
            }
        </div>

        <button onClick={() => setOpenSettings(false)} class="start-btn">Start Talking</button>
        <button onClick={() => setOpenSettings(false)} class="cancel-btn">Cancel</button>
    </div>

}

export default UserSettings;