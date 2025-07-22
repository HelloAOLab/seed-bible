const { useState, useEffect } = os.appHooks;
const { Input, Modal, Button, ButtonsCover, Select } = Components;

const RecordingUI = await thisBot.RecordVoice();

const SEARCH_ADD_VALUE = 'search&Add';
const RECORDING_VALUE = 'voice-recording';

const OPTIONS = [
    { value: "text", label: "Heading Text" },
    { value: SEARCH_ADD_VALUE, label: "Search & Add Verse,Chapter" },
    { value: "iframe", label: "Iframe" },
    { value: "youtube", label: "Youtube" },
    { value: "Video", label: "Video" },
    { value: RECORDING_VALUE, label: "Recording" },
    { value: "aux", label: "AUX", disabled: true }
]

const AttachLink = ({ onClose, massAdd, attachLink }) => {
    const [mediaType, setType] = useState("");
    const [data, setData] = useState(null);
    const [linkState, setLinkState] = useState(false);
    const [name, setName] = useState("");
    const [link, setLink] = useState("");

    useEffect(() => {
        if (mediaType === SEARCH_ADD_VALUE) return;
        if (mediaType === RECORDING_VALUE) return;
        const results = validateUrl(link);
        if (!results.isValid && !!name.trim().length) {
            results.type = "text";
            results.isValid = true;
        }
        setType(results.type);
        setLinkState(results);
    }, [link, name]);

    return <div className="add-new-playlist alter" >
        <p style={{ fontSize: '12px' }} ><b>Title:</b></p>
        <Input value={name} onChangeListener={setName} placeholder="Eg: Mathew's Journey" />

        <div style={{ padding: '1px 0', display: 'flex', alignItems: 'center' }}>
            <Select sxSelect={{ width: '7rem' }} secondary value={mediaType} onChangeListener={(val) => { setLinkState({ isValid: false, type: val }); setType(val); }} name="Type:" options={OPTIONS} />
            {mediaType !== SEARCH_ADD_VALUE && mediaType !== RECORDING_VALUE &&
                <Input style={{ marginBottom: '0', flexGrow: '1' }} value={link} onChangeListener={setLink} placeholder="Eg: https://www.youtube.com/watch?v=ALsluAKBZ-c" />
            }
        </div>
        {mediaType === RECORDING_VALUE && <RecordingUI data={data} setData={setData} />}
        <div className="attach-link-actions">
            <Button onClick={onClose} secondaryAlt >
                Cancel
            </Button>

            <Button
                onClick={() => {


                    if (!name.trim()) {
                        return ShowNotification({ message: "Attachment Name missing!", severity: "error" });
                    }

                    if ((mediaType === RECORDING_VALUE && !data)) {
                        return ShowNotification({ message: "Record Someting to Save Recording!", severity: "error" });
                    }

                    if (!linkState.isValid && mediaType !== SEARCH_ADD_VALUE && mediaType !== RECORDING_VALUE) {
                        return ShowNotification({ message: "Your link is not valid!", severity: "error" });
                    }

                    if (mediaType === SEARCH_ADD_VALUE) {
                        const allItems = thisBot.getSuggestedListItems({ searchText: name });

                        massAdd(allItems);
                        onClose();
                        return;
                    }

                    attachLink(name, mediaType === RECORDING_VALUE ? data : link, linkState.type ? linkState : { isValid: true, type: mediaType });
                }}
                secondary
            >
                Save To Playlist
            </Button>
        </div>
    </div >

}

return AttachLink;