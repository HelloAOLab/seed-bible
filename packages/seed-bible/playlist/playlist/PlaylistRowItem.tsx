const { useState, useEffect, useMemo } = os.appHooks;
const { Checkbox, LoaderSecondary } = Components;

const CircleProgress = await thisBot.DynamicCircle();

const ButtonStyle = {
    cursor: "pointer",
    // border: "1px solid grey",
    borderRadius: "40px",
    // padding: "6px",
    fontSize: "1.75rem",
    color: 'inherit'
}

const startEditingPlaylist = (name, id, list, subId, attachment, checklistEnabled, parentId, readingPlanEnabled, currentFormat, color, icon, isCustomColor, description, isCustomIcon, selectedTags) => {
    globalThis[`${parentId}SetPlaylistName`](name);
    globalThis[`${parentId}creatingPlaylistName`] = name;
    globalThis[`${parentId}HISTORYExploreMode`] = false;
    globalThis[`${parentId}creatingPlaylist`] = true;
    globalThis[`${parentId}isEditMode`] = id;
    globalThis[`${parentId}isEditModeSubID`] = subId;
    // thisBot.showInfo(`Playlist Mode`);
    // thisBot.ControlButtons();
    globalThis[`${parentId}SetAttachments`](attachment);
    globalThis[`${parentId}Attachments`] = attachment;
    globalThis[`${parentId}SetReadingPlan`](readingPlanEnabled);
    globalThis[`${parentId}SetChecklist`](checklistEnabled);
    globalThis[`${parentId}SetCurrentFormat`](currentFormat);

    globalThis.SetEditData({
        color: color,
        id: parentId,
        name: name,
        description: description,
        icon: icon
    });

    if (isCustomColor) globalThis[`${parentId}setCustomColor`](color);
    if (isCustomIcon) globalThis[`${parentId}setCustomIcon`](icon);
    globalThis[`${parentId}setSelectedColor`](color);
    globalThis[`${parentId}setSelectedIcon`](icon);
    globalThis[`${parentId}setDescription`](description);
    globalThis[`${parentId}SetCreatingPlaylist`](true, list);
    globalThis[`${parentId}SetSelectedTags`](selectedTags || []);
}

function sanitizeString(str) {
    // console.log("SANITIZE DONE", str);
    // Remove control characters (U+0000 to U+001F, excluding \t, \n, \r)
    if (typeof str === "string") {
        return str.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    }
    return str;
}

function sanitizeObject(obj) {
    if (typeof obj === "string") {
        return sanitizeString(obj);
    } else if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
    } else if (obj && typeof obj === "object") {
        return Object.keys(obj).reduce((acc, key) => {
            acc[key] = sanitizeObject(obj[key]);
            return acc;
        }, {});
    }
    return obj; // Return other types (numbers, booleans, etc.) unchanged
}

const getPosition = () => {
    const pointerX = gridPortalBot.tags.pointerPixelX;
    const pointerY = gridPortalBot.tags.pointerPixelY;
    const height = gridPortalBot.tags.pixelHeight;
    const width = gridPortalBot.tags.pixelWidth;

    const edgeThreshold = 200; // Distance from edges to adjust position
    const safeMargin = "2rem"; // Fixed margin when near edges

    let position = {};

    // Horizontal positioning
    if (width - pointerX < edgeThreshold) {
        position.right = `-11rem`;
    } else if (pointerX < edgeThreshold) {
        position.left = "2rem";
    } else {
        position.left = `15rem`;
    }

    // Vertical positioning
    if (height - pointerY < edgeThreshold) {
        position.bottom = `5rem`;
    } else if (pointerY < edgeThreshold) {
        position.top = safeMargin;
    } else {
        position.top = `${parseInt(pointerY) - 80}px`;
    }

    return position;
};

