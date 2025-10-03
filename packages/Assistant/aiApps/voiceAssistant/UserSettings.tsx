import { AOIcon2 } from 'aiApps.voiceAssistant.icons';
const { useState, useEffect } = os.appHooks;

const UserSettings = ({ setMicActive, setSpeakerActive, setOpenSettings }) => {
    const [availableOptions, setAvailableOptions] = useState(["Profile", "AI"])

    useEffect(() => {
        setMicActive(false);
        setSpeakerActive(false);
    }, [])

    return <div class="card">

        <AOIcon2 />

        <h3 class="title">Choose an agent</h3>

        <div class="agents">
            <label class="agent">
                <div class="agent-info">
                    <span class="agent-name">Spruce</span>
                    <span class="agent-desc">History & world view</span>
                </div>
                <input type="radio" name="agent" checked />
            </label>

            <label class="agent">
                <div class="agent-info">
                    <span class="agent-name">Alim</span>
                    <span class="agent-desc">Muslim AI agent</span>
                </div>
                <input type="radio" name="agent" />
            </label>

            <label class="agent">
                <div class="agent-info">
                    <span class="agent-name">Isac</span>
                    <span class="agent-desc">Scientific Questions</span>
                </div>
                <input type="radio" name="agent" />
            </label>

            <label class="agent">
                <div class="agent-info">
                    <span class="agent-name">Isac</span>
                    <span class="agent-desc">Scientific Questions</span>
                </div>
                <input type="radio" name="agent" />
            </label>
        </div>

        <button onClick={() => setOpenSettings(false)} class="start-btn">Start Talking</button>
        <button onClick={() => setOpenSettings(false)} class="cancel-btn">Cancel</button>
    </div>

}

export default UserSettings;