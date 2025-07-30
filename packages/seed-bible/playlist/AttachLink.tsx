const { useState, useEffect } = os.appHooks;
import { MiniTextEditor } from 'app.components.smallEditor';
const { Input, Modal, Button, ButtonsCover, Select, LoaderSecondary } = Components;

const RecordingUI = await thisBot.RecordVoice();
const VideoRecordUI = await thisBot.VideoRecordUI();

const SEARCH_ADD_VALUE = 'search&Add';
const RECORDING_VALUE = 'voice-recording';

const EditorId = 'attachfile';

const OPTIONS = [
    // { value: "text", label: "Heading Text" },
    // { value: SEARCH_ADD_VALUE, label: "Search & Add Verse,Chapter" },
    { value: "iframe", label: "Iframe" },
    { value: "youtube", label: "Youtube" },
    { value: "Video", label: "Video" },
    // { value: RECORDING_VALUE, label: "Recording" },
    // { value: "aux", label: "AUX", disabled: true }
];

const getCurrentTime = () => new Date().toLocaleString();

const imageAssets = {
    RECORDING_1: 'https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/df7ee00a951b3e90b4900ef34614ef81955e8d78546e27ce96866568a84a8397.svg',
    RECORDING_2: 'https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/fdf358dbd1dd29dc066aed83eabc2ee236f614b6262805aec1bd8c52f4c1ff86.svg',
    TEXT_1: 'https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/9d32289fc2d6d8bc52f33bb04e8e3e490368d3ad652b3f1800d1c55a1601fd66.svg',
    TEXT_2: 'https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/5153d4da64769288dd467f8bc5da93629430e4a513e5cf2751bf2d69995c2146.svg',
    FILE_UPLOAD_1: 'https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/1a467bb85673e5e1d40cb75b0d192dcf5659c6e4b320d0a81da4b4f7be931e63.svg',
    FILE_UPLOAD_2: 'https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/9a45b936f440321f7d6003ed13af2b3444201256363adf03098a37afe1145872.svg',
    LINK_1: 'https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/95176265a3a33a0077c8b11b493470df3393acfc3ff5411c8fe45976d96be46d.svg',
    LINK_2: 'https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/45eef6b9ac4c1d5026e0f1504a35781346b51ca1b4714f6d903f719d5e28538c.svg',
    TAG_2: 'https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/e8f7765934892b13fbf42c5631352493e640a1d4f5be976f573924de88170114.svg',
    TAG_1: 'https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/f00d6b72f127d893e0d6748d516adb7288544f15b8941665e3acd34763a462fd.svg',
    SCRIPTURE_1: 'https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/da2d9dba674f36900266afe3f65edceaaa42ed00402d711e39ff645648f3ff5d.svg',
    SCRIPTURE_2: 'https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/1c1df4b1eccd9fc0933bdcf757b2ba6a6e0827b4b733244430a06fc0802f666b.svg',
    DATE_1: 'https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/730b18f252a5238b41697d1c2e486007d8d6dff322bded391897460612a35cd0.svg',
    DATE_2: 'https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/4a02da6a0faf99824fc61a09ec304f14d5bf496355f787bcba0868c1ca586353.png',
};

// <input
//     type="file"
//     value={files}
//     multiple={true}
//     onChange={(e) => {
//         console.log("DATA", e);
//     }}
// />