const PlaylistRowItem = ({ currentDateActive, oldItemsMap = {}, checkListData, selectedPlaylists, selectPlaylist = false, setSelectPlaylist, playlistParentName = '', clickPass = false, linkingMode, onLink, viewOnly, parentId, playingPlaylist, checklistEnabled, readingPlanEnabled, totalItem, index, toggle, list, name, id, setPlaylists, attachment = null, playListIndex, playListSubId = null, playListSubIndex = null, creatingPlaylist, handleDragOver, handleDragEnd, currentFormat, handleDragStart, dragOverSet, setOpenedList, opendedList, color = "#D9D9D9", icon = "subscriptions", isCustomColor = false, description = '', isCustomIcon = false, selectedTags }) => {
    const isCustomIcons = icon.startsWith("https") || isCustomIcon;

    const [showMoreOptions, setShowMoreOptions] = useState(false);
    const toggleOpen = () => setOpenedList(prev => prev === id ? "" : id);
    const [isPlay, setIsPlay] = useState(false);

    const [loading, setLoading] = useState(false);
    const [copyURL, setCopyURL] = useState(null);

    const setPlaylist = (newList) => {
        setPlaylists(prev => {
            const old = [...prev];
            if (playListSubIndex || playListSubIndex === 0) {
                old[playListSubIndex].list[playListIndex].list = newList;
            } else {
                old[playListIndex].list = newList;
            }
            return old;
        })
    }

    const deleteDataFromPlaylist = (index) => {
        const idsMap = {};
        const isArray = Array.isArray(index);
        if (isArray) index.forEach(id => idsMap[id] = true);
        setPlaylists(prev => {
            const old = [...prev];
            if (playListSubIndex || playListSubIndex === 0) {
                let oldList = [...old[playListSubIndex].list[playListIndex].list];
                if (isArray) {
                    oldList = oldList.filter((data) => !idsMap[data.id]);
                } else {
                    oldList.splice(index, 1);
                }
                if (oldList.length === 0) {
                    old[playListSubIndex].list.splice(playListIndex, 1);
                } else {
                    old[playListSubIndex].list[playListIndex].list = oldList;
                    // old[playListSubIndex].list[playListIndex].toggleRender = !old[playListSubIndex].list[playListIndex].toggleRender;
                }
                // old[playListSubIndex].toggleRender = !old[playListSubIndex].toggleRender;
            } else {
                let oldList = [...old[playListIndex].list];
                if (isArray) {
                    oldList = oldList.filter((data) => !idsMap[data.id]);
                } else {
                    oldList.splice(index, 1);
                }
                if (oldList.length === 0) {
                    old.splice(playListIndex, 1);
                } else {
                    old[playListIndex].list = oldList;
                }
            }
            return old;
        })
    }

    const editDataFromPlaylist = (index, isGroup, newVal = false) => {
        setPlaylists(prev => {
            const old = [...prev];
            if (playListSubIndex || playListSubIndex === 0) {
                if (isGroup) {
                    index.forEach(i => {
                        old[playListSubIndex].list[playListIndex].list[i].readAlready = newVal;
                    })
                } else {
                    old[playListSubIndex].list[playListIndex].list[index].readAlready = !old[playListSubIndex].list[playListIndex].list[index].readAlready;
                }
                // old[playListSubIndex].toggleRender = !old[playListSubIndex].toggleRender;
            } else {
                if (isGroup) {
                    index.forEach(i => {
                        old[playListIndex].list[i].readAlready = newVal;
                    })
                } else {
                    old[playListIndex].list[index].readAlready = !old[playListIndex].list[index].readAlready;
                }
                // old[playListIndex].toggleRender = !old[playListIndex].toggleRender;
            }
            return old;
        })
    }

    const deletePlayList = (index) => {
        setPlaylists(prev => {
            const old = [...prev];
            if (playListSubIndex || playListSubIndex === 0) {
                old[playListSubIndex].list.splice(index, 1);
            } else {
                old.splice(index, 1);
            }
            return old;
        })
    }

    const onremoveAttachment = () => {
        setPlaylists(prev => {
            const old = [...prev];

            if (playListSubIndex || playListSubIndex === 0) {
                old[playListSubIndex].list[playListIndex].attachment = null;
                old[playListSubIndex].toggleRender = !old[playListSubIndex].toggleRender;
            } else {
                old[playListIndex].attachment = null;
            }
            return old;
        })
    }

    const hanldeAdd = ({ dataItem, bulkAdd }) => {
        if (creatingPlaylist) {
            thisBot.tryAddDataToPlaylist({ dataItem, bulkAdd });
        } else {
            thisBot.navigationWithDataItem({ dataItem, bulkAdd });
        }
    }

    const onClick = ({ dataItem, bulkAdd, index }) => {
        globalThis.SetCurreIndexPlaylist && globalThis.SetCurreIndexPlaylist(index, playListSubIndex);
        thisBot.navigationWithDataItem({ dataItem, bulkAdd });
    }

    const exportNestedList = () => {
        setPlaylists(prev => {
            const old = [...prev];
            const playlist = { ...old[playListSubIndex].list[playListIndex] };
            playlist.nesting = 1;
            // old[playListSubIndex].toggleRender = !old[playListSubIndex].toggleRender;
            old.splice(playListSubIndex + 1, 0, playlist);
            old[playListSubIndex].list.splice(playListIndex, 1);
            return old;
        });
    }

    const copyClipBoard = () => {
        if (!configBot.tags.pattern) {
            return ShowNotification({ message: "Playlist Can only be shared in published pattern. Please try export.", severity: "error" });
        }
        setLoading(true);
        const playlistObj = {
            id,
            name: name,
            list,
            nesting: 1,
            toggleRender: false,
            attachment,
            icon,
            isCustomIcon,
            color,
            isCustomColor,
            description,
            icons: globalThis.PREDEFINED_ICONS
        }
        const sanitizedItem = sanitizeObject(playlistObj);
        // console.log(sanitizedItem, "sanitizedItem");
        const stringItems = JSON.stringify(sanitizedItem, null, 2);

        const deployBot = configBot.tags.pattern ? configBot.tags.pattern : configBot.tags.ab;
        const key = configBot.tags.pattern ? "pattern" : "ab";
        // const encryptedText = API.encrypt()(stringItems);

        web.hook({
            url: `https://theographic-bible-api.netlify.app/api/playlist/postPlaylist`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                query: stringItems
            }
        }).then((dbRes) => {
            const shareURL = `https://ao.bot/?${key}=${deployBot}&sharedPlaylist=${dbRes.data.data.uid}`;
            os.setClipboard(shareURL);
            setShowMoreOptions(false);
            setCopyURL(shareURL);
            ShowNotification({ message: "Share URL Copied to textboard.", severity: "success" });
            setLoading(false);
        }).catch(() => {
            ShowNotification({ message: "Unable to copy playlist. Please try again!", severity: "error" });
            setLoading(false);
        })
    }

    const openMergeModal = ({ id }) => {
        thisBot.MergeModal({ id });
    }

    const onClickLinkPlaylist = () => {
        thisBot.PlaylistLinkModal({
            id, parentId
        })
    }

    const [updatePercent, setUpdatePercent] = useState(false);

    const percentageCompleted = (() => {
        if (id) {
            const playlistsProgress = globalThis['defaultplaylistProgress'];
            const playlistsChecked = globalThis['defaultplaylistChecked'];
            const itemsProg = { ...(playlistsProgress[id] || {}) };
            const itemsCheck = { ...(playlistsChecked[id] || {}) };
            const completedItems = { ...itemsProg, ...itemsCheck };
            const playlistList = (globalThis[`defaultplaylists`] || []).find(ele => ele.id === id);

            const totalItems = playlistList?.list?.length || 0;

            if (playlistList) {
                let completedCount = 0;
                const tfHist = thisBot.groupVerse(playlistList.list);

                tfHist.forEach((ele) => {
                    const isGrouped = Array.isArray(ele.additionalInfo);
                    if (completedItems[ele.id]) {
                        if (isGrouped) {
                            completedCount += ele.additionalInfo.length;
                        } else {
                            completedCount++;
                        }
                    }
                });
                return Math.round((completedCount / totalItems) * 100)
            } else {
                return 0;
            }
        }
    })();

    useEffect(() => {
        globalThis[`updatePercent${id}`] = () => { };
    }, [id])

    return (
        <>
            <div
                onDragStart={() => {
                    handleDragStart(playListIndex);
                }}
                onDragOver={() => {
                    handleDragOver(playListIndex)
                }}
                style={{ zIndex: (100 - playListIndex), position: "relative" }}
                onDragEnd={handleDragEnd}
                draggable={!playingPlaylist && !viewOnly}
                className={`playlist ${(playingPlaylist || isPlay) && "playingPlaylist"} ${id === opendedList ? "opened" : ""}  ${dragOverSet.itemId === id && `dropabble-${dragOverSet.position}`}`}
            >
                <div onClick={() => setShowMoreOptions(p => !p)} style={{ display: "flex", alignItems: "center", width: '100%', position: 'relative', zIndex: '2' }}>
                    {selectPlaylist && <Checkbox
                        onClick={() => setSelectPlaylist(id, parentId)}
                        checked={selectedPlaylists[id]}
                        style={{
                            marginLeft: "10px",
                            marginTop: "6px",
                            marginRight: '10px'
                        }}
                    />}
                    <div className="playlist-details-icon" style={{ backgroundColor: color }}>
                        {isCustomIcons ?
                            <img src={icon} style={{ width: '24px' }} />
                            :
                            <span class="material-symbols-outlined unfollow">
                                {icon}
                            </span>
                        }
                    </div>
                    <h4
                        onPointerDown={() => {
                            globalThis.ADDING_TOPLAYLIST_TIMEOUT = setTimeout(() => {
                                globalThis.ADDING_TOPLAYLIST_TIMEOUT = null;
                                // Can be done any function
                                // hanldeAdd({ dataItem: list, bulkAdd: true });
                            }, 1000)
                        }}
                        onPointerUp={() => {
                            if (globalThis.ADDING_TOPLAYLIST_TIMEOUT) {
                                // UnComment if you want playlist to open
                                // toggleOpen();
                                clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT)
                            };
                        }}
                        onMouseLeave={() => {
                            if (globalThis.ADDING_TOPLAYLIST_TIMEOUT) clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT);
                        }}
                        onTouchEnd={() => {
                            if (globalThis.ADDING_TOPLAYLIST_TIMEOUT) clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT);
                        }}
                        className="playlist-action clear" style={{ display: "flex", height: 'max-content', alignItems: 'center', justifyContent: "space-between" }} >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <b style={{ textAlign: 'left' }}>{name}</b>
                            <p style={{ textAlign: 'left' }}>{description || "No Description"}</p>
                        </div>

                        {false && <span style={{ transform: id === opendedList ? "rotateZ(180deg)" : "", margin: '0', fontSize: '24px' }} class="material-symbols-outlined unfollow">
                            keyboard_arrow_down
                        </span>}
                    </h4>

                </div>

                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        right: '1rem',
                        transform: "translateY(-50%)",
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        color: '#D36433',
                        zIndex: '11'
                    }}
                >
                    {loading && <LoaderSecondary />}
                    {
                        !!copyURL && <span
                            class="material-symbols-outlined unfollow"
                            style={{
                                fontSize: "1.5rem",
                                color: 'inherit',
                                cursor: 'pointer'
                            }}
                            onClick={() => {
                                os.setClipboard(copyURL);
                                ShowNotification({ message: "Share URL Copied to textboard.", severity: "success" });
                            }}
                        >
                            copy_all
                        </span>
                    }
                    <div>
                    </div>
                    {false && !creatingPlaylist && !viewOnly && <span style={ButtonStyle} onClick={() => {
                        setShowMoreOptions(p => !p);
                    }} class="material-symbols-outlined unfollow">
                        more_vert
                    </span>}
                    <CircleProgress id={id} progress={`${percentageCompleted}`} />
                    {
                        !creatingPlaylist && !viewOnly ? !playingPlaylist
                            ?
                            <span
                                style={{
                                    ...ButtonStyle,
                                    fontSize: "1.97rem",
                                    color: "#000000",
                                    top: "51%",
                                    position: 'absolute',
                                    right: "0%",
                                    transform: `translate(0%, -50%)`,
                                }}
                                class="material-symbols-outlined unfollow"
                                onClick={() => {
                                    thisBot.Playlistplaying({
                                        playingPlaylist: playListSubId || id,
                                        startIndex: playListSubIndex !== null ? index : 0,
                                        startSubIndex: playListSubIndex !== null ? 0 : -1,
                                        parentId,
                                        name: name
                                    });
                                    setIsPlay(true);
                                    setTimeout(() => {
                                        setIsPlay(false);
                                        setTimeout(() => {
                                            setIsPlay(true);
                                            setTimeout(() => {
                                                setIsPlay(false);
                                            }, 150);
                                        }, 150);
                                    }, 150);

                                    // SetPlayingPlaylist(playListSubId || id);
                                    // toggleOpen();
                                    // thisBot.showInfo(`Playing Playlist!`);
                                }}
                            >
                                play_circle
                            </span>
                            :
                            <>
                                <span style={{
                                    ...ButtonStyle,
                                    color: '#139981'
                                }}

                                    onClick={() => {
                                        // os.unregisterApp("playing-playlist");
                                        globalThis.ToggleGreyCheckPLayingPlaylist && globalThis.ToggleGreyCheckPLayingPlaylist(null);
                                        // thisBot.showInfo(`History Mode!`);
                                    }} class="material-symbols-outlined unfollow">
                                    pause_circle
                                </span>
                                <span
                                    style={{
                                        fontSize: "12px",
                                        fontWeight: "400",
                                        color: '#139981'
                                    }}
                                >
                                    Now Playing
                                </span>
                            </>
                            :
                            null
                    }
                </div>
                <div style={{ height: id === opendedList ? "auto" : '0', transition: "all 0.2s linear", overflow: 'hidden', padding: "0 10px", zIndex: '1' }}>
                    {(checklistEnabled || readingPlanEnabled) && !viewOnly && <p className="align-center" style={{ justifyContent: "center" }}>
                        <span class="material-symbols-outlined unfollow" style={{ color: "lightgreen", marginRight: "8px" }}>
                            check_circle
                        </span>
                        <span>
                            {checklistEnabled ? "Checklist Enabled" : "Plan Enabled"}
                        </span>
                    </p>}
                    {list?.length === 0 && <h4 style={{ margin: "8px 0" }} >No Items Now.</h4>}
                    {
                        opendedList
                        &&
                        <DragDrop description={description} icon={icon} isCustomIcon={isCustomIcon} isCustomColor={isCustomColor} color={color} currentFormat={currentFormat} currentDateActive={currentDateActive} checkListData={checkListData} oldItemsMap={oldItemsMap} clickPass={clickPass} onLinking={onLink} playlistName={`${playlistParentName}${!!playlistParentName ? " - " : ''}${name}`} linkingMode={linkingMode} viewOnly={viewOnly} parentId={parentId} checklistEnabled={checklistEnabled} toggle={toggle} creatingPlaylist={creatingPlaylist} playingPlaylist={playingPlaylist} list={list} editDataFromPlaylist={editDataFromPlaylist} playListSubIndex={playListIndex} playListSubId={id} setPlaylistFromRow={setPlaylists} onClick={onClick} setList={setPlaylist} deleteFromList={deleteDataFromPlaylist} onClickItem={hanldeAdd} />
                    }
                </div>

            </div >
            {
                showMoreOptions &&
                <>
                    <div className="backdrop" onClick={() => setShowMoreOptions(false)} />

                    <div
                        onClick={() => setShowMoreOptions(false)}
                        style={{
                            ...getPosition(),
                            width: '200px',
                        }}
                        className="overlay linked-item-custom"

                    >
                        {
                            !creatingPlaylist && !viewOnly && !playingPlaylist &&
                            <>

                                <div className="more-menu-items"
                                    onClick={() => {
                                        setShowMoreOptions(false);

                                        globalThis[`SetEditModal`]({
                                            id,
                                            name,
                                            description,
                                            icon,
                                            isCustomColor,
                                            color,
                                            isCustomIcon,
                                            selectedTags
                                        });
                                        setShowMoreOptions(false);
                                    }}
                                >
                                    <p>Rename Playlist</p>
                                </div>
                                <div className="more-menu-items"
                                    onClick={() => {
                                        setShowMoreOptions(false);
                                        startEditingPlaylist(name, id, list, playListSubId, attachment, checklistEnabled, parentId, readingPlanEnabled, currentFormat, color, icon, isCustomColor, description, isCustomIcon, selectedTags);
                                        setShowMoreOptions(false);
                                    }}
                                >
                                    <p>Edit Playlist</p>
                                </div>
                            </>
                        }
                        <div className="more-menu-items"
                            onClick={() => {
                                thisBot.onDuplicatePlaylists({ id, parentId });
                                setShowMoreOptions(false);
                            }}
                        >
                            <p >
                                Duplicate Playlist
                            </p>
                        </div>
                        <div className="more-menu-items"
                            onClick={() => {
                                thisBot.onDownloadPlaylist({ id, parentId });
                                setShowMoreOptions(false);
                            }}
                        >
                            <p>
                                Download Playlist JSON
                            </p>
                        </div>
                        <div className="more-menu-items" onClick={copyClipBoard}>
                            <p>Share Playlist</p>
                        </div>
                        {
                            !creatingPlaylist && !viewOnly && !playingPlaylist && <div className="more-menu-items"
                                onClick={() => {
                                    deletePlayList(playListIndex);
                                    setShowMoreOptions(false);
                                    setShowMoreOptions(false);
                                }}
                            >
                                <p>Delete </p>
                            </div>}
                        {!creatingPlaylist && !viewOnly && !playingPlaylist && (!!playListSubId ? <div
                            className="more-menu-items"
                            onClick={() => {
                                exportNestedList();
                            }}>
                            <p

                            >
                                Export Outside
                            </p>
                            <span class="material-symbols-outlined unfollow" style={{ ...ButtonStyle, fontSize: '22px' }} >
                                call_split
                            </span>
                        </div> :
                            totalItem > 1 && !viewOnly && false ? <div className="more-menu-items"
                                onClick={() => {

                                    const isNested = list.some(item => item.type === "playlist");

                                    if (isNested) return ShowNotification({ message: "Cannot merge nested playlists!", severity: "error" });

                                    openMergeModal({
                                        id,
                                        parentId
                                    });
                                }}
                            >
                                <p>
                                    Merge Playlist
                                </p>
                                <span class="material-symbols-outlined unfollow" style={{ ...ButtonStyle, fontSize: '22px' }}>
                                    arrow_and_edge
                                </span>
                            </div> : ""
                        )}
                    </div>
                </>
            }
        </>
    )
}
// {totalItem > 1 && <span class="material-symbols-outlined" style={ButtonStyle} onClick={() => openMergeModal({
//                 id
//             })} >
//                 arrow_and_edge
//             </span>}

// We  will add Collections Later
//  {!playingPlaylist ? <div className="more-menu-items" onClick={onClickLinkPlaylist}>
//                                 <p>Add To Collection</p>
//                                 <span class="material-symbols-outlined" style={{ ...ButtonStyle, fontSize: '22px' }} >
//                                     linked_services
//                                 </span>
//                             </div> : null}


return PlaylistRowItem;