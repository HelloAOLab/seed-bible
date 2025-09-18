// type =  book/section/testament
// content = Name
// additionalInfo = rank, sectionRank, testamentRank
// number -> Index of chpater / verse / book

const { useState, useEffect, useRef, useMemo } = os.appHooks;
const { Input, Modal, Button, ButtonsCover, Checkbox, Tooltip, Select } = Components;

const ChecklistGIf = "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/90e85308635064b3d0fdaa9c220b8547a9467a10affe3cf22f06ad6b26fbf0a1.gif"

const PlaylistList = await thisBot.PlaylistList();
const AttachLink = await thisBot.AttachLink();
const AddNewPlaylist = await thisBot.AddNewPlaylist();
const VideoPlayer = await thisBot.VideoSmallScreen();
const AudioPlayer = await thisBot.AudioPlayer();
// const AttachmentLinkItem = thisBot.AttachmentLinkItem();


globalThis.DEFAULT_UPLOAD_ICON = "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/67bba604a31cc7e116124f92179d8fe06317fcf70a3c62f071dff529362ebc25.png";


const startCreatingPlaylist = (name, playlist = [], id) => {
    globalThis.HISTORYExploreMode = false;
    globalThis[`${id}creatingPlaylistName`] = name;
    globalThis[`${id}creatingPlaylist`] = true;
    // thisBot.showInfo(`Playlist Mode`);
    globalThis[`${id}SetCreatingPlaylist`](true, playlist);
};

const backToCreatePlaylist = (name, playlist = [], id) => {
    globalThis.HISTORYExploreMode = false;
    globalThis[`${id}creatingPlaylistName`] = name;
    globalThis[`${id}creatingPlaylist`] = false;
    globalThis[`${id}SetCreatingPlaylist`](false, playlist);
}

const handleSheetUrl = async (link) => {
    const response = await thisBot.getSheetDataAndFetch({ link });
    return response;
};

function getSortedDateFormats(selectedValue) {
    const DATE_FORMAT_OPTIONS = [
        { "label": "DD MMM", "value": "DD MMM" },    // Ex: 15 Jan
        { "label": "MM-DD-YYYY", "value": "MM-DD-YYYY" },
        { "label": "MM/DD/YYYY", "value": "MM/DD/YYYY" },
        { "label": "MMMM DD, YYYY", "value": "MMMM DD, YYYY" },
        { "label": "MMM DD, YYYY", "value": "MMM DD, YYYY" },
        { "label": "YYYY-MM-DD", "value": "YYYY-MM-DD" },
        { "label": "DD-MM-YYYY", "value": "DD-MM-YYYY" },
        { "label": "YYYY/MM/DD", "value": "YYYY/MM/DD" },
        { "label": "DD/MM/YYYY", "value": "DD/MM/YYYY" },
        { "label": "YYYY.MM.DD", "value": "YYYY.MM.DD" },
        { "label": "DD.MM.YYYY", "value": "DD.MM.YYYY" },
        { "label": "MM.DD.YYYY", "value": "MM.DD.YYYY" },
        { "label": "DD MMMM YYYY", "value": "DD MMMM YYYY" },
        { "label": "DD MMM YYYY", "value": "DD MMM YYYY" },
        { "label": "YYYYMMDD", "value": "YYYYMMDD" },
        { "label": "DDMMYYYY", "value": "DDMMYYYY" },
        { "label": "MMDDYYYY", "value": "MMDDYYYY" },
        { "label": "MMM - DD - YYYY", "value": "DEFAULT" },
        { "label": "MMMM DD", "value": "MMMM DD" },  // Ex: January 15
        { "label": "DD MMMM", "value": "DD MMMM" },  // Ex: 15 January
        { "label": "MMM DD", "value": "MMM DD" },    // Ex: Jan 15
    ];
    return [
        ...DATE_FORMAT_OPTIONS.filter(option => option.value === selectedValue),
        ...DATE_FORMAT_OPTIONS.filter(option => option.value !== selectedValue)
    ];
}

const PROMPT_OPTIONS = [
    { "label": "Prompt", "value": "prompt" },
    { "label": "System Prompt", "value": "system-prompt" },
];

const AI_OPTIONS = [
    { "value": "openai/gpt/o1-mini", "label": "OpenAI GPT-o1 Mini" },
    { "value": "openai/gpt/o3-mini", "label": "OpenAI GPT-o3 Mini" },
    { "value": "openai/gpt/4o-mini", "label": "OpenAI GPT-4o Mini" },
    { "value": "meta/llama3.1/405b", "label": "Meta LLaMA 3.1 405B" },
    { "value": "01ai/yi/large", "label": "01.AI Yi Large" },
    { "value": "xai/grok/2", "label": "xAI Grok 2" },
    { "value": "openai/gpt/4o", "label": "OpenAI GPT-4o" },
    { "value": "anthropic/claude3.5/sonnet", "label": "Anthropic Claude 3.5 Sonnet" },
    { "value": "anthropic/claude3.5/haiku", "label": "Anthropic Claude 3.5 Haiku" },
    { "value": "anthropic/claude3.7/sonnet", "label": "Anthropic Claude 3.7 Sonnet" },
    { "value": "apologist/aquinas/v4", "label": "Apologist Aquinas v4" },
    { "value": "mistral/mixtral/8x22b", "label": "Mistral Mixtral 8x22B" },
    { "value": "mistral/mixtral/8x7b", "label": "Mistral Mixtral 8x7B" },
    { "value": "mistral/small/24b", "label": "Mistral Small 24B" },
    { "value": "alibaba/qwen2.5/72b", "label": "Alibaba Qwen 2.5 72B" },
    { "value": "alibaba/qwen2.5/32b", "label": "Alibaba Qwen 2.5 32B" },
    { "value": "microsoft/wizardlm/8x22b", "label": "Microsoft WizardLM 8x22B" },
    { "value": "deepseek/deepseek/v3", "label": "DeepSeek v3" },
    { "value": "deepseek/deepseek/r1", "label": "DeepSeek R1" },
    { "value": "google/gemma/9b", "label": "Google Gemma 9B" },
    { "value": "meta/llama3.3/70b-specdec", "label": "Meta LLaMA 3.3 70B SpecDec" },
    { "value": "meta/llama3.3/70b-versatile", "label": "Meta LLaMA 3.3 70B Versatile" },
]


const Playlist = ({ id, query, selectedChip, isCreate, isLayers, playingPlaylist, creatingPlaylist, setCreatingPlaylist }) => {

    // Audio
    const [mediaURL, setMediaURL] = useState('');
    const [videoSrc, setVideoSrc] = useState(false);
    const [currentItem, setCurrentItem] = useState({});
    const [selectedAI, setSelectedAI] = useState('openai/gpt/4o-mini');

    globalThis.SetVideoSrc = setVideoSrc;
    globalThis.SetMediaURL = setMediaURL;
    globalThis.SetCurrentItem = setCurrentItem;

    const [showPlaylistSettings, setShowPlaylistSettings] = useState(false);
    const [showMoreOptions, setShowMoreOptions] = useState(false);

    const [itemSelected, setItemSelected] = useState(null);

    const { onSave, onClose } = thisBot.ControlButtons({ id });
    const [hasGenrated, setHasGenrated] = useState(false);
    const [selectedTags, setTags] = useState([]);
    const [selectPlaylist, setSelectPlaylist] = useState(false);

    const [checkListData, setChecklistData] = useState({});
    const [checkListEmbeded, setChecklistEmbeded] = useState({});
    const [checklistEnabled, setChecklistEnabled] = useState(false);
    const [embedding, setEmbedding] = useState(null);

    useEffect(() => {
        globalThis[`SetChecklistEnabled`] = setChecklistEnabled;
        return () => {
            globalThis[`SetChecklistEnabled`] = null;
        }
    }, [checklistEnabled])

    const [layers, setLayers] = useState(isLayers);

    const [searchText, setSearchText] = useState('');

    const creatingPlaylistRef = useRef(null);

    const [regenrateUI, setRegenrateUI] = useState(false);
    const [regenrationCommand, setRegenrationCommand] = useState("");

    const oldListRef = useRef([]);
    const hasOldRef = useRef(false);

    const [layersWarning, setLayersWarning] = useState(false);

    const [openAttachLink, setOpenAttachLink] = useState(false);
    const [attachment, setAttachment] = useState(globalThis[`${id}Attachments`] || null);
    const [openModal, setOpenModal] = useState(false);
    const [mergeMode, setMergeMode] = useState(false);
    const [renderAgain, setRenderAgain] = useState(0);

    const [checklist, setChecklist] = useState(false);
    const [readingPlan, setReadingPlan] = useState(false);
    const [currentFormat, setCurrentFormat] = useState('MM-DD-YYYY');

    const [currentPromptText, setCurrentPromptText] = useState('prompt');

    const [systemPrompt, setSystemPrompt] = useState(globalThis.SYSTEM_PROMPT || '');

    const isEdit = useRef(false);
    const [openModalName, setOpenModalName] = useState(false);

    const toggleOpenModalName = (val) => {
        setOpenModalName(val);
        if (globalThis.SetRenamingPlaylist) globalThis.SetRenamingPlaylist(val);
    }

    const [autoGenerateOn, setAutoGenerateOn] = useState(false);
    const [genDetails, setGenDetails] = useState('');

    const [loading, setLoading] = useState(false);

    const [name, setName] = useState(globalThis[`${id}creatingPlaylistName`] || "");
    const [link, setLink] = useState("");

    // Features
    const [publishAccess, setPublishAccess] = useState('public')
    const [customColor, setCustomColor] = useState("#D3643329");
    const [selectedColor, setSelectedColor] = useState('#D9D9D9');
    const [selectedIcon, setSelectedIcon] = useState(null);
    const [description, setDescription] = useState('');
    const [customIcon, setCustomIcon] = useState(null);

    const setEditModal = ({ id, color, isCustomColor, icon, name, description: des, isCustomIcon, selectedTags, isLayers }) => {
        setName(name);
        if (isCustomColor) setCustomColor(color);
        if (isCustomIcon) setCustomIcon(icon);
        setSelectedColor(color);
        setSelectedIcon(icon);
        setDescription(des);
        setTags(selectedTags || []);
        setLayers(isLayers);
        isEdit.current = id;
        // Make Async so happen at last
        setTimeout(() => {
            toggleOpenModalName(true);
        }, 10)
    }

    const [playLists, setPlayLists] = useState(globalThis[`${id}playlists`] || []);
    const [selectedPlaylist, setSelectedPlaylist] = useState({});

    const toggleSelectedPlaylist = (id, parentID) => {
        setSelectedPlaylist(prev => {
            const old = { ...prev };
            old[id] = old[id] ? false : (parentID || true);
            return old;
        })
    }

    const [playList, setPlaylist] = useState(globalThis[`${id}currentPlaylist`] || []);

    const editPlaylistData = (idRec, newValueContent, parentId = null, fullData = false) => {
        setPlaylist((prev) => {
            const old = [...prev];
            if (parentId) {
                const parentIdx = old.findIndex((e) => e.id === parentId);
                if (parentIdx > -1) {
                    const idx = old[parentIdx].additionalInfo.layers.findIndex((e) => e.id === idRec);
                    if (idx > -1) {
                        if (fullData) {
                            old[parentIdx].additionalInfo.layers[idx] = { ...newValueContent };
                        } else {
                            old[parentIdx].additionalInfo.layers[idx] = { ...old[parentIdx].additionalInfo.layers[idx], content: newValueContent };
                        }
                    }
                }
            } else {
                const idx = old.findIndex((e) => e.id === idRec);
                if (idx > -1) {
                    if (fullData) {
                        old[idx] = { ...newValueContent };
                    } else {
                        old[idx] = { ...old[idx], content: newValueContent };
                    }
                }
            }
            return old;
        });
    };



    const addDataToPlaylist = (data, isBulk = false, combineLast = false) => {
        if (isBulk) {
            setPlaylist((prev) => {
                const old = [...prev, ...data];
                return old;
            });
            return;
        }

        setPlaylist((prev) => {
            const old = [...prev];
            if (combineLast) old.pop();
            const lastData = old[old.length - 1];
            const isSame = objectComparator(data, lastData, ["content"]);
            if (!isSame) {
                old.push(data);
            } else {
                os.toast("Last item repeated!");
            }
            return old;
        });
    };

    const onSearchHit = async () => {

        const allItems = thisBot.getSuggestedListItems({ searchText });

        setSearchText("");
        setPlaylist((prev) => {
            const old = [...prev, ...allItems];
            return old;
        });
    }


    const resetPlayist = () => {
        setPlaylist([]);
        setLink("");
        setAttachment(null);
        setChecklist(false);
    };

    const addPlaylist = (data, id = false, subId = null) => {
        setPlayLists((p) => {
            const old = [...p];
            if (id) {
                if (subId) {
                    const subIndex = globalThis[`${id}playlists`].findIndex(
                        (pl) => pl.id === subId,
                    );
                    const index = globalThis[`${id}playlists`][subIndex].list.findIndex(
                        (pl) => pl.id === id,
                    );
                    if (data.list.length === 0 && !old[subIndex].list[index].attachment) {
                        old[subIndex].list[index].splice(index, 1);
                    } else {
                        old[subIndex].list[index] = data;
                    }
                } else {
                    const index = old.findIndex((pl) => pl.id === id);
                    if (data.list.length === 0 && !old[index].attachment) {
                        old.splice(index, 1);
                    } else {
                        old[index] = data;
                    }
                }
            } else {
                if (data.list.length === 0) return old;
                old.push(data);
            }
            return old;
        });
    };

    const deleteDataFromPlaylist = (index, pId) => {
        setPlaylist((prev) => {
            const isBulk = Array.isArray(index);
            const idMaps = {};
            let old = [...prev];
            if (pId) {
                const indexParent = old.findIndex(ele => ele.id === pId);
                if (indexParent > -1) {
                    old[indexParent].additionalInfo.layers.splice(index, 1);
                }
            } else if (isBulk) {
                index.forEach(ele => {
                    idMaps[ele] = true
                });
                old = old.filter(({ id }) => !idMaps[id]);
            } else {
                old.splice(index, 1);
            }
            return old;
        });
    };

    const deleteDateData = () => {
        setPlaylist((prev) => {
            let old = [...prev.filter(ele => ele.type !== 'date')];
            return old;
        });
    }

    const SetCreatingPlaylist = (value, list = []) => {
        const anyDate = list.findIndex(ele => ele.type === 'date') > -1;
        if (anyDate) {
            setReadingPlan(true);
        } else {
            setReadingPlan(false);
        }
        setCreatingPlaylist(value);
        setPlaylist(list);
    };

    useEffect(() => {
        globalThis.IS_PLAYLIST_ACTIVE = creatingPlaylist;
        globalThis.SET_SHOW_CHECK && globalThis.SET_SHOW_CHECK(creatingPlaylist);
        return () => {
            globalThis.SET_SHOW_CHECK && globalThis.SET_SHOW_CHECK(false);
        }
    }, [creatingPlaylist])

    // const toggleMarkAsRead = (playlistIndex, subPlaylistIndex = false) => {
    //     setPlayLists(prev => {
    //         const old = [...prev];
    //         if (subPlaylistIndex !== false) {
    //             old[subPlaylistIndex][playlistIndex].readAlready = !old[subPlaylistIndex][playlistIndex].readAlready;
    //         } else {
    //             old[playlistIndex].readAlready = !old[playlistIndex].readAlready;
    //         }
    //         return old;
    //     })
    // }

    useEffect(() => {
        globalThis[`${id}AddDataToPlaylist`] = addDataToPlaylist;
        globalThis[`${id}EditPlaylistData`] = editPlaylistData;
        globalThis[`${id}ResetPlaylist`] = resetPlayist;
        globalThis[`${id}SetCreatingPlaylist`] = SetCreatingPlaylist;
        globalThis[`${id}SetPlaylistName`] = setName;
        globalThis[`${id}AddPlaylist`] = addPlaylist;
        globalThis[`${id}creatingPlaylistName`] = name;
        globalThis[`${id}currentPlaylist`] = playList;
        if (globalThis.SetRenderMylist) globalThis.SetRenderMylist(playList);
        globalThis[`${id}playlists`] = playLists;
        globalThis[`${id}Attachments`] = attachment;
        globalThis[`${id}SetAttachments`] = setAttachment;
        globalThis[`${id}SetPlaylists`] = setPlayLists;
        globalThis[`${id}SetChecklist`] = setChecklist;
        globalThis[`${id}SetReadingPlan`] = setReadingPlan;
        globalThis[`${id}SetCurrentFormat`] = setCurrentFormat;
        globalThis[`${id}setCustomColor`] = setCustomColor;
        globalThis[`${id}setCustomIcon`] = setCustomIcon;
        globalThis[`${id}setSelectedColor`] = setSelectedColor;
        globalThis[`${id}setSelectedIcon`] = setSelectedIcon;
        globalThis[`${id}setDescription`] = setDescription;
        globalThis[`${id}setPublishAccess`] = setPublishAccess;
        globalThis[`setRenderAgain`] = setRenderAgain;
        setPlaylistLocale(playLists, id);
        globalThis[`setOpenAttachLink`] = setOpenAttachLink;
        globalThis[`SetEditModal`] = setEditModal;
        globalThis[`SetSelectPlaylist`] = setSelectPlaylist;
        globalThis[`${id}SetSelectedTags`] = setTags;
        globalThis[`${id}SetLayers`] = setLayers;
        return () => {
            globalThis[`${id}SetPlaylistName`] = null;
            globalThis[`${id}AddDataToPlaylist`] = null;
            globalThis[`${id}AddPlaylist`] = null;
            globalThis[`${id}SetChecklist`] = null;
            globalThis[`${id}SetPlaylists`] = null;
            globalThis[`${id}setPublishAccess`] = null;
            globalThis[`${id}setCustomColor`] = null;
            globalThis[`${id}setCustomIcon`] = null;
            globalThis[`${id}setSelectedColor`] = null;
            globalThis[`setOpenAttachLink`] = null;
            globalThis[`${id}setSelectedIcon`] = null;
            globalThis[`${id}setDescription`] = null;
            globalThis[`${id}SetCurrentFormat`] = null;
            globalThis[`${id}SetReadingPlan`] = null;
            globalThis[`SetSelectPlaylist`] = null;
        };
    }, [playList, name, playLists, attachment]);

    const checkNameDuplicate = (newName) => {
        const nameValue = (newName || name).trim();
        if (!nameValue) return ShowNotification({
            message: "Playlist Name not found!",
            severity: "error",
        });
        const names = playLists.map((ele) => ele.name);
        if (names.includes(nameValue) && !isEdit.current) {
            ShowNotification({
                message: "Playlist Name already present!",
                severity: "error",
            });
            return true;
        }
        return false;
    };

    const attachLink = (title, link, linkState) => {
        const dataItem = {
            content: title,
            additionalInfo: {
                link,
                ...linkState,
            },
            type: linkState.type === "text" ? "heading" : "attachment-link",
        };
        if (!!itemSelected) {
            setPlaylist(old => {
                const prev = [...old];
                const index = prev.findIndex(ele => ele.id === itemSelected);
                const targetVerse = prev[index];
                targetVerse.additionalInfo.layers = [{
                    id: createUUID(),
                    content: title,
                    additionalInfo: {
                        link,
                        ...linkState,
                    },
                    type: linkState.type === "text" ? "heading" : "attachment-link",
                },
                ...(targetVerse.additionalInfo.layers || [])
                ]
                prev[index] = targetVerse;
                return prev;
            });
            setTimeout(() => {
                globalThis[`${itemSelected}OpenToggle`](true);
            }, 300);
        } else {
            thisBot.tryAddDataToPlaylist({
                dataItem
            });

        }
        setOpenAttachLink(false);
    };

    const massAdd = (items) => {
        if (!!itemSelected) {
            setPlaylist(old => {
                const prev = [...old];
                const index = prev.findIndex(ele => ele.id === itemSelected);
                const targetVerse = prev[index];
                targetVerse.additionalInfo.layers = [...items, ...(targetVerse.additionalInfo.layers || [])]
                prev[index] = targetVerse;
                return prev;
            });
            setTimeout(() => {
                globalThis[`${itemSelected}OpenToggle`](true);
            }, 300);
        } else {
            items.forEach(item => {
                thisBot.tryAddDataToPlaylist({
                    dataItem: { ...item },
                });
            });
        };
        setOpenAttachLink(false);
    }

    const attachDate = () => {
        thisBot.onAddDate({
            onAttach: (date) => {
                setReadingPlan(true);
                thisBot.tryAddDataToPlaylist({
                    dataItem: {
                        content: FORMAT_DATE(date || new Date()),
                        additionalInfo: {
                            date: FORMAT_YYYY_MM_DD(date || new Date())
                        },
                        type: "date",
                    },
                });
                setOpenAttachLink(false);
            }
        })

    };


    useEffect(() => {
        if (!openModalName) {
            isEdit.current = false;
        }
        // if (creatingPlaylistRef.current) {
        //     setTimeout(() => { creatingPlaylistRef.current.focus(); }, 500);
        // }
    }, [
        // playList,
        openModalName]);

    const onBulkDelete = () => {
        setPlayLists(prev => {
            let old = [...prev];
            old = old.filter(prev => !selectedPlaylist[prev.id]);
            return old;
        });
        setSelectedPlaylist({});
    }

    const onBulkJsonDownload = () => {
        const listToDownload = [];
        playLists.forEach(({ list, id: playlistID }) => {
            if (!!selectedPlaylist[playlistID]) {
                list.forEach(ele => {
                    listToDownload.push({
                        ...ele,
                        id: createUUID()
                    })
                });
            };
        });

        const jsonStr = JSON.stringify(listToDownload, null, 2);
        os.download(jsonStr, `BulkPlaylist.json`);
        setSelectedPlaylist({});
    }

    const onBulkAddToCollection = () => {
        thisBot.PlaylistLinkModal({
            idsMap: selectedPlaylist
        })
    }

    const onRegenration = async () => {
        oldListRef.current = JSON.parse(JSON.stringify(playList));
        if (loading) {
            return ShowNotification({
                message: "Regenration in progress!",
                severity: "error",
            });
        }
        const oldData = JSON.stringify(playList);
        setLoading(true);

        try {
            const { allItems } = await thisBot.RegenratePlaylistWithNewCommand({ aiModal: selectedAI, oldData, command: regenrationCommand });
            setLoading(false);
            if (!allItems?.length) {
                ShowNotification({
                    message: "Unable to generate playlist.Please Try Again!",
                    severity: "error",
                });
                return;
            }
            hasOldRef.current = true;
            setPlaylist(allItems);
            setHasGenrated(true);
            setRegenrateUI(false);
        } catch (err) {
            setLoading(false);
            return ShowNotification({
                message: "Regenration in Failed!",
                severity: "error",
            });
        }
    }

    const onRevert = () => {
        hasOldRef.current = false;
        setPlaylist(oldListRef.current);
    }

    const editDataFromPlaylist = (receivedIds) => {
        let ids = [receivedIds];
        if (Array.isArray(receivedIds)) {
            ids = [...receivedIds];
        }

        setChecklistData(prev => {
            const old = { ...prev };
            ids.forEach(idEle => {
                if (old[idEle]) {
                    delete old[idEle];
                } else {
                    old[idEle] = true;
                }
            })

            return old;
        });
    }

    const onBulkDeleteItems = () => {
        setPlaylist(prev => {
            const old = prev.filter(ele => !checkListData[ele.id] && embedding !== ele.id);
            return old;
        });
        setChecklistData({});
        setEmbedding(null);
        setChecklistEmbeded({});
    }

    const onEmbedItems = () => {
        let embededItem = null;
        if (!embedding) return;

        playList.forEach(ele => {
            if (checkListData[ele.id] && ele.id !== embedding) {
                if (!!ele.additionalInfo?.layers?.length) {
                    embededItem = ele.content;
                }
            }
        });

        if (!!embededItem) {
            ShowNotification({
                message: `Cannot Embed the Embedded item! Content: ${embededItem}. Please remove it before embeding!`,
                severity: "error",
            });
            return;
        }
        setPlaylist(prev => {
            const oldItems = [];
            const newLayers = [];
            const old = [...prev];
            old.forEach(ele => {
                if (checkListData[ele.id]) {
                    newLayers.push({
                        ...ele
                    });
                };
                if (!checkListData[ele.id]) {
                    oldItems.push({
                        ...ele
                    });
                };
            });

            let embeddingItemsIndex = oldItems.findIndex(ele => ele.id === embedding);
            oldItems[embeddingItemsIndex] = {
                ...oldItems[embeddingItemsIndex],
                additionalInfo: {
                    ...oldItems[embeddingItemsIndex].additionalInfo,
                    layers: [...(oldItems[embeddingItemsIndex].additionalInfo.layers || []), ...newLayers]
                }
            };
            return oldItems;
        });
        setEmbedding(null);
        setChecklistData({});
    }

    const onDisembed = (ids, isDelete) => {
        let idtoDisembed = [ids];
        if (Array.isArray(ids)) {
            idtoDisembed = [...ids];
        }

        const idsMap = {};
        const pidsMap = {};

        idtoDisembed.forEach((ele, index) => {
            idsMap[ele.id] = true;
            pidsMap[ele.pId] = true;
        });


        setPlaylist(prev => {
            const toBeAddedAtIndex = {};

            const old = prev.map((ele, idx) => {
                const prevEle = {
                    ...ele,
                    additionalInfo: {
                        ...ele.additionalInfo,
                        layers: [...(ele.additionalInfo.layers || [])]
                    }
                }
                const layersFilter = [];
                const remaningLayers = [];
                if (pidsMap[prevEle.id]) {
                    prevEle.additionalInfo.layers.forEach(layer => {
                        if (idsMap[layer.id]) {
                            layersFilter.push({
                                ...layer
                            });
                        } else {
                            remaningLayers.push({
                                ...layer
                            });
                        }
                    });
                    prevEle.additionalInfo.layers = [...remaningLayers];
                }
                if (!isDelete) {
                    toBeAddedAtIndex[idx] = [...layersFilter];
                }
                return prevEle;
            });
            Object.keys(toBeAddedAtIndex).forEach(ele => {
                const items = [...toBeAddedAtIndex[ele]];
                old.splice(ele, 0, ...items);
            });
            return old;
        });
    }

    const isSomethingChecked = Object.keys(checkListData).length > 0;

    const isSomethingEmbededChecked = Object.keys(checkListEmbeded).length > 0;

    const onCheckEmbeded = (id, pId) => {
        setChecklistEmbeded(prev => {
            const old = { ...prev };
            let idMap = [id];
            if (Array.isArray(id)) {
                idMap = [...idMap];
            }
            idMap.forEach(idFinal => {
                if (old[idFinal]) {
                    delete old[idFinal];
                } else {
                    old[idFinal] = { idFinal, pId };
                }
            });
            return old;
        });
    };

    const showMorePosition = useRef(getPosition());

    const showPlaylistPosition = useRef(getPosition());

    const [sharedFilterPlaylists, filteredPlaylist] = useMemo(() => {
        const q = query.toLocaleLowerCase();
        const shared = [];
        const owned = [];
        playLists.forEach(ele => {
            const name = ele.name?.toLocaleLowerCase();
            const des = ele.description?.toLocaleLowerCase();
            if (name.includes(q) || des.includes(q)) {
                if (ele.shareProfileName) {
                    shared.push({ ...ele });
                } else {
                    owned.push({ ...ele });
                }
            }

        })
        return [shared, owned];
    }, [query, playLists]);

    return (
        <>
            {layersWarning && (
                <Modal title="Not Embded Items Found" onClose={() => setLayersWarning(false)} showIcon={false}>
                    <h2 style={{ fontSize: "1rem" }} >Some of your item are not embedded. Layers Should have all Embeded Items.</h2>
                    <ButtonsCover>
                        <Button secondary onClick={() => {
                            setPlaylist(prev => {
                                const old = prev.filter(ele => !!ele.additionalInfo.layers?.length);
                                globalThis[`${id}currentPlaylist`] = old;
                                return old;
                            });
                            setOpenAttachLink(false);
                            onSave(attachment, checklist, readingPlan, currentFormat, selectedColor, selectedIcon, selectedColor === customColor, description, selectedIcon === customIcon && !!selectedIcon, selectedTags, layers);
                            setLayersWarning(false);
                        }}  >
                            Remove & Save
                        </Button>
                        <Button secondaryAlt onClick={() => setLayersWarning(false)}>
                            Close
                        </Button>
                    </ButtonsCover>
                </Modal>
            )}
            {
                showMoreOptions &&
                <>
                    <div className="backdrop" onClick={() => setShowMoreOptions(false)} />
                    <div
                        onClick={() => setShowMoreOptions(false)}
                        style={{
                            ...showMorePosition.current,
                            left: 'none',
                            right: '4rem',
                            width: '200px',
                            padding: '1rem'
                        }}
                        className="overlay linked-item-custom"

                    >
                        <p><b style={{ color: 'white' }}>Publish settings</b></p>
                        <span style={{ fontSize: '10px' }}>You annotations will be published to the selected place below</span>
                        <div
                            className="more-menu-items"
                            onClick={() => {
                                setPublishAccess('private');
                            }}
                            style={{
                                borderTop: '1px solid #3E3E3E'
                            }}
                        >
                            <span style={{ color: 'white' }} class="material-symbols-outlined">
                                lock
                            </span>
                            <p>
                                Private Access
                            </p>
                            <span style={{ color: 'white' }} class="material-symbols-outlined">
                                {publishAccess === 'private' ? 'radio_button_checked' : 'radio_button_unchecked'}
                            </span>
                        </div>
                        <div className="more-menu-items"
                            onClick={() => {
                                setPublishAccess('public');
                            }}
                        >
                            <span style={{ color: 'white' }} class="material-symbols-outlined">
                                public
                            </span>
                            <p>
                                Public Access
                            </p>
                            <span style={{ color: 'white' }} class="material-symbols-outlined">
                                {publishAccess === 'public' ? 'radio_button_checked' : 'radio_button_unchecked'}
                            </span>
                        </div>
                    </div>
                </>
            }
            {openModal && creatingPlaylist && (
                <Modal title="Copy Items" showIcon={false} onClose={() => setOpenModal(false)}>
                    <p style={{ fontSize: "12px" }}>
                        {" "}
                        <b>Click & Hold</b> any Playlist to add it to{" "}
                        <b>Current playlist</b>.
                    </p>
                    <p style={{ textAlign: "center" }}> OR </p>
                    <p style={{ fontSize: "12px" }}>
                        <b>Click & Hold</b> any Playlist item to add that item to the{" "}
                        <b>Current playlist</b>.
                    </p>
                    <PlaylistList
                        creatingPlaylist={creatingPlaylist}
                        isLayers={isLayers}
                        playLists={playLists}
                        parentId={id}
                        setPlayLists={setPlayLists}
                    />
                    <ButtonsCover>
                        <p> </p>
                        <Button secondaryAlt onClick={() => setOpenModal(false)}>
                            Close
                        </Button>
                    </ButtonsCover>
                </Modal>
            )}

            {
                showPlaylistSettings &&
                <>
                    <div className="backdrop" onClick={() => setShowPlaylistSettings(false)} />
                    <div
                        style={{
                            ...showPlaylistPosition.current,
                            width: '200px',
                            padding: '1rem'
                        }}
                        className="overlay linked-item-custom"

                    >
                        <div className="more-menu-items"
                            onClick={() => {
                                setPublishAccess('public');
                            }}
                        >
                            <div
                                className="align-center"
                                style={{
                                }}
                                onClick={() => { setChecklist(p => !p); }}
                            >
                                {
                                    checklist ?
                                        <span style={{ fontSize: "20px", color: "white" }} class="material-symbols-outlined unfollow">
                                            check_box
                                        </span>
                                        : <span style={{ fontSize: "20px", color: "white" }} class="material-symbols-outlined unfollow">
                                            check_box_outline_blank
                                        </span>
                                }
                                <label
                                    style={{
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        marginLeft: "4px",
                                        color: 'white'
                                    }}
                                    for="playlistInclude"
                                >
                                    Checklist
                                </label>
                            </div>
                            <Tooltip forRight={true} text="Checklist Mode gives your Playlist an option to checkout the visited items so you can keep track of your playlist progress." gifUrl={ChecklistGIf} >
                                <p className="what-this center" style={{ margin: '0 0 0 0.5rem' }}>
                                    <span style={{ fontSize: "24px" }} class="material-symbols-outlined unfollow">info</span>
                                </p>
                            </Tooltip>
                        </div>
                        <div className="more-menu-items"
                            onClick={() => {
                                setPublishAccess('public');
                            }}
                        >
                            <div
                                className="align-center"
                                style={{
                                    cursor: "pointer",
                                }}
                                onClick={() => {
                                    if (readingPlan) {
                                        deleteDateData();
                                    }
                                    setReadingPlan(p => !p);
                                }}
                            >
                                {
                                    readingPlan ?
                                        <span style={{ fontSize: "20px", color: "white" }} class="material-symbols-outlined unfollow">
                                            check_box
                                        </span>
                                        : <span style={{ fontSize: "20px", color: "white" }} class="material-symbols-outlined unfollow">
                                            check_box_outline_blank
                                        </span>
                                }
                                <label
                                    style={{
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        marginLeft: "4px",
                                        color: 'white'
                                    }}
                                    for="playlistInclude"
                                >
                                    Plan
                                </label>
                            </div>
                            <Tooltip forRight={true} text="Plan Mode lets you add dates in your playlist which keeps the date and progress in track according to date." gifUrl={ChecklistGIf} >
                                <p className="what-this center" style={{ margin: '0 0 0 0.5rem' }}>
                                    <span style={{ fontSize: "24px" }} class="material-symbols-outlined unfollow ">info</span>
                                </p>
                            </Tooltip>
                        </div>
                    </div>
                </>
            }

            <div className="playlists">
                <p style={{ visibility: 'hidden', display: 'none' }}>{renderAgain}</p>
                {Object.keys(selectedPlaylist).some(ele => selectedPlaylist[ele]) && !creatingPlaylist && <ButtonsCover
                    secondary
                    style={{
                        borderBottom: "1px solid #E1E3EA",
                        marginBottom: '0.5rem'
                    }}
                >
                    <Button
                        onClick={onBulkDelete}
                        secondaryAlt
                        color="#C20104"
                    >
                        <span style={{ marginRight: '0.5rem' }} class="material-symbols-outlined unfollow color-inherit">
                            delete_forever
                        </span>
                        <span className="color-inherit">Delete</span>
                    </Button>
                    <Button
                        onClick={onBulkJsonDownload}
                        secondaryAlt
                        color="#C20104"
                    >
                        <span style={{ marginRight: '0.5rem' }} class="material-symbols-outlined unfollow color-inherit">
                            system_update_alt
                        </span>
                        <span className="color-inherit">Download JSON</span>
                    </Button>
                </ButtonsCover>}


                {creatingPlaylist || openModalName ? <h3 style={{ margin: '0.5rem 0' }}>Editing Playlists</h3> : (
                    <>
                        {selectedChip === "Shared" && sharedFilterPlaylists.length === 0 ? <>
                            <h3 style={{ margin: '0.5rem 0' }}>Shared Playlists</h3>
                            <p>No {isLayers ? 'Layers' : 'Playlists'} to show.</p>
                        </>
                            :
                            null
                        }
                        {(playingPlaylist || "All" === selectedChip || selectedChip === "Shared") && sharedFilterPlaylists.length > 0 ?
                            <>
                                <h3 style={{ margin: '0.5rem 0' }}>Shared Playlists</h3>
                                <PlaylistList
                                    selectedChip={selectedChip}
                                    extraActions={() => {
                                        toggleOpenModalName(false);
                                    }}
                                    selectPlaylist={selectPlaylist || Object.keys(selectedPlaylist).some(ele => !!selectedPlaylist[ele])}
                                    playingPlaylist={playingPlaylist}
                                    mergeMode={mergeMode}
                                    parentId={id}
                                    isLayers={isLayers}
                                    selectedPlaylists={selectedPlaylist}
                                    setSelectPlaylist={toggleSelectedPlaylist}
                                    playLists={sharedFilterPlaylists}
                                    setPlayLists={setPlayLists}
                                />
                            </>
                            :
                            ""
                        }
                        {(playingPlaylist || "All" === selectedChip || selectedChip === "Playlist") &&
                            <>
                                <h3 style={{ margin: '0.5rem 0' }}>Playlists</h3>
                                <PlaylistList
                                    selectedChip={selectedChip}
                                    extraActions={() => {
                                        toggleOpenModalName(false);
                                    }}
                                    selectPlaylist={selectPlaylist || Object.keys(selectedPlaylist).some(ele => !!selectedPlaylist[ele])}
                                    playingPlaylist={playingPlaylist}
                                    mergeMode={mergeMode}
                                    parentId={id}
                                    isLayers={isLayers}
                                    selectedPlaylists={selectedPlaylist}
                                    setSelectPlaylist={toggleSelectedPlaylist}
                                    playLists={filteredPlaylist}
                                    setPlayLists={setPlayLists}
                                />
                            </>
                        }
                    </>
                )}
                {creatingPlaylist && <div style={{
                    height: "100%",
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div className="align-center justify-between" style={{ padding: '0.5rem 0 ', justifyContent: 'space-between' }}>
                        <div className='publish-setting' onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();

                            const x = rect.left;            // X position where the element starts (from left of screen)
                            const y = rect.bottom;          // Y position where the element ends (bottom of element from top of screen)

                            globalThis.LastClickX = x;
                            globalThis.LastClickY = y;
                            showPlaylistPosition.current = { ...getPosition() };
                            setShowPlaylistSettings(true);

                        }}>
                            <span class="material-symbols-outlined">
                                playlist_play
                            </span>
                            <span>
                                Playlist Settings
                            </span>
                        </div>
                        <div className='publish-setting' onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();

                            const x = rect.left;            // X position where the element starts (from left of screen)
                            const y = rect.bottom;          // Y position where the element ends (bottom of element from top of screen)

                            globalThis.LastClickX = x;
                            globalThis.LastClickY = y;
                            showMorePosition.current = { ...getPosition() };
                            setShowMoreOptions(true);
                        }}>
                            <span class="material-symbols-outlined">
                                settings
                            </span>
                            <span>
                                Publish Settings
                            </span>
                        </div>
                    </div>

                    {(isSomethingChecked || embedding) &&
                        <div style={{ justifyContent: 'space-between', margin: '0.5rem 0' }} className="align-center">
                            <Button
                                onClick={() => {
                                    onBulkDeleteItems();
                                    if (isSomethingEmbededChecked) {
                                        const values = Object.keys(checkListEmbeded).map(ele => checkListEmbeded[ele]);
                                        onDisembed(values, true);
                                    }
                                }}
                                secondaryAlt
                                color="#C20104"
                            >
                                <span style={{ marginRight: '0.5rem' }} class="material-symbols-outlined unfollow color-inherit">
                                    delete_forever
                                </span>
                                <span className="color-inherit">Delete</span>
                            </Button>
                            {(!!embedding && isSomethingChecked) && <Button
                                onClick={onEmbedItems}
                                secondaryAlt
                                color="#3B82F6"
                            >
                                <span style={{ marginRight: '0.5rem' }} class="material-symbols-outlined unfollow color-inherit">
                                    frame_source
                                </span>
                                <span className="color-inherit">Embed</span>
                            </Button>}
                            <Button
                                onClick={() => {
                                    setEmbedding(false);
                                    setChecklistData({});
                                    setChecklistEmbeded({});
                                }}
                                secondaryAlt
                            >
                                <span style={{ marginRight: '0.5rem' }} class="material-symbols-outlined unfollow color-inherit">
                                    close
                                </span>
                                <span className="color-inherit">Cancel</span>
                            </Button>
                        </div>
                    }
                    {isSomethingEmbededChecked && !isSomethingChecked &&
                        <div style={{ justifyContent: 'space-between', margin: '0.5rem 0' }} className="align-center">
                            <Button
                                onClick={() => {
                                    const values = Object.keys(checkListEmbeded).map(ele => checkListEmbeded[ele]);
                                    onDisembed(values, true);
                                }}
                                secondaryAlt
                                color="#C20104"
                            >
                                <span style={{ marginRight: '0.5rem' }} class="material-symbols-outlined unfollow color-inherit">
                                    delete_forever
                                </span>
                                <span className="color-inherit">Delete</span>
                            </Button>
                            <Button
                                onClick={() => {
                                    const values = Object.keys(checkListEmbeded).map(ele => checkListEmbeded[ele]);
                                    onDisembed(values);
                                }}
                                secondaryAlt
                                color="#3B82F6"
                            >
                                <span style={{ marginRight: '0.5rem' }} class="material-symbols-outlined unfollow color-inherit">
                                    link_off
                                </span>
                                <span className="color-inherit">Remove</span>
                            </Button>
                            <Button
                                onClick={() => {
                                    setChecklistEmbeded({});
                                }}
                                secondaryAlt
                            >
                                <span style={{ marginRight: '0.5rem' }} class="material-symbols-outlined unfollow color-inherit">
                                    close
                                </span>
                                <span className="color-inherit">Cancel</span>
                            </Button>
                        </div>
                    }
                    <DragDrop
                        massAdd={massAdd}
                        attachLink={attachLink}
                        itemSelected={itemSelected}
                        setItemSelected={regenrateUI ? null : setItemSelected}
                        isPlayer={checklistEnabled || isSomethingChecked || isSomethingEmbededChecked}
                        isSomethingEmbededChecked={isSomethingEmbededChecked}
                        allowHeadingCheck
                        checkListData={checkListData}
                        layers={true}
                        list={playList}
                        onGenClick={() => {
                            setOpenAttachLink(false);
                            setRegenrateUI(true);
                        }}
                        checkListEmbeded={checkListEmbeded}
                        setChecklistEmbeded={onCheckEmbeded}
                        onDisembed={onDisembed}
                        embedding={embedding}
                        setEmbedding={setEmbedding}
                        editDataFromPlaylist={editDataFromPlaylist}
                        currentFormat={currentFormat}
                        setList={setPlaylist}
                        deleteFromList={deleteDataFromPlaylist}
                        creatingPlaylist={creatingPlaylist}
                        setPlaylistFromRow={setPlaylist}
                    />
                    {false && <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between', width: '100%' }}>
                        <Input
                            value={searchText}
                            style={{ marginBottom: '0' }}
                            onChangeListener={setSearchText}
                            placeholder="Type To Search"
                        />
                        <p
                            onClick={onSearchHit}
                            className="playlist-action secondary self-start"
                        >
                            <span class="material-symbols-outlined unfollow">
                                search
                            </span>
                            <span>
                                Search & Add
                            </span>
                        </p>
                    </div>}
                    {false && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: "center", width: '100%' }}>
                        <Button
                            style={{ fontSize: "12px", }}
                            onClick={() => {
                                setRegenrateUI(false);
                                setOpenAttachLink(true);
                            }}
                            small
                            secondary
                        >
                            <span class="material-symbols-outlined unfollow color-inherit" style={{ fontSize: "1.25rem", marginRight: '0.25rem' }}>
                                photo_library
                            </span>
                            <span className="color-inherit">
                                Add Media
                            </span>
                        </Button>
                        <p
                            onClick={() => {
                                setRegenrateUI(false);
                                attachDate();
                            }}
                            style={{ width: 'fit-content' }}
                            className="playlist-action small"
                        >
                            <span class="material-symbols-outlined unfollow">
                                calendar_month
                            </span>
                            <span>
                                Insert Date
                            </span>
                        </p>
                    </div>}

                    {!regenrateUI && !itemSelected && <AttachLink
                        isDate
                        onDateClick={() => {
                            setRegenrateUI(false);
                            attachDate();
                        }}
                        massAdd={massAdd}
                        attachLink={attachLink}
                        onClose={() => setOpenAttachLink(true)}
                    />
                    }
                    {!!videoSrc &&
                        <VideoPlayer videoSrc={videoSrc} playlistItem={{ ...currentItem }} />
                    }
                    {!!mediaURL && <AudioPlayer close mediaURL={mediaURL} />}

                    {regenrateUI && <div className="add-new-playlist alter" style={{ border: "none" }}>
                        <div class="align-center" style={{ justifyContent: 'space-between' }}>
                            <p style={{ fontSize: '12px', margin: '0.5rem 0' }} ><b>Regeneration Prompt:</b></p>
                            <div className="align-center" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <Select
                                    hidden={true}
                                    secondary
                                    value={currentPromptText}
                                    onChangeListener={(val) => { setCurrentPromptText(val); }}
                                    name="Prompt Type:"
                                    options={PROMPT_OPTIONS}
                                    sxSelect={{ padding: '0.25rem', }}
                                />
                                {currentPromptText === "system-prompt"
                                    &&
                                    <Button
                                        small
                                        onClick={() => {
                                            setSystemPrompt(globalThis.SYSTEM_PROMPT);
                                        }}
                                    >
                                        <span style={{ fontSize: '14px' }} class="material-symbols-outlined unfollow">
                                            reset_settings
                                        </span>
                                    </Button>
                                }
                            </div>
                        </div>

                        {currentPromptText === 'prompt'
                            ?
                            <Input
                                style={{ marginBottom: '0' }}
                                type="textarea"
                                value={genDetails}
                                onChangeListener={setGenDetails}
                                placeholder="Describe the playlist you would like to make."
                            />
                            :
                            <Input
                                style={{ marginBottom: '0', }}
                                sxInput={{ resize: 'vertical', height: '25rem' }}
                                type="textarea"
                                value={systemPrompt}
                                onChangeListener={setSystemPrompt}
                                placeholder="Describe your system Prompt."
                            />
                        }
                        {currentPromptText === "system-prompt" && <p className='info'>Use $text$ to use your initial prompt as variable.</p>}
                        <Select
                            hidden={true}
                            secondary
                            value={selectedAI}
                            onChangeListener={(val) => { setSelectedAI(val); }}
                            name="AI:"
                            options={AI_OPTIONS}
                            sxSelect={{ padding: '0.25rem', }}
                        />
                        <div className="attach-link-actions">
                            <Button onClick={() => setRegenrateUI(false)} secondaryAlt>
                                Cancel
                            </Button>
                            <Button
                                // isDisabled={loading}
                                onClick={onRegenration}
                                secondary
                            >
                                Regenrate
                            </Button>
                        </div>
                    </div>}
                    <div className="add-playlist-actions">
                        <Button
                            onClick={() => {
                                if (layers) {
                                    const checkEmbed = playList.some(ele => !ele.additionalInfo.layers?.length);
                                    if (checkEmbed) {
                                        setLayersWarning(true);
                                        return;
                                    }
                                }
                                setOpenAttachLink(false);
                                onSave(attachment, checklist, readingPlan, currentFormat, selectedColor, selectedIcon, selectedColor === customColor, description, selectedIcon === customIcon && !!selectedIcon, selectedTags, layers);
                            }}
                            secondary
                        >
                            Save
                        </Button>
                        {hasOldRef.current && <Button
                            isDisabled={loading}
                            onClick={onRevert}
                            secondary
                        >
                            Revert to Previous
                        </Button>}
                        {!!playList?.length && false && (
                            <p
                                onClick={() => {
                                    const jsonStr = JSON.stringify(playList, null, 2);
                                    os.download(jsonStr, `${name}.json`);
                                }}
                                style={{ width: '100%', padding: '0' }}
                                className="playlist-action self-start"
                            >
                                <span class="material-symbols-outlined unfollow">
                                    download
                                </span>
                                <span>
                                    Download JSON
                                </span>
                            </p>
                        )}
                        {false && !regenrateUI && <p
                            onClick={() => {
                                setOpenAttachLink(false);
                                setRegenrateUI(true);
                            }}
                            style={{ width: '100%', padding: '0' }}
                            className="playlist-action self-start"
                        >
                            <span class="material-symbols-outlined unfollow">
                                animated_images
                            </span>
                            <span>
                                {hasGenrated ? 'Regenerate' : "Generate"} {isLayers ? 'layers' : 'playlist'}
                            </span>
                        </p>}
                        {!!playLists.length && false && (
                            <p
                                onClick={() => {
                                    setOpenModal(true);
                                }}
                                style={{ width: '100%', padding: '0' }}
                                className="playlist-action self-start"
                            >
                                <span class="material-symbols-outlined unfollow">
                                    content_copy
                                </span>
                                <span>
                                    Copy Other Playlists
                                </span>
                            </p>
                        )}
                        <Button
                            onClick={() => {
                                setOpenAttachLink(false);
                                setHasGenrated(false);
                                onClose();
                            }}
                            secondaryAlt
                        >
                            Close
                        </Button>
                    </div>
                    <p style={{ width: "10px", height: "10px" }} ref={creatingPlaylistRef} tabIndex="-1" />
                </div>}
                {(isCreate && !creatingPlaylist && !playingPlaylist) && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexDirection: "column",
                            marginTop: openModalName ? '0' : 'auto',
                        }}
                    >
                        {playLists.length < 0 && (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    marginBottom: "8px",
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={mergeMode}
                                    id="mergeMode"
                                    onChange={(e) => {
                                        setMergeMode(e.target.checked);
                                    }}
                                />
                                <label
                                    style={{
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        marginLeft: "12px",
                                    }}
                                    for="mergeMode"
                                >
                                    Merge Mode
                                </label>
                            </div>
                        )}
                        {!openModalName && autoGenerateOn && <div style={{ margin: '0.5rem', width: '100%' }}>
                            <div className="align-center" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <Select
                                    hidden={true}
                                    secondary
                                    value={currentPromptText}
                                    onChangeListener={(val) => { setCurrentPromptText(val); }}
                                    name="Prompt Type:"
                                    options={PROMPT_OPTIONS}
                                    sxSelect={{ padding: '0.25rem', }}
                                />
                                {currentPromptText === "system-prompt"
                                    &&
                                    <Button
                                        small
                                        onClick={() => {
                                            setSystemPrompt(globalThis.SYSTEM_PROMPT);
                                        }}
                                    >
                                        <span style={{ fontSize: '14px' }} class="material-symbols-outlined unfollow">
                                            reset_settings
                                        </span>
                                    </Button>
                                }
                            </div>
                            {currentPromptText === 'prompt'
                                ?
                                <Input
                                    style={{ marginBottom: '0' }}
                                    type="textarea"
                                    value={genDetails}
                                    onChangeListener={setGenDetails}
                                    placeholder="Describe the playlist you would like to make."
                                />
                                :
                                <Input
                                    style={{ marginBottom: '0', }}
                                    sxInput={{ resize: 'vertical', height: '25rem' }}
                                    type="textarea"
                                    value={systemPrompt}
                                    onChangeListener={setSystemPrompt}
                                    placeholder="Describe your system Prompt."
                                />
                            }
                            {currentPromptText === "system-prompt" && <p className='info'>Use $text$ to use your initial prompt as variable.</p>}
                        </div>}
                        {!openModalName && <div className="align-center" style={{ gap: '0.5rem', width: '100%' }}>
                            <p
                                onClick={() => {
                                    if (loading) return;
                                    setAutoGenerateOn(p => !p);
                                }}
                                style={{ width: '3rem', padding: '0' }}
                                className={`playlist-action self-start ${loading && 'disabled'}`}
                            >
                                <span class="material-symbols-outlined unfollow" style={{ fontSize: '1.3rem', margin: '0' }}>
                                    cached
                                </span>
                            </p>
                            <p
                                onClick={async () => {
                                    if (loading) return;
                                    setTags([]);
                                    if (autoGenerateOn) {
                                        if (!genDetails) {
                                            ShowNotification({
                                                message: "Please enter some text for Playlist Generation!",
                                                severity: "error",
                                            });
                                            return;
                                        }
                                        setLoading(true);

                                        try {
                                            const { suggestedName, allItems, suggestedColor, suggestedIcon, suggestedDescription } = await thisBot.buildPlaylistFromAI({ aiModal: selectedAI, text: genDetails, prompt: systemPrompt });
                                            if (!allItems?.length) {
                                                setLoading(false);
                                                ShowNotification({
                                                    message: "Unable to generate playlist.Please Try Again!",
                                                    severity: "error",
                                                });
                                                return;
                                            }
                                            setHasGenrated(true);
                                            setName(suggestedName);
                                            setSelectedIcon(null);
                                            setSelectedColor(suggestedColor);
                                            setDescription(suggestedDescription);
                                            startCreatingPlaylist(suggestedName, allItems, id);
                                            setTags(prev => {
                                                const old = [...prev];
                                                old.push('ai-generated', suggestedName);
                                                return old;
                                            });
                                            setLoading(false);
                                        } catch (er) {
                                            console.log("ERROR IN MAKING PLAYLIST: ", er);
                                            ShowNotification({
                                                message: "Unable to generate playlist.Please Try Again!",
                                                severity: "error",
                                            });
                                            setLoading(false);
                                        }
                                        return;
                                    }
                                    toggleOpenModalName(true);
                                    globalThis[`${id}setCustomIcon`](DEFAULT_UPLOAD_ICON);
                                }}
                                style={{ width: '100%', padding: '0' }}
                                className={`playlist-action self-start ${loading && 'disabled'}`}
                            >
                                {autoGenerateOn
                                    ?
                                    <>
                                        <span class="material-symbols-outlined unfollow">
                                            animated_images
                                        </span>
                                        <span>
                                            Generate {isLayers ? 'layers' : 'playlist'}
                                        </span>
                                    </>
                                    :
                                    <>
                                        <span class="material-symbols-outlined unfollow">
                                            playlist_add
                                        </span>
                                        <span>
                                            Create new {isLayers ? 'layer' : 'playlist'}
                                        </span>
                                    </>
                                }
                            </p>
                        </div>}
                    </div>
                )}
                {openModalName && <AddNewPlaylist
                    id={id}
                    isLayers={isLayers}
                    editId={isEdit.current}
                    parentId={id}
                    link={link}
                    renameScreen
                    list={playList}
                    setLink={setLink}
                    selectedTags={selectedTags}
                    onClickBackToDiscover={() => toggleOpenModalName(false)}
                    setTags={setTags}
                    customIcon={customIcon}
                    setCustomIcon={setCustomIcon}
                    setOpenModalName={toggleOpenModalName}
                    checkNameDuplicate={checkNameDuplicate}
                    publishAccess={publishAccess}
                    setPublishAccess={setPublishAccess}
                    startCreatingPlaylist={startCreatingPlaylist}
                    loading={loading}
                    setName={setName}
                    name={name}
                    setLoading={setLoading}
                    handleSheetUrl={handleSheetUrl}
                    customColor={customColor}
                    setCustomColor={setCustomColor}
                    selectedColor={selectedColor}
                    setSelectedColor={setSelectedColor}
                    selectedIcon={selectedIcon}
                    setSelectedIcon={setSelectedIcon}
                    description={description}
                    setDescription={setDescription}
                />}
            </div >
        </>
    );
};

return Playlist;


// We  will add Collections Later
// <Button
//     onClick={onBulkAddToCollection}
//     secondaryAlt
// >
//     <span style={{ marginRight: '0.5rem' }} class="material-symbols-outlined">
//         collections_bookmark
//     </span>
//     <span>Add To Collection</span>
// </Button>