function SubComponent({ recordingType, setRecordingType, name, link, setLinkState, setLink, setName, mediaType, setLoading, setType, data, setData, type }) {
    switch (type) {
        case "TAG":
            return <div className="input-conainter-type" >
                <Input value={name} onChangeListener={setName} placeholder="Tag Name" />
            </div>;
        case "SCRIPTURE":
            return <div className="input-conainter-type" >
                <Input value={name} onChangeListener={setName} placeholder="Search & Add scripture" />
            </div>;
        case "RECORDING":
            return <div className="input-conainter-type">

                <div className="switch-tabs">
                    <div
                        onClick={() => {
                            if (globalThis.isRecording) {
                                return ShowNotification({ message: "Cannot Switch while recording!", severity: "error" });
                            }
                            setRecordingType('audio');
                        }}
                        className={`${recordingType === 'audio' ? "active" : ""}`}>
                        <span class="material-symbols-outlined">
                            mic
                        </span>
                        <p>Audio</p>
                    </div>
                    <div
                        onClick={() => {
                            if (globalThis.isRecording) {
                                return ShowNotification({ message: "Cannot Switch while recording!", severity: "error" });
                            }
                            setRecordingType('video');
                        }}
                        className={`${recordingType === 'video' ? "active" : ""}`}>
                        <span class="material-symbols-outlined">
                            videocam
                        </span>
                        <p>Video</p>
                    </div>
                </div>
                {
                    recordingType === "audio"
                        ?
                        <RecordingUI data={data} setData={setData} />
                        :
                        recordingType === 'video'
                            ?
                            <VideoRecordUI key="audio" data={data} setData={setData} />
                            :
                            <VideoRecordUI key="screen" data={data} isScreen={true} setData={setData} />
                }
                <Input value={name} onChangeListener={setName} placeholder="Eg: Mathew's Journey" />
            </div>;
        case "TEXT":
            return <div className="input-conainter-type" >
                <MiniTextEditor
                    id={EditorId}
                    initialHtml={name}
                    onChange={(html) => {
                        setName(html);
                    }}
                />
            </div>
        case "LINK":
            return <div className="input-conainter-type" style={{ padding: '1px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Input style={{ width: '100%' }} value={name} onChangeListener={setName} placeholder="Eg: Mathew's Journey" />
                <div style={{ width: '100%', display: 'flex', gap: '1rem' }}>
                    <Select sxSelect={{ width: '7rem' }} secondary value={mediaType} onChangeListener={(val) => { setLinkState({ isValid: false, type: val }); setType(val); }} name="Type:" options={OPTIONS} />
                    <Input style={{ marginBottom: '0', flexGrow: '1' }} value={link} onChangeListener={setLink} placeholder="Eg: https://www.youtube.com/watch?v=ALsluAKBZ-c" />
                </div>
            </div>
        case "FILE_UPLOAD":
            return <div className='FILE_UPLOAD'>
                <div
                    onClick={async () => {
                        setLoading(true);
                        const files = await os.showUploadFiles();
                        const file = files?.[0];

                        if (!file) {
                            setLoading(false);
                            return ShowNotification({ message: "No File Uploaded!", severity: "error" });
                        }

                        const filesPromises = [];

                        files.forEach((file: any) => {
                            filesPromises.push(os.recordFile(globalThis.RECORD_STOREKEY, file.data, {
                                name: file.name,
                                mimeType: file.mimeType
                            }));
                        });

                        try {
                            const failCount = 0;
                            const fileSave = await Promise.all(filesPromises);
                            const filesResult = [];

                            fileSave.forEach(({ success, url, existingFileUrl, errorCode }, index) => {
                                if (!success && errorCode !== 'file_already_exists') {
                                    failCount++;
                                    return;
                                }
                                filesResult.push({
                                    content: files[index].name,
                                    id: createUUID(),
                                    additionalInfo: {
                                        link: url || existingFileUrl,
                                        mimeType: files[index].mimeType,
                                        type: 'file',
                                        isValid: true,
                                    },
                                    type: "attachment-link",
                                });
                            });

                            if (filesResult.length > 0) setData(filesResult);

                            // Example for using one of the uploaded file URLs
                            // const url = fileSave[0]?.url || fileSave[0]?.existingFileUrl;
                            setLoading(false);

                            if (failCount > 0) {
                                return ShowNotification({ message: "Failed to upload some Files!", severity: "error" });
                            }
                            // setCustomIcon(url);
                        } catch (error) {
                            console.log(error);
                            setLoading(false);
                            ShowNotification({ message: "File upload failed!", severity: "error" });
                        }

                        // const url = fileSave.url || fileSave?.existingFileUrl;

                        // if (!url) {
                        //     return ShowNotification({ message: "Failed to upload File!", severity: "error" });
                        // }

                        // console.log(fileSave, "fileSave");
                        // console.log(url, "url");
                        // setCustomIcon(url);

                    }}
                >
                    <img src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/6c8e5fa8be9c6bd0786104e4819b401b4b345a7734a7ebffb5d5e606ee182b45.png" style={{ height: '46px' }} />
                    <p className='link'>Drag drop or Click to browse</p>
                    <p className='info-type'>Image, .pdf, doc, .AUX etc</p>
                </div>
            </div>
        default:
            return <p>Unkown Data Type</p>
    }
};

const tags = [
    "TEXT",
    "RECORDING",
    "FILE_UPLOAD",
    "LINK",
    "SCRIPTURE",
    "DATE",
    "TAG"
];

const SEND = "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/4ea21449283157dc402a9c58a247398287055da69fa10899c96ae97dcf1198fc.png";

const CLOSE = 'https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/eee3f1736645b937d137719cbaeecf14e983237f4bf1594e765d75c0e887fa1a.png';


const AttachLink = ({ onClose, canClose, onAddTags, massAdd, attachLink, isDate = false, onDateClick, isTags = false }) => {
    const [loading, setLoading] = useState(false);
    const [selectedType, setSelectedType] = useState(globalThis.isScreenRecording ? 'RECORDING' : 'TEXT')
    const [mediaType, setType] = useState("");
    const [data, setData] = useState(null);
    const [linkState, setLinkState] = useState(false);
    const [name, setName] = useState(globalThis.RawName || "");
    const [link, setLink] = useState("");

    // Audio or Video
    const [recordingType, setRecordingType] = useState(globalThis.isScreenRecording ? 'video' : 'audio');

    useEffect(() => {
        const results = validateUrl(link);
        if (!results.isValid) {
            return;
        }
        setType(results.type || 'text');
        setLinkState(results);
    }, [link]);

    useEffect(() => {
        if (!name && (!!link || !!data)) {
            let tempName = `${getCurrentTime()}`;
            switch (mediaType?.toLocaleLowerCase()) {
                case 'text':
                    tempName += '-heading';
                    break;
                case 'iframe':
                case 'youtube':
                case 'Video':
                    tempName = link;
                    break;
                case RECORDING_VALUE:
                    tempName += '-voice-Note';
                    break;
                case 'aux':
                    tempName += '-aux-file';
                    break;
                default:
                    break;
            }
            setName(tempName);
        }
    }, [mediaType, data]);

    const deleteFromList = (id) => {
        if (Array.isArray(data)) {
            setData(prev => prev.filter(ele => ele.id !== id));
        }
    }

    const onClickSend = async () => {
        if (!name.trim()) {
            return ShowNotification({ message: "Attachment Name missing!", severity: "error" });
        }

        if (selectedType === 'TAG') {
            if (onAddTags) {
                onAddTags([name]);
                setName('');
            }
            return;
        }

        if ((selectedType === 'RECORDING')) {
            if (!data) return ShowNotification({ message: "Record Someting to Save Recording!", severity: "error" });
            setData(null);
            setName('');
            setSelectedType("TEXT");
            setLink('');
            setLoading(true);

            let finalData = data;

            console.log("finalData", finalData);

            const fileSave = await os.recordFile(globalThis.RECORD_STOREKEY, finalData, {
                name: name,
                mimeType: finalData?.type || 'audio/webm'
            });

            const url = fileSave.url || fileSave?.existingFileUrl;

            setLoading(false);

            if (!url) {
                return ShowNotification({ message: "Failed to upload File!", severity: "error" });
            }

            return attachLink(name, url, { isValid: true, type: recordingType === 'audio' ? RECORDING_VALUE : 'video-recording' });

        }

        // if (!linkState.isValid && mediaType !== SEARCH_ADD_VALUE && mediaType !== RECORDING_VALUE && mediaType !== 'text') {
        //     return ShowNotification({ message: "Your link is not valid!", severity: "error" });
        // }

        if (selectedType === "FILE_UPLOAD") {
            if ((!Array.isArray(data) || data?.length < 1)) {
                return ShowNotification({ message: "No files uploaded!", severity: "error" });
            } else {
                setData(null);
                setName('');
                setSelectedType("TEXT");
                setLink('')
                massAdd(data);
                onClose();
                return;
            }
        }


        if (selectedType === "LINK") {
            const results = validateUrl(link);
            if (!results.isValid) {
                return ShowNotification({ message: "Invalid Link format!", severity: "error" });
            } else {
                setData(null);
                setName('');
                setSelectedType("TEXT");
                setLink('')
                attachLink(name, link, linkState.type ? linkState : { isValid: true, type: mediaType });
            }
        }

        if (selectedType === 'SCRIPTURE') {
            const allItems = thisBot.getSuggestedListItems({ searchText: name });
            setName('');
            massAdd(allItems);
            return;
        }

        if (selectedType === 'TEXT') {
            setData(null);
            setName('');
            setSelectedType("TEXT");
            setLink('');
            const isTempID = EditorId;
            globalThis[`${isTempID}ClearEditorContent`]();
            return attachLink(name, link, { isValid: true, type: 'text' });
        }
    }

    useEffect(() => {
        if (selectedType === 'TEXT') {
            globalThis.RawName = name;
        } else {
            globalThis.RawName = '';
        }
    }, [name, selectedType])

    return <div className='add-new-playlist'>
        <div className='container-render'>
            {loading
                &&
                <div className="loader-container">
                    <LoaderSecondary />
                </div>}

            <SubComponent
                link={link}
                setLink={setLink}
                setRecordingType={setRecordingType}
                recordingType={recordingType}
                data={data}
                setData={setData}
                setLinkState={setLinkState}
                name={name}
                setLoading={setLoading}
                setName={setName}
                mediaType={mediaType}
                setType={setType}
                type={selectedType}
            />
        </div>
        {Array.isArray(data) && data.map(ele => <div style={{
            padding: "1rem",
            border: '1px solid gray',
            margin: '0.5rem',
            borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyItems: 'space-between'
        }}>
            <div className="align-center" style={{ gap: '1rem' }}>
                <img src={getFileIconByMimeType(ele.additionalInfo.mimeType)} style={{ width: '18px' }} />
                <div className="align-center">
                    <p class="truncate-text">{ele.content}</p><p>.{getExtensionFromMimeType(ele.additionalInfo.mimeType)}</p>
                </div>
            </div>
            <p style={{ marginLeft: 'auto', cursor: 'pointer' }} onClick={() => deleteFromList(ele.id)} >
                <span class="material-symbols-outlined unfollow delete-icon">
                    delete
                </span>
            </p>
        </div>)}
        <div className="select_item_container">
            {tags.filter(ele => ele === "TAG" ? isTags : ele === 'DATE' ? isDate : true).map(ele => <div key={ele.id} onClick={() => { if (ele === "DATE" && !!onDateClick) { return onDateClick(); } setName(""); setSelectedType(ele); setData(null); }} className={`${ele === selectedType ? 'active' : ''} select_item_type`}>
                <img src={imageAssets[`${ele}${ele === selectedType ? '_2' : '_1'}`]} />
            </div>)}
            {canClose && <div onClick={onClose} style={{ marginLeft: 'auto' }} className={`active  select_item_type`}>
                <img src={CLOSE} />
            </div>}
            <div
                style={{ marginLeft: 'auto' }}
                className={`active  select_item_type`}
                onClick={onClickSend}
            >
                <img src={SEND} style={{ width: '20px' }} />
            </div>
        </div>
    </div >
}

return AttachLink;


// <div className="add-new-playlist alter" >
//         <p style={{ fontSize: '12px' }} ><b>Title:</b></p>
        // <Input value={name} onChangeListener={setName} placeholder="Eg: Mathew's Journey" />

//         <div style={{ padding: '1px 0', display: 'flex', alignItems: 'center' }}>
//             <Select sxSelect={{ width: '7rem' }} secondary value={mediaType} onChangeListener={(val) => { setLinkState({ isValid: false, type: val }); setType(val); }} name="Type:" options={OPTIONS} />
//             {mediaType !== SEARCH_ADD_VALUE && mediaType !== RECORDING_VALUE &&
//                 <Input style={{ marginBottom: '0', flexGrow: '1' }} value={link} onChangeListener={setLink} placeholder="Eg: https://www.youtube.com/watch?v=ALsluAKBZ-c" />
//             }
//         </div>
        // {mediaType === RECORDING_VALUE && <RecordingUI data={data} setData={setData} />}
//         <div className="attach-link-actions">
//             <Button onClick={onClose} secondaryAlt >
//                 Cancel
//             </Button>

//             <Button
//                 onClick={() => {


//                     if (!name.trim()) {
//                         return ShowNotification({ message: "Attachment Name missing!", severity: "error" });
//                     }

//                     if ((mediaType === RECORDING_VALUE && !data)) {
//                         return ShowNotification({ message: "Record Someting to Save Recording!", severity: "error" });
//                     }

//                     if (!linkState.isValid && mediaType !== SEARCH_ADD_VALUE && mediaType !== RECORDING_VALUE && mediaType !== 'text') {
//                         return ShowNotification({ message: "Your link is not valid!", severity: "error" });
//                     }

//                     if (mediaType === SEARCH_ADD_VALUE) {
//                         const allItems = thisBot.getSuggestedListItems({ searchText: name });

//                         massAdd(allItems);
//                         onClose();
//                         return;
//                     }

//                     attachLink(name, mediaType === RECORDING_VALUE ? data : link, linkState.type ? linkState : { isValid: true, type: mediaType });
//                 }}
//                 secondary
//             >
//                 Save To Playlist
//             </Button>
//         </div>
//     </div >