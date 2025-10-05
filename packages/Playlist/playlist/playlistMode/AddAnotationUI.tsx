const { useState, useLayoutEffect, useRef, useMemo } = os.appHooks;
import { getUserRecord, createAnnotation, saveAnnotation } from "db.annotations.library";

const isMobile = gridPortalBot.tags.pixelWidth < MOBILE_VIEWPORT_THRESHOLD;
const { Chips, Checkbox, Button, Tooltip, LoaderSecondary } = Components;


const AttachLink = await thisBot.AttachLink();
const AttachmentLinkItem = thisBot.AttachmentLinkItem();
const ChecklistGIf = "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/90e85308635064b3d0fdaa9c220b8547a9467a10affe3cf22f06ad6b26fbf0a1.gif"
const VideoPlayer = await thisBot.VideoSmallScreen();
const AudioPlayer = await thisBot.AudioPlayer();
const RenderHTMLContent = await thisBot.RenderHTMLContent();

const AnnotationInnerDiv = ({
    data,
    onRemoveTag,
    onDisembed,
    index,
    embedding,
    pId = null,
    isEditAddress,
    checklistEnabled,
    finalHistoryObject,
    setList,
    setChecklistEmbeded,
    checkListData,
    selectedAnnotation,
    checkListEmbeded,
    originalIndex,
    editDataFromPlaylist,
    isSomethingEmbededChecked,
    onClick,
    deleteAttachment,
    selected,
    setEmbedding,
    dragOverSet,
    onClickCheckbox,
    deleteFromList,
    embeded = false,
    handleDragStart,
    handleDragOver,
    handleDragEnd
}) => {
    const [expand, setExpand] = useState(false);

    useLayoutEffect(() => {
        if (selectedAnnotation === data.id) {
            setExpand(true)
        };
    }, [selectedAnnotation]);

    useLayoutEffect(() => {
        globalThis[`${data.id}OpenToggle`] = setExpand;
        return () => {
            globalThis[`${data.id}OpenToggle`] = null;
        }
    }, [expand])

    return <>
        <div
            key={`${data.id}-${data.readAlready}`}
            onDragStart={() => handleDragStart(index, pId)}
            onDragOver={(e) => handleDragOver(index, originalIndex, pId, e)}
            onDragEnd={handleDragEnd}
            tabIndex={0}
            // ref={(ref) => setRef.current[data.id] = ref}
            style={{ display: "flex", }}
            className={`history-item ${dragOverSet.itemId === data.id && `dropabble-${dragOverSet.position}`} ${embedding === data.id ? 'embedding-on' : ''}`}
            onClick={(e) => { e.stopPropagation(); if (onClick) onClick(data.id) }}
            draggable={true}
            onPointerDown={() => {
                globalThis.ADDING_TOPLAYLIST_TIMEOUT = setTimeout(() => {
                    globalThis.ADDING_TOPLAYLIST_TIMEOUT = null;
                    // if (data.type !== "heading") onClickItem({ dataItem: data });
                }, 1000)
            }}
            onPointerUp={() => {
                if (globalThis.ADDING_TOPLAYLIST_TIMEOUT) {
                    clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT)
                }
            }}
            onMouseDown={(e) => e.stopPropagation()} // block parent drag
            onMouseLeave={() => {
                if (globalThis.ADDING_TOPLAYLIST_TIMEOUT) clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT);
            }}
            onTouchEnd={() => {
                if (globalThis.ADDING_TOPLAYLIST_TIMEOUT) clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT);
            }}
        >

            <div className="start-actions">
                {checklistEnabled ?
                    <Checkbox
                        small
                        // disabled={embedding === data.id || isSomethingEmbededChecked}
                        disabled={embedding === data.id}
                        checked={checkListData[data.id] || embedding === data.id || data.readAlready || checkListEmbeded?.[data.id]}
                        onClick={() => {
                            if (onClickCheckbox) {
                                onClickCheckbox();
                                return;
                            }
                            const isShiftHold = globalThis?.KEY_HOLD?.['shift'];
                            if (isShiftHold) {
                                let upperLimit = Math.max(index, globalThis.LAST_CLICK_ID);
                                let lowerLimit = Math.min(index, globalThis.LAST_CLICK_ID);
                                const idsFilter = finalHistoryObject.filter(({ id }, indexInner) => indexInner <= upperLimit && indexInner >= lowerLimit && indexInner !== globalThis.LAST_CLICK_ID && id !== embedding).map(ele => ele.id);
                                editDataFromPlaylist(idsFilter, false);
                                globalThis.LAST_CLICK_ID = index;
                                return;
                            } else {
                                globalThis.LAST_CLICK_ID = index;
                            }

                            if (!embedding && data.type !== 'heading' && !isSomethingEmbededChecked && !isEditAddress) {
                                if (globalThis.KEY_HOLD['control'] || globalThis.KEY_HOLD['meta']) {
                                    setEmbedding(data.id);
                                    return;
                                }
                            }
                            editDataFromPlaylist(data.id, false);
                        }}
                    />
                    :
                    null
                }
            </div>
            <p
                onPointerUp={() => {
                    // if (globalThis.ADDING_TOPLAYLIST_TIMEOUT) {
                    //     clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT)
                    //     if ((data.type !== "heading")) {
                    //         onClick({ dataItem: data, index });

                    //     }
                    // }
                    // if (clickPass && (data.type !== "heading")) {
                    //     onClick({ dataItem: data, index });

                    // }
                }}
                style={{ border: selected ? '1px solid #D36433' : '', backgroundColor: selected ? '#D364334D' : '' }}
                className={`playlist-item-type ${data.type !== "date" && checklistEnabled ? "checklistEnabled two" : 'no-left-padding'} playlist-item-${data.type}`}
            >
                {data.type === "heading" ? <RenderHTMLContent htmlContent={data.content} /> : data.content}
            </p>
            <div className="actions">

                {data.type === "heading" ?
                    <p className={`end-icon without-right-margin ${`${isMobile && "visible"} end-icon without-right-margin`}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            globalThis.SetEditRichText?.({ id: data.id, text: data.content });
                        }} >
                        <span class="material-symbols-outlined">
                            edit
                        </span>
                    </p>
                    : null}
                {embeded ?
                    <p className={`end-icon without-right-margin ${`${isMobile && "visible"} end-icon without-right-margin`}`} onClick={(e) => {
                        e.stopPropagation();
                        onDisembed({ idFinal: data.id, pId: pId });
                    }} >
                        <span class="material-symbols-outlined unfollow delete-icon">
                            link_off
                        </span>
                    </p>
                    : data.type !== 'heading' && !embedding && <p className={`end-icon without-right-margin ${`${isMobile && "visible"} end-icon without-right-margin`}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (data.type === "heading") {
                                ShowNotification({ message: `Headings & Media cannot be embeded!`, severity: "error" });
                            } else {
                                if (!isEditAddress) {
                                    setEmbedding(data.id);
                                    if (checkListData[data.id]) {
                                        editDataFromPlaylist(data.id, false);
                                    }
                                } else {
                                    editDataFromPlaylist(data.id, false);
                                }


                            }
                        }} >
                        <span class="material-symbols-outlined">
                            pip
                        </span>
                    </p>
                }
                {data.additionalInfo?.layers?.length > 0 ? <p className="without-right-margin end-icon visible">
                    <span onClick={(e) => {
                        e.stopPropagation();
                        setExpand(p => !p);
                    }} class="material-symbols-outlined unfollow " style={{ fontSize: '1.2rem' }}>
                        {expand ? "collapse_content" : "expand_content"}
                    </span>
                </p> : null
                }
                <p className={`end-icon without-right-margin ${`${isMobile && "visible"} end-icon without-right-margin`}`} onClick={(e) => {
                    e.stopPropagation();
                    deleteFromList(data.id)
                }} >
                    <span class="material-symbols-outlined unfollow delete-icon">
                        delete
                    </span>
                </p>
            </div>
        </div>
        {!embeded && !!data.additionalInfo.tags?.length && <div style={{ display: 'flex' }}>
            <p style={{ padding: '1rem', fontSize: '1rem', fontWeight: '700' }}>Tags:</p>
            <div className="align-center" style={{ flexWrap: 'wrap', flexGrow: '1', margin: '0.5rem 0', gap: '0.5rem' }}>
                {data.additionalInfo.tags.map((ele, index) => <Chips
                    label={ele}
                    key={index}
                    onDelete={() => {
                        onRemoveTag(index, data.id)
                    }}
                />)}
            </div>
        </div>}
        {!embeded && expand && <div style={{ paddingLeft: '1rem' }}>
            {data.additionalInfo.layers?.map((ele, indexInner) => (ele.type === "attachment-link" || ele.type === "date")
                ?
                <AttachmentLinkItem
                    linkingMode={false}
                    isPlaylistNestedSupported
                    viewOnly={false}
                    isSomethingEmbededChecked={isSomethingEmbededChecked}
                    datesRepeat={false}
                    datesInWrongOrder={false}
                    playlistName={false}
                    currentFormat={false}
                    checked={checkListEmbeded?.[ele.id]}
                    readingPlanEnabled={false}
                    isEditAddress={isEditAddress}
                    layers={false}
                    originalList={finalHistoryObject}
                    draggable={true}
                    oldItemsMap={{}}
                    dragOverSet={dragOverSet}
                    currentDateActive={false}
                    originalIndex={index}
                    activeItemID={false}
                    clickPass={false}
                    activeItemList={{}}
                    onClick={() => { }}
                    playlistId={false}
                    onClickItem={() => { }}
                    checkListData={{}}
                    creatingPlaylist={true}
                    checklistEnabled={checklistEnabled}
                    index={indexInner}
                    checkListData={checkListData}
                    editDataFromPlaylist={editDataFromPlaylist}
                    embedding={embedding}
                    handleDragStart={handleDragStart}
                    handleDragOver={handleDragOver}
                    handleDragEnd={handleDragEnd}
                    toggle={false}
                    setList={() => { }}
                    layers={false}
                    pId={data.id}
                    playListSubIndex={false}
                    deleteFromList={deleteAttachment}
                    key={`${ele.id}-${ele.readAlready}`}
                    playingPlaylist={false}
                    data={ele}
                    onDisembed={() => {
                        onDisembed({ id: ele.id, pId: data.id });
                    }}
                    onClickCheckbox={() => {
                        const isShiftHold = globalThis?.KEY_HOLD?.['shift'];
                        if (isShiftHold && id === globalThis.LAST_CLICK_EMBED_PARENT) {
                            let upperLimit = Math.max(indexInner, globalThis.LAST_CLICK_EMBED_ID);
                            let lowerLimit = Math.min(indexInner, globalThis.LAST_CLICK_EMBED_ID);
                            const idsFilter = data.additionalInfo.layers.filter(({ id }, indexInner) => indexInner <= upperLimit && indexInner >= lowerLimit && indexInner !== globalThis.LAST_CLICK_EMBED_ID && id !== embedding).map(ele => ele.id);
                            setChecklistEmbeded(idsFilter, data.id);
                            globalThis.LAST_CLICK_EMBED_PARENT = data.id;
                            globalThis.LAST_CLICK_EMBED_ID = indexInner;

                            return;
                        } else {
                            globalThis.LAST_CLICK_EMBED_PARENT = data.id;
                            globalThis.LAST_CLICK_EMBED_ID = indexInner;
                        }
                        setChecklistEmbeded(ele.id, data.id);

                    }}
                /> : <AnnotationInnerDiv
                    onDisembed={onDisembed}
                    embedding={embedding}
                    checklistEnabled={checklistEnabled}
                    dragOverSet={dragOverSet}
                    setList={setList}
                    handleDragStart={handleDragStart}
                    isEditAddress={isEditAddress}
                    handleDragOver={handleDragOver}
                    handleDragEnd={handleDragEnd}
                    checkListData={checkListData}
                    editDataFromPlaylist={editDataFromPlaylist}
                    index={indexInner}
                    onRemoveTag={onRemoveTag}
                    deleteAttachment={deleteAttachment}
                    deleteFromList={deleteFromList}
                    checkListEmbeded={checkListEmbeded}
                    selected={ele.id === selectedAnnotation}
                    data={ele}
                    key={ele.id}
                    originalIndex={index}
                    key={`${ele.id}-${ele.readAlready}`}
                    embeded
                    pId={data.id}
                    data={ele}
                    onClickCheckbox={() => {
                        const isShiftHold = globalThis?.KEY_HOLD?.['shift'];
                        if (isShiftHold && id === globalThis.LAST_CLICK_EMBED_PARENT) {
                            let upperLimit = Math.max(indexInner, globalThis.LAST_CLICK_EMBED_ID);
                            let lowerLimit = Math.min(indexInner, globalThis.LAST_CLICK_EMBED_ID);
                            const idsFilter = data.additionalInfo.layers.filter(({ id }, indexInner) => indexInner <= upperLimit && indexInner >= lowerLimit && indexInner !== globalThis.LAST_CLICK_EMBED_ID && id !== embedding).map(ele => ele.id);
                            setChecklistEmbeded(idsFilter, false);
                            globalThis.LAST_CLICK_EMBED_PARENT = data.id;
                            globalThis.LAST_CLICK_EMBED_ID = indexInner;
                            return;
                        } else {
                            globalThis.LAST_CLICK_EMBED_PARENT = data.id;
                            globalThis.LAST_CLICK_EMBED_ID = indexInner;
                        }
                        setChecklistEmbeded(ele.id, data.id);
                    }}
                />)}
        </div>}
    </>
}

const AddAnotationUI = ({
    list,
    annoation,
    setMode,
    showPlaylistSettings,
    id,
    setShowPlaylistSettings,
    onReset,
    setList,
    editData,
    setTab
}) => {

    // Audio
    const [mediaURL, setMediaURL] = useState('');
    const [videoSrc, setVideoSrc] = useState(false);
    const [currentItem, setCurrentItem] = useState({});

    // Edit Mode
    const [isEditAddress, setIsEditAddress] = useState(editData?.address);
    const [editDataDetails, setEditDataDetails] = useState({});


    globalThis.SetVideoSrc = setVideoSrc;
    globalThis.SetMediaURL = setMediaURL;
    globalThis.SetCurrentItem = setCurrentItem;

    const [selectedAnnotation, setSelectedAnnotation] = useState(globalThis.SelectedItemIDForAttachments);

    const [showMoreOptions, setShowMoreOptions] = useState(false);
    const [publishAccess, setPublishAccess] = useState('public');

    const [loading, setLoading] = useState(false);
    const [dataFetching, setDataFetching] = useState(false);

    const [checkListData, setChecklistData] = useState({});
    const [checkListEmbeded, setChecklistEmbeded] = useState({});
    const [embedding, setEmbedding] = useState(null);

    const [checklistEnabled, setChecklistEnabled] = useState(false);

    useLayoutEffect(() => {
        globalThis.SetSelectedAnnotations = setSelectedAnnotation;
        if (editData?.address) {
            (async () => {
                setDataFetching(true);
                setList([]);
                try {
                    // const latestData = await shout("chronicle_loadData", { record: latestRecord[0], targetVersion: 0 })[0];
                    const userRecord = await getUserRecord();
                    const res = await os.getData(userRecord, editData?.address)
                    const data = res.data.data;
                    if (data.data) {
                        setEditDataDetails({ ...data.data });
                        setList([...data.data.additionalInfo.layers]);
                    } else {
                        setDataFetching(false);
                        ShowNotification({ message: `Failed to fetch annotations.`, severity: "error" });
                    }
                } catch (e) {
                    console.error("Error fetching annotations:", e);
                    ShowNotification({ message: `Failed to fetch annotations.`, severity: "error" });
                } finally {
                    setDataFetching(false);
                }

            })();
        }
        globalThis.SelectedItemIDForAttachments = null;
        return () => {
            globalThis.SetSelectedAnnotations = null;
            globalThis.SelectedItemIDForAttachments = null;
            if (isEditAddress) {
                globalThis[`${id}mode`] = PlaylistModeTypes.playlist
                setList([]); globalThis[`${id}currentPlaylist`] = [];
                globalThis.SelectedItemIDForAttachments = null;

            }
            setIsEditAddress(false);
            globalThis.SetEditAnnoData?.(null);
        }
    }, []);

    useLayoutEffect(() => {
        globalThis.SelectedItemIDForAttachments = selectedAnnotation;
    }, [selectedAnnotation]);

    useLayoutEffect(() => {
        globalThis[`SetChecklistEnabled`] = setChecklistEnabled;
        return () => {
            globalThis[`SetChecklistEnabled`] = null;
        }
    }, [checklistEnabled])

    const massAdd = (items) => {
        setList(old => {
            const prev = [...old];
            const index = prev.findIndex(ele => ele.id === selectedAnnotation);
            const targetVerse = prev[index];
            targetVerse.additionalInfo.layers = [...items, ...(targetVerse.additionalInfo.layers || [])]
            prev[index] = targetVerse;
            return prev;
        })
    }

    const onEmbedItems = (title, link, linkState) => {
        setList(old => {
            const prev = [...old];
            const index = prev.findIndex(ele => ele.id === selectedAnnotation);
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
    };


    const onEmbedInside = () => {
        if (!embedding) return;

        let embededItem = null;

        list.forEach(ele => {
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
        setList(prev => {

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

    const attachLink = (title, link, linkState) => {
        thisBot.tryAddDataToPlaylist({
            dataItem: {
                content: title,
                additionalInfo: {
                    link,
                    ...linkState,
                },
                type: linkState.type === "text" ? "heading" : "attachment-link",
            },
        });
        setOpenAttachLink(false);
    };

    const onMassAdd = (items) => {
        items.forEach(item => {
            thisBot.tryAddDataToPlaylist({
                dataItem: { ...item },
            });
        });
        setOpenAttachLink(false);
    }

    const deleteFromList = (id) => {
        setList(prev => prev.filter(ele => ele.id !== id));
        setSelectedAnnotation(null);
    }

    const deleteAttachment = (index, pID, id) => {
        setList(prev => {
            const old = [...prev];
            const index = old.findIndex(ele => ele.id === pID);
            if (index > -1) {
                old[index].additionalInfo.layers = old[index].additionalInfo.layers.filter(ele => ele.id !== id);
            }
        });
        setSelectedAnnotation(null);
    }

    const onAddTags = (tags) => {
        setList(old => {
            const prev = [...old];
            const index = prev.findIndex(ele => ele.id === selectedAnnotation);
            const targetVerse = prev[index];
            targetVerse.additionalInfo.tags = [...tags, ...(targetVerse.additionalInfo.tags || [])]
            prev[index] = targetVerse;
            return prev;
        });
    }


    const onRemoveTag = (indexofTag, idOfParent) => {
        setList(old => {
            const prev = [...old];
            const index = prev.findIndex(ele => ele.id === idOfParent);
            const targetVerse = prev[index];
            targetVerse.additionalInfo.tags.splice(indexofTag, 1);
            prev[index] = { ...targetVerse };
            return prev;
        });
    }

    const onDisembed = (ids, isDelete) => {
        let idtoDisembed = [ids];
        if (Array.isArray(ids)) {
            idtoDisembed = [...ids];
        }

        const idsMap = {};
        const pidsMap = {};


        idtoDisembed.forEach((ele, index) => {
            idsMap[ele.idFinal] = true;
            pidsMap[ele.pId] = true;
        });


        setList(prev => {
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
        setChecklistData({});
        setSelectedAnnotation(null);
        setChecklistEmbeded({});
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
    };


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
    }


    const isSomethingChecked = Object.keys(checkListData).length > 0;

    const isSomethingEmbededChecked = Object.keys(checkListEmbeded).length > 0;

    const onBulkDeleteItems = () => {
        setList(prev => {
            const old = prev.filter(ele => !checkListData[ele.id] && embedding !== ele.id);
            return old;
        });
        setChecklistData({});
        setSelectedAnnotation(null);
        setEmbedding(null);
        setChecklistEmbeded({});
    };

    const onEditSave = async () => {
        if (list.length < 1) {
            return ShowNotification({
                message: `Cannot save empty annotation please use delete instead!`,
                severity: "error"
            });
        }
        try {
            setLoading(true);
            const promisesArray = [];
            const chroAddData = {
                book: editDataDetails.additionalInfo.chapterData?.id || editDataDetails.additionalInfo.chapterData?.bookId || editDataDetails.additionalInfo?.data?.id || editDataDetails.additionalInfo?.data?.bookId,
                chapter: editDataDetails.additionalInfo.chapter,
                translation: "",
                chronicle_tags: [...(editDataDetails.additionalInfo.tags || [])],
                data: {
                    ...editDataDetails,
                    additionalInfo: {
                        ...editDataDetails.additionalInfo,
                        layers: [...list]
                    }
                },
            };

            const annotation = createAnnotation(chroAddData.book, chroAddData.chapter, { ...chroAddData, id: isEditAddress });

            const userRecord = await getUserRecord();
            promisesArray.push(saveAnnotation(userRecord, annotation));
            await Promise.all(promisesArray);
            globalThis.SelectedItemIDForAttachments = null;
            ShowNotification({ message: `Annotations saved successfully!`, severity: "success" });
            setList([]);
            setSelectedAnnotation(null);
            setLoading(false);
            if (setTab) setTab('discover');
        } catch (e) {
            setLoading(false);
            console.error("Error updating annotations:", e);
            ShowNotification({ message: `Failed to update annotations.`, severity: "error" });
        } finally {
            setLoading(false);
        }
    }

    const onClickSave = async () => {
        if (loading) return;
        if(finalHistoryObject.length<1) {
            return ShowNotification({
                message: 'Cannot save empty annotations.',
                severity: "error"
            });
        }
        if (isEditAddress) {
            await onEditSave();
            return;
        }
        const currentList = [...finalHistoryObject];
        const nonScriptureName = {
            'date': true, 'attachment-link': true, 'heading': true
        };


        let somethingNotScripture = false;
        let somethingNotEmbedded = false;
        currentList.forEach(ele => {
            if (nonScriptureName[ele.type]) {
                somethingNotScripture = true;
            }
            if (!Array.isArray(ele.additionalInfo.layers)) {
                somethingNotEmbedded = true;
            }
        });

        if (somethingNotScripture) {
            return ShowNotification({
                message: `Only Verses and Chapters are allowed for top-level annotation!`,
                severity: "error"
            });
        }

        if (somethingNotEmbedded) {
            return ShowNotification({
                message: `Some of your scriptures are not embedded. Please embed or delete them!`,
                severity: "error"
            });
        }

        setLoading(true);

        try {
            const promisesArray = [];
            const userRecord = await getUserRecord();
            currentList.forEach(ele => {
                if (ele.type !== 'chapter-range' && ele.type !== 'chapter-grouped') {
                    const chroAddData = {
                        book: ele.additionalInfo.chapterData?.id || ele.additionalInfo.chapterData?.bookId || ele.additionalInfo?.data?.id || ele.additionalInfo?.data?.bookId,
                        chapter: ele.additionalInfo.chapter,
                        translation: "",
                        chronicle_tags: [...(ele.additionalInfo.tags || [])],
                        data: { ...ele }
                    }
                    const annotation = createAnnotation(chroAddData.book, chroAddData.chapter, chroAddData);
                    promisesArray.push(saveAnnotation(userRecord, annotation));
                }
            });

            await Promise.all(promisesArray);

            setLoading(false);
            globalThis.SelectedItemIDForAttachments = null;
            ShowNotification({ message: `Annotations saved successfully!`, severity: "success" });
            setList([]);
            setSelectedAnnotation(null);
        } catch (e) {
            setLoading(false);
            console.error("Error saving annotations:", e);
            ShowNotification({ message: `Failed to save annotations.`, severity: "error" });
        } finally {
            setLoading(false);
        }
    };

    const checkEnabled = checklistEnabled || isSomethingChecked || isSomethingEmbededChecked || embedding;

    const toBeSetItems = useRef([]);
    const [dragOverSet, setDragoverSetMutate] = useState({
        position: "top",
        itemId: null,
        pId: null
    });

    const setDragoverSet = (newState) => {
        if (newState.itemId !== dragOverSet.itemId || newState.position !== dragOverSet.position) {
            if (globalThis[`${newState.itemId}OpenToggle`]) {
                globalThis[`${newState.itemId}OpenToggle`](true);
            }
            setDragoverSetMutate(newState)
        }
    }

    // const selectedCount = list.filter(ele => !!ele.readAlready);
    // const unSelectedCount = list.length - selectedCount;

    // const transformedHistory = useMemo(() => thisBot.groupVerse(list), [list, selectedCount, unSelectedCount]);

    const finalHistoryObject = useMemo(() => list, [list]);

    const [draggedItemID, setDraggedItemID] = useState(null);
    const [draggedParent, setDraggedItemParent] = useState(null);

    const handleDragStart = (index, pId) => {
        toBeSetItems.current = finalHistoryObject;
        if (pId) {
            setDraggedItemParent(pId);
            const pIndex = finalHistoryObject.findIndex(ele => ele.id === pId);
            const itemId = finalHistoryObject[pIndex].additionalInfo.layers[index].id;
            setDraggedItemID(itemId);
        } else {
            const id = finalHistoryObject[index].id;
            setDraggedItemID(id);
        }
        // console.log('Drag Start:', { index, pseudoID, id });
    };

    const handleDragOver = (index, pseudoIndex = 1, pseudoID = null, event) => {
        event.preventDefault(); // Needed to allow drop

        const rect = event.currentTarget.getBoundingClientRect();
        const mouseY = event.clientY;
        // const mouseX = event.clientX;

        const middleVertical = rect.top + rect.height / 2;
        // const middleHorizontal = rect.left + rect.width / 2;

        const distanceThreshold = 10; // pixels around the center

        const isNearCenter = Math.abs(mouseY - middleVertical) < distanceThreshold;

        if (!draggedItemID) return;

        let originalRespectiveIndex = index;


        let draggedItemIndex = finalHistoryObject.findIndex(hist => hist.id === draggedItemID);
        let parentIdx = finalHistoryObject.findIndex(ele => ele.id === draggedParent);

        let dragItem = [finalHistoryObject[draggedItemIndex]];


        if (draggedItemIndex === -1 && parentIdx > -1) {
            draggedItemIndex = finalHistoryObject[parentIdx].additionalInfo.layers?.findIndex(hist => hist.id === draggedItemID);
            dragItem = [finalHistoryObject[parentIdx].additionalInfo.layers[draggedItemIndex]];
        }

        let draggedOverItem = finalHistoryObject[index];

        if (pseudoID) {
            const parentIndexDragOver = finalHistoryObject.findIndex(ele => ele.id === pseudoID);
            draggedOverItem = finalHistoryObject[parentIndexDragOver].additionalInfo.layers[index];
        }

        let newIndex = originalRespectiveIndex;

        // console.log("Drag Over:", { newIndex, draggedItemIndex,originalRespectiveIndex, pseudoIndex, index });

        let newItems = [];

        let filterAbleItems = {
            [draggedItemID]: true,
        };

        // Ignore if the item is dragged over itself
        if (dragItem.id === draggedOverItem.id) {
            toBeSetItems.current = list;
            setDragoverSet({
                itemId: null,
                position: originalRespectiveIndex > draggedItemIndex ? "Bottom" : "Top"
            });
            return;
        }

        if (dragItem.id !== draggedOverItem.id) {
            setDragoverSet({
                itemId: draggedOverItem.id,
                position: isNearCenter && !pseudoID ? 'Embed' : originalRespectiveIndex > draggedItemIndex ? "Bottom" : "Top"
            });
        }

        // Filter out the currently dragged item
        newItems = [...finalHistoryObject.filter((hist) => !filterAbleItems[hist.id])];
        newItems = JSON.parse(JSON.stringify(newItems));
        if (parentIdx > -1) {
            newItems[parentIdx].additionalInfo.layers = [...newItems[parentIdx].additionalInfo.layers.filter((hist) => !filterAbleItems[hist.id])]
        }
        if (pseudoID) {
            newItems[pseudoIndex].additionalInfo.layers.splice(newIndex, 0, ...dragItem);
        } else if (isNearCenter) {
            const indexForNew = newItems.findIndex(ele => ele.id === draggedOverItem.id);
            // Add the dragged item after the dragged over item
            if (indexForNew > -1) {
                if (!newItems[indexForNew].additionalInfo.layers) {
                    newItems[indexForNew].additionalInfo.layers = [];
                }
                newItems[indexForNew].additionalInfo.layers = [...newItems[indexForNew].additionalInfo.layers, ...dragItem];
            }
        } else {
            // Add the dragged item after the dragged over item
            newItems.splice(newIndex, 0, ...dragItem);
        }

        toBeSetItems.current = newItems;
    };

    const handleDragEnd = () => {
        const dragOverItem = finalHistoryObject.find(ele => ele.id === dragOverSet.itemId);

        setDragoverSet({
            itemId: null,
            position: "false"
        });
        setDraggedItemID(null);
        setDraggedItemParent(null);

        if (dragOverSet.position === "Embed") {
            if (isEditAddress) {
                ShowNotification({
                    message: `You are in edit mode. Editing a anotation cannot embed items inside the annotation.`,
                    severity: "error",
                });
                return;
            }

            if (dragOverItem?.type === "attachment-link" || dragOverItem?.type === "heading") {
                ShowNotification({
                    message: `You cannot embed items into attachment item.`,
                    severity: "error",
                });
                return;
            }

            let draggedItemIndex = finalHistoryObject.findIndex(hist => hist.id === draggedItemID);

            let dragItem = finalHistoryObject[draggedItemIndex];

            let parentIdx = finalHistoryObject.findIndex(ele => ele.id === draggedParent);

            if (draggedItemIndex === -1 && parentIdx > -1) {
                draggedItemIndex = finalHistoryObject[parentIdx].additionalInfo.layers?.findIndex(hist => hist.id === draggedItemID);
                dragItem = finalHistoryObject[parentIdx].additionalInfo.layers[draggedItemIndex];
            }

            if (!!dragItem.additionalInfo.layers?.length) {
                ShowNotification({
                    message: `Cannot Embed the Embedded item!. Please remove it before embeding!`,
                    severity: "error",
                });
                return;
            }

        }
        toBeSetItems.current && setList(toBeSetItems.current);
    };

    const showMorePosition = useRef(getPosition());

    const showPlaylistPosition = useRef(getPosition());

    return <>
        {
            showPlaylistSettings &&
            <>
                <div className="backdrop" onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();

                    const x = rect.left;            // X position where the element starts (from left of screen)
                    const y = rect.bottom;          // Y position where the element ends (bottom of element from top of screen)

                    globalThis.LastClickX = x;
                    globalThis.LastClickY = y;
                    setShowPlaylistSettings(false);
                }} />
                <div
                    style={{
                        ...showPlaylistPosition.current,
                        width: '220px',
                        padding: '1rem'
                    }}
                    className="overlay linked-item-custom"

                >
                    <div className="more-menu-items active"
                        onClick={() => {
                            setMode(PlaylistModeTypes.annotations);
                            setShowPlaylistSettings(false);
                        }}
                    >
                        <div
                            className="align-center"
                        >
                            <span style={{ fontSize: "20px", color: "white" }} class="material-symbols-outlined">
                                draft
                            </span>
                            <label
                                style={{
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    marginLeft: "4px",
                                    color: 'white'
                                }}
                                for="playlistInclude"
                            >
                                Annotation Mode
                            </label>
                        </div>
                        <Tooltip forRight={true} text="Annotation mode is the way to annotate the bible so you can see content while exploring other who have subscribed to you." gifUrl={ChecklistGIf} >
                            <p className="what-this center" style={{ margin: '0 0 0 0.5rem' }}>
                                <span style={{ fontSize: "24px" }} class="material-symbols-outlined unfollow">info</span>
                            </p>
                        </Tooltip>
                    </div>
                    <div
                        className="more-menu-items"
                        onClick={() => {
                            setList(prev => {
                                let old = [...prev];
                                old = old.filter(ele => ele.additionalInfo.type !== 'playlist');
                                old = old.map(ele => {
                                    const eleprev = { ...ele };
                                    if (eleprev.additionalInfo.layers) {
                                        eleprev.additionalInfo.layers = eleprev.additionalInfo.layers.filter(ele => ele.additionalInfo.type !== 'playlist');
                                    }
                                    return eleprev;
                                })
                                return old;
                            });
                            setMode(PlaylistModeTypes.playlist);
                            setShowPlaylistSettings(false);
                        }}
                    >
                        <div
                            className="align-center"
                        >
                            <span style={{ fontSize: "20px", color: "white" }} class="material-symbols-outlined">
                                playlist_play
                            </span>
                            <label
                                style={{
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    marginLeft: "4px",
                                    color: 'white'
                                }}
                                for="playlistInclude"
                            >
                                Playlist Mode
                            </label>
                        </div>
                        <Tooltip forRight={true} text="Playlist mode is to create playlist and share with other or play them." gifUrl={ChecklistGIf} >
                            <p className="what-this center" style={{ margin: '0 0 0 0.5rem' }}>
                                <span style={{ fontSize: "24px" }} class="material-symbols-outlined unfollow">info</span>
                            </p>
                        </Tooltip>
                    </div>
                    <div
                        className="more-menu-items"
                        onClick={() => {
                            setList(prev => {
                                let old = [...prev];
                                old = old.filter(ele => ele.additionalInfo.type === 'playlist');
                                old = old.map(ele => {
                                    const eleprev = { ...ele };
                                    if (eleprev.additionalInfo.layers) {
                                        eleprev.additionalInfo.layers = eleprev.additionalInfo.layers.filter(ele => ele.additionalInfo.type === 'playlist');
                                    }
                                })
                                return old;
                            });
                            setMode(PlaylistModeTypes.project);
                            setShowPlaylistSettings(false);
                        }}
                    >
                        <div
                            className="align-center"
                        >
                            <span style={{ fontSize: "20px", color: "white" }} class="material-symbols-outlined">
                                team_dashboard
                            </span>
                            <label
                                style={{
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    marginLeft: "4px",
                                    color: 'white'
                                }}
                                for="playlistInclude"
                            >
                                Project Mode
                            </label>
                        </div>
                        <Tooltip forRight={true} text="Project mode is awesome." gifUrl={ChecklistGIf} >
                            <p className="what-this center" style={{ margin: '0 0 0 0.5rem' }}>
                                <span style={{ fontSize: "24px" }} class="material-symbols-outlined unfollow">info</span>
                            </p>
                        </Tooltip>
                    </div>
                </div>

            </>
        }
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
        <div
            style={{
                flexGrow: "1",
                display: "flex",
                flexDirection: "column"
            }}
        >
            {isEditAddress
                ?
                <>
                    <div className="align-center justify-between" style={{ padding: '0.5rem 0 ', justifyContent: 'space-between' }}>
                        <div className='back-button' onClick={() => {
                            if (isEditAddress) setList([]);
                            setIsEditAddress(false);
                            globalThis.SetEditAnnoData?.(null);
                            if (setTab) setTab('discover');
                        }}>
                            <span class="material-symbols-outlined">
                                keyboard_backspace
                            </span>
                            <span>
                                Back to Discover
                            </span>
                        </div>
                    </div>
                    <h4 style={{ margin: '8px 0' }}>Editing Annotation For {editData.title}</h4>
                </>
                :
                <div className="align-center justify-between" style={{ padding: '0.5rem 0 ', justifyContent: 'space-between' }}>
                    <div className="align-center" style={{ gap: '0.5rem' }}>
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
                                {annoation ? 'draft' : "playlist_play"}
                            </span>
                        </div>
                        <p>
                            Annotation Mode
                        </p>
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
                        <img src={Settings_Icon} alt='Settings_Icon' />
                    </div>
                </div>
            }

            {false
                &&
                <p style={{ margin: '0.25rem 0', fontWeight: '600' }}>Note: Ranges of chapter will be skipped in saving annoation. Please remove them if you have any.</p>
            }

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
                    {(!!embedding && !isEditAddress && isSomethingChecked && !isSomethingEmbededChecked) && <Button
                        onClick={onEmbedInside}
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
            {dataFetching && <div className="align-center" style={{ gap: '1rem', margin: '0.5rem 0' }}>
                <LoaderSecondary />
                <p>Fetching Annotation Data</p>
            </div>}
            {finalHistoryObject.length === 0 && !dataFetching && <p style={{ margin: '1rem 0' }}>Add items to start annotating.</p>}
            {
                finalHistoryObject.map((ele, index) => (ele.type === "attachment-link" || ele.type === "date")
                    ?
                    <AttachmentLinkItem
                        linkingMode={false}
                        isPlaylistNestedSupported
                        viewOnly={false}
                        isEditAddress={isEditAddress}
                        isSomethingEmbededChecked={isSomethingEmbededChecked}
                        datesRepeat={false}
                        datesInWrongOrder={false}
                        playlistName={false}
                        currentFormat={false}
                        readingPlanEnabled={false}
                        layers={false}
                        draggable={true}
                        oldItemsMap={{}}
                        currentDateActive={false}
                        originalIndex={-1}
                        dragOverSet={dragOverSet}
                        activeItemID={false}
                        clickPass={false}
                        checked={false}
                        activeItemList={{}}
                        onClick={() => { }}
                        playlistId={false}
                        onClickItem={() => { }}
                        checklistEnabled={checkEnabled}
                        checkListData={checkListData}
                        creatingPlaylist={true}
                        index={index}
                        editDataFromPlaylist={editDataFromPlaylist}
                        embedding={embedding}
                        handleDragStart={handleDragStart}
                        handleDragOver={handleDragOver}
                        handleDragEnd={handleDragEnd}
                        toggle={false}
                        setList={setList}
                        layers={false}
                        pId={null}
                        originalList={finalHistoryObject}
                        playListSubIndex={false}
                        deleteFromList={(_, __, id) => {
                            deleteFromList(id);
                        }}
                        key={`${ele.id}-${ele.readAlready}`}
                        playingPlaylist={false}
                        data={ele}
                        onDisembed={false}
                    /> : <>
                        <AnnotationInnerDiv
                            isEditAddress={isEditAddress}
                            dragOverSet={dragOverSet}
                            onDisembed={onDisembed}
                            embedding={embedding}
                            setChecklistEmbeded={onCheckEmbeded}
                            finalHistoryObject={finalHistoryObject}
                            checklistEnabled={checkEnabled}
                            checkListEmbeded={checkListEmbeded}
                            setList={setList}
                            isSomethingEmbededChecked={isSomethingEmbededChecked}
                            selectedAnnotation={selectedAnnotation}
                            checkListData={checkListData}
                            editDataFromPlaylist={editDataFromPlaylist}
                            index={index}
                            pId={null}
                            handleDragStart={handleDragStart}
                            handleDragOver={handleDragOver}
                            handleDragEnd={handleDragEnd}
                            onRemoveTag={onRemoveTag}
                            deleteAttachment={deleteAttachment}
                            setEmbedding={setEmbedding}
                            deleteFromList={deleteFromList}
                            selected={ele.id === selectedAnnotation}
                            data={ele}
                            key={ele.id}
                            onClick={(id) => {
                                if (isEditAddress) {
                                    ShowNotification({
                                        message: `You are in edit mode. Editing a anotation cannot embed items inside the annotation.`,
                                        severity: "error",
                                    });
                                    return;
                                }
                                if (ele.type !== 'heading' && !(checkEnabled)) {
                                    const isMultiFunctionHold = CheckMultiFuntionHold();
                                    if (!isMultiFunctionHold) {
                                        setSelectedAnnotation(prev => prev === id ? null : id);
                                    } else if (embedding) {
                                        // const isShiftHold = globalThis?.KEY_HOLD?.['shift'];
                                        // if (isShiftHold && id === globalThis.LAST_CLICK_EMBED_PARENT) {
                                        //     let upperLimit = Math.max(index, globalThis.LAST_CLICK_EMBED_ID);
                                        //     let lowerLimit = Math.min(index, globalThis.LAST_CLICK_EMBED_ID);
                                        //     const idsFilter = data.additionalInfo.layers.filter(({ id }, indexInner) => indexInner <= upperLimit && indexInner >= lowerLimit && indexInner !== globalThis.LAST_CLICK_EMBED_ID && id !== embedding).map(ele => ele.id);
                                        //     setChecklistEmbeded(idsFilter, false);
                                        //     globalThis.LAST_CLICK_EMBED_PARENT = data.id;
                                        //     globalThis.LAST_CLICK_EMBED_ID = index;

                                        //     return;
                                        // } else {
                                        //     globalThis.LAST_CLICK_EMBED_PARENT = data.id;
                                        //     globalThis.LAST_CLICK_EMBED_ID = index;
                                        // }
                                        // setChecklistEmbeded(ele.id, data.id);
                                    }
                                }
                            }}
                        />
                        {!draggedItemID && selectedAnnotation === ele.id && !embedding && <div style={{ padding: '1rem' }}>
                            <AttachLink isPlaylist onAddTags={onAddTags} isTags attachLink={onEmbedItems} massAdd={massAdd} />
                        </div>}
                    </>)
            }

            {!selectedAnnotation && !draggedItemID && !embedding && <AttachLink isPlaylist attachLink={attachLink} massAdd={onMassAdd} />}

            {!!videoSrc &&
                <VideoPlayer videoSrc={videoSrc} playlistItem={{ ...currentItem }} />
            }
            {!!mediaURL && <AudioPlayer close mediaURL={mediaURL} />}

            <div style={{ padding: '1rem 0 ' }}>
                <div className="add-playlist-actions">
                    <Button
                        onClick={onClickSave}
                        secondary
                    >
                        {loading ? "Saving" : "Save"}
                    </Button>
                    <Button
                        onClick={() => {
                            if (onReset && !loading) {
                                onReset();
                            }
                        }}
                        secondaryAlt
                    >
                        Close
                    </Button>
                </div>
            </div>
        </div>
    </>
};


return AddAnotationUI;