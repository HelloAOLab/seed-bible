const { useState, useEffect, useRef, useMemo } = os.appHooks;

const { Input, Modal, Button, Chips, Checkbox, ButtonsCover, Tooltip, Select } = Components;

globalThis.RECORD_STOREKEY = "vRK2.YW5ub3RhdGlvbnM=.TDVlSEZzRHdBWGw4UXloR2Fha3Zjdz09.subjectfull";

const predefinedColors = ['#FFFFFF', '#D9D9D9', '#D364338A', '#13998196', '#9B44F326', '#97B197'];
const predefinedIconsOptions = ['subscriptions', 'smart_display', 'video_library', 'slow_motion_video', 'play_lesson', 'auto_read_play'];

const Tabs = await thisBot.Tabs();

const tabsVals = ['Create Manually', 'Import'];
const importTabsVal = ['Google Sheet', 'JSON Format'];

const AddNewPlaylist = ({
    id,
    editId,
    parentId,
    link,
    setLink,
    setOpenModalName,
    checkNameDuplicate,
    startCreatingPlaylist,
    loading,
    setLoading,
    handleSheetUrl,
    name,
    setName,
    customColor,
    setCustomColor,
    selectedColor,
    setSelectedColor,
    selectedIcon,
    setSelectedIcon,
    description,
    setDescription,
    customIcon,
    setCustomIcon,
    selectedTags,
    setTags
}) => {

    const [activeTab, setActiveTab] = useState(tabsVals[0]);

    const [tagName, setTagName] = useState('');

    const [uploadedFileData, setUploadedFileData] = useState([]);

    const [importTab, setImportTab] = useState(importTabsVal[0]);

    const [isChecked, setIsChecked] = useState(false);

    const [predefinedIcons, setPredefinedIcons] = useState(globalThis.PREDEFINED_ICONS ? [...globalThis.PREDEFINED_ICONS] : [...predefinedIconsOptions]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    const handleImportTabChange = (tab) => {
        setUploadedFileData([]);
        setImportTab(tab);
    };

    const [informationModal, setInformationModal] = useState(false);

    const isActiveSheetImport = importTabsVal[0] === importTab;

    const onImport = async () => {
        if (editId) {
            thisBot.OnEditPlaylistName({
                parentId,
                id: editId,
                name,
                color: selectedColor,
                isCustomColor: customColor === selectedColor,
                icon: selectedIcon,
                description,
                selectedTags
            });
            setOpenModalName(false);
            return;
        }
        if (!checkNameDuplicate()) {
            setLoading(true);
            if (isActiveSheetImport) {
                try {
                    const dataRes = await handleSheetUrl(link);
                    if (dataRes === null) return setLoading(false);
                    startCreatingPlaylist(name, dataRes, id);
                    setOpenModalName(false);
                    setLoading(false);
                } catch (err) {
                    setLoading(false);
                }
            } else {
                if (uploadedFileData.length > 0) {
                    startCreatingPlaylist(name, uploadedFileData, id);
                    setUploadedFileData([]);
                    setOpenModalName(false);
                    setLoading(false);
                } else {
                    ShowNotification({ message: "Upload a File to Import Data!", severity: "error" });
                }
            }

        }
    }

    const onCreate = async () => {
        if (editId) {
            thisBot.OnEditPlaylistName({
                parentId,
                id: editId,
                name,
                color: selectedColor,
                isCustomColor: customColor === selectedColor,
                icon: selectedIcon,
                description,
                selectedTags
            });
            setOpenModalName(false);
            return;
        }


        if (isChecked) {
            if (!description) {
                return ShowNotification({ message: "Please fill description for auto generation!", severity: "error" });
            }
            setLoading(true);
            const { suggestedName, allItems } = await thisBot.buildPlaylistFromAI({ text: description });
            if (!name) setName(suggestedName);
            if (checkNameDuplicate(name || suggestedName)) {
                setLoading(false);
                return;
            }
            if (!allItems?.length) {
                setLoading(false);
                return ShowNotification({ message: "Couldn't auto find any items for the given description!", severity: "error" });
            }
            startCreatingPlaylist(name || suggestedName, allItems, id);
            setOpenModalName(false);
            setLoading(false);
            return;
        }
        startCreatingPlaylist(name, [], id);
        setOpenModalName(false);
    }

    const isActiveTabManual = () => tabsVals[0] === activeTab;

    const isButtomDisabled = () => {
        if (isChecked) return false;
        if (isActiveTabManual()) return !name?.trim();
        return !link.trim() && !name?.trim();
    }

    useEffect(() => {
        globalThis.PREDEFINED_ICONS = predefinedIcons;
        globalThis.setPredefinedIcons = setPredefinedIcons;
        savePlaylistProgress();
        return () => {
            globalThis.setPredefinedIcons = true;
        }
    }, [predefinedIcons]);


    return <>
        {informationModal && (
            <Modal showIcon={false} title="How to create Playlist from Google Spreadsheet" onClose={() => setInformationModal(false)}>
                {isActiveSheetImport ?
                    <>
                        <p style={{ fontSize: "12px" }}>
                            You can use <b>Google Spreadsheet</b> to create the Playlist Faster.
                        </p>
                        <br />
                        <p style={{ fontSize: "12px" }}>
                            You can either use{" "}
                            <a
                                href="chrome-extension://oemmndcbldboiebfnladdacbdfmadadm/https://www.bc.edu/content/dam/files/research_sites/cjl/pdf/Biblical%20Abbreviations_SBL%20Handbook.pdf"
                                target="_blank"
                                relrel="noreferrer"
                            >
                                <b>Abbreviations</b>
                            </a>
                            or Book name for the user case.
                            <br />
                            But make sure{" "}
                            <b>you spell them right.</b>
                            <br />
                        </ p>


                        <a
                            href="https://docs.google.com/spreadsheets/d/1VlBdswNKkxpkZ4y-s6eDG-3k3HHXCHJRPtvPMPGlPxw/edit?gid=0#gid=0"
                            target="_blank"
                            relrel="noreferrer"
                        >
                            See Sample List
                            <br />
                        </ a>
                        <p style={{ fontSize: "12px" }}>
                            <b> Remember to make your playlist public.</b>
                        </p>
                    </>
                    :
                    <>
                        <p style={{ fontSize: "12px" }}>
                            You can use <b>JSON File Format</b> to create the Playlist Faster.
                        </p>
                        <br />
                        <p style={{ fontSize: "12px" }}>
                            You can either use{" "}
                            <b>JSON File Format</b>
                            download from our app.
                        </ p>
                        <a
                            href="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/tedcasca/433b8ec62a5ecb249ca4dacdd4707b2186e598b4b74c1fb6e690c875bc48cf92.json"
                            target="_blank"
                            relrel="noreferrer"
                        >
                            See Sample JSON
                            <br />
                        </ a>
                        <p style={{ fontSize: "12px" }}>
                            <b> Remember to make JSON in given format.</b>
                        </p>
                    </>}

                <ButtonsCover>
                    <p> </p>
                    <Button
                        onClick={() => setInformationModal(false)}
                        secondaryAlt
                    >
                        Close
                    </Button>
                </ButtonsCover>
            </Modal>
        )}
        <div className="add-new-playlist">
            <h3>Create new playlist</h3>
            <p style={{ color: "#606060" }}>Create a playlist manually or import from your google sheet</p>

            <Tabs
                tabs={tabsVals.filter((_, i) => !editId ? true : i !== 1)}
                onTabChange={handleTabChange}
            />

            {isActiveTabManual() ?
                null
                :
                <>
                    <Tabs
                        tabs={importTabsVal.filter((_, i) => !editId ? true : i !== 1)}
                        onTabChange={handleImportTabChange}
                    />
                    <div className="flex-col" >
                        <h4>
                            IMPORT
                        </h4>
                        <p onClick={() => setInformationModal(true)} className="align-center f-10 pointer what-this">
                            <span style={{ marginRight: "4px" }} class="material-symbols-outlined unfollow">info</span> <p class="underline">What's this?</p>
                        </p>
                    </div>

                    {uploadedFileData.length ? (
                        <p className="success-info">
                            <span class="material-symbols-outlined unfollow">
                                cloud_done
                            </span>
                            <span> JSON Data Uploaded</span>
                        </p>
                    ) : null}

                    {isActiveSheetImport ? <Input
                        style={{ marginBottom: '0', marginBottom: '0.75rem' }}
                        value={link}
                        onChangeListener={setLink}
                        placeholder="e.g. https://docs.google.com/spreadsheets/abc"
                    /> :
                        <Button
                            style={{ marginBottom: '0.5rem' }}
                            onClick={async () => {
                                const files = await os.showUploadFiles();
                                const file = files[0];
                                try {
                                    if (file.mimeType === "application/json") {
                                        const playlistImportedData = await JSON.parse(file.data);
                                        const filterdArray = thisBot.filterOutValidItemFromJSON(playlistImportedData);
                                        if (filterdArray.length) {
                                            setUploadedFileData(filterdArray);
                                        } else {
                                            ShowNotification({ message: "No Valid JSON Found!", severity: "error" });
                                        }
                                    } else {
                                        return ShowNotification({ message: "Please Upload JSON format!", severity: "error" });
                                    }
                                } catch (err) {
                                    console.log("UPLOAED JSON ERROR", err);
                                    ShowNotification({ message: "Unable to process the file!", severity: "error" });
                                }
                            }}
                            secondary
                        >
                            {uploadedFileData.length ? 'Re-' : ''}Upload File
                        </Button>
                    }
                </>
            }
            <h4>
                PLAYLIST NAME
            </h4>
            <Input
                value={name}
                onChangeListener={setName}
                placeholder="e.g. Mathew's Journey"
            />


            <h3 style={{ marginTop: '0.75rem' }}>Choose Color</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', padding: '0.5rem 0' }}>
                {predefinedColors.map((color, index) => (
                    <div
                        key={index}
                        style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: color,
                            border: selectedColor === color ? '2px solid black' : '2px solid #C8C3C3',
                            cursor: 'pointer',
                            borderRadius: '50%',
                            display: 'grid',
                            placeItems: 'center'
                        }}
                        onClick={() => setSelectedColor(color)}
                    >
                        {selectedColor === color && <span class="big-bold material-symbols-outlined unfollow color-inherit">
                            check
                        </span>}
                    </div>
                ))}
                <div
                    style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: customColor,
                        border: customColor === selectedColor ? '2px solid black' : '2px solid #D36433',
                        cursor: 'pointer',
                        borderRadius: '50%',
                        position: 'relative',
                        display: 'grid',
                        placeItems: 'center',
                    }}
                    onClick={() => setSelectedColor(customColor)}

                >
                    <input
                        onChange={(e) => {
                            setCustomColor(e.target.value);
                            setSelectedColor(e.target.value);
                        }}
                        value={customColor}
                        type="color"
                        style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', opacity: '0' }}
                    />
                    <span class="big-bold material-symbols-outlined unfollow color-inherit">
                        add
                    </span>
                </div>
            </div>
            <h3 >Choose Icon</h3>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap', padding: '0.5rem 0' }}>
                {predefinedIcons.map((icon, index) => {
                    const url = icon.startsWith("https");
                    return (
                        <div
                            key={index}
                            style={{
                                width: '40px',
                                height: '40px',
                                backgroundColor: "#fff",
                                border: selectedIcon === icon ? '2px solid black' : '2px solid #C8C3C3',
                                cursor: 'pointer',
                                display: 'grid',
                                placeItems: 'center',
                                borderRadius: '50%',
                            }}
                            onClick={() => setSelectedIcon(icon)}
                        >
                            {!url ? <span class="big-bold material-symbols-outlined unfollow color-inherit">
                                {icon}
                            </span> :
                                <img
                                    src={icon}
                                    style={{
                                        width: "80%",
                                        borderRadius: '50%'
                                    }}
                                    class="big-bold material-symbols-outlined unfollow color-inherit"
                                />}
                        </div>
                    )
                })}
                <div
                    style={{
                        width: '40px',
                        height: '40px',
                        background: `url(${customIcon})`,
                        border: customIcon !== selectedIcon ? '2px solid rgb(200, 195, 195)' : '2px solid #D36433',
                        cursor: 'pointer',
                        borderRadius: '50%',
                        position: 'relative',
                        display: 'grid',
                        placeItems: 'center',
                    }}
                    onClick={() => setSelectedIcon(customIcon)}

                >
                    <div
                        onClick={async () => {
                            const files = await os.showUploadFiles();
                            const file = files?.[0];

                            if (!file) {
                                return ShowNotification({ message: "No File Uploaded!", severity: "error" });
                            }

                            if (!file?.mimeType.startsWith("image/")) {
                                return ShowNotification({ message: "Please Upload Image format!", severity: "error" });
                            }

                            const fileSave = await os.recordFile(globalThis.RECORD_STOREKEY, file.data, {
                                name: file.name
                            });

                            const url = fileSave.url || fileSave?.existingFileUrl;

                            if (!url) {
                                return ShowNotification({ message: "Failed to upload File!", severity: "error" });
                            }

                            // console.log(fileSave, "fileSave");
                            // console.log(url, "url");
                            // setCustomIcon(url);
                            setPredefinedIcons(prev => [...prev, url]);
                            setSelectedIcon(url);
                        }}
                        value=''
                        multiple="false"
                        type="image/*"
                        type="file"
                        style={{ position: 'absolute', borderRadius: '50%', top: '0', left: '0', width: '100%', height: '100%', opacity: '0' }}
                    />
                    <img
                        src={customIcon}
                        style={{
                            width: "80%",
                            borderRadius: '50%'
                        }}
                        class="big-bold material-symbols-outlined unfollow color-inherit"
                    />
                </div>
            </div>
            <h3>Description</h3>
            <div style={{ margin: '0.5rem 0' }}>
                <Input
                    style={{ marginBottom: '0' }}
                    type="textarea"
                    value={description}
                    onChangeListener={setDescription}
                    placeholder="Playlist name"
                />
            </div>
            {isActiveTabManual() && false && <div className="align-center">
                <Checkbox
                    style={{
                        height: '18px',
                        marginRight: '0.5rem'
                    }}
                    checked={isChecked}
                    small
                    onClick={(val) => {
                        setIsChecked(val);
                    }}
                />
                <p>Auto Generate Playlist By Description.</p>
            </div>}
            <h3>Tags</h3>
            <div className="align-center">
                <Input
                    style={{ marginBottom: '0', flexGrow: '1' }}
                    value={tagName}
                    name="tagName"
                    onChangeListener={setTagName}
                    placeholder="Tag Name"
                />
                <Button
                    onClick={() => {
                        const nameFinal = tagName.trim();
                        if (!nameFinal) {
                            return ShowNotification({ message: "Tag Name Missing!", severity: "error" });
                        }
                        if (!/^(?! )[A-Za-z0-9&-]+(?: [A-Za-z0-9&-]+)*$/.test(nameFinal)) {
                            return ShowNotification({ message: "Tag Can Only Consist of Number, Aplhabets, Spaces, -!", severity: "error" });
                        }
                        setTags(prev => {
                            const old = [...prev];
                            const index = old.findIndex(ele => ele === nameFinal);
                            if (index > -1) {
                                ShowNotification({ message: "Tag Already Present!", severity: "error" });
                            } else {
                                old.push(nameFinal);
                                setTagName("");
                            }
                            return old;
                        });
                    }}
                    secondary
                >
                    Add
                </Button>
            </div>
            <div className="align-center" style={{ flexWrap: 'wrap', margin: '0.5rem 0', gap: '0.5rem' }}>
                {selectedTags.map((ele, index) => <Chips
                    label={ele}
                    key={index}
                    onDelete={() => {
                        setTags(prev => {
                            const old = [...prev];
                            old.splice(index, 1);
                            return old;
                        })
                    }}
                />)}
            </div>
            <div className="add-playlist-actions">
                <Button
                    onClick={() => {
                        if (loading) {
                            return ShowNotification({ message: "Save in progress!", severity: "error" });
                        }
                        if (!name?.trim()) return ShowNotification({ message: "Enter Playlist Name!", severity: "error" });
                        if (!link.trim() && !isActiveTabManual() && isActiveSheetImport) return ShowNotification({ message: "Enter Link to Import Playlist!", severity: "error" });
                        if (!isActiveTabManual() && !isActiveSheetImport) {
                            if (uploadedFileData.length < 1) {
                                return ShowNotification({ message: "Upload a File to Import Data!", severity: "error" });
                            }
                        }
                        if (isActiveTabManual()) {
                            return onCreate();
                        }
                        onImport();
                    }}
                    secondary
                >
                    {loading ? 'Saving..' : isActiveTabManual() ? 'Save' : 'Import'}
                </Button>
                <Button
                    isDisabled={loading}
                    onClick={() => { setOpenModalName(false); }}
                    secondaryAlt
                >
                    Close
                </Button>
            </div>
        </div >
    </>
}


return AddNewPlaylist;