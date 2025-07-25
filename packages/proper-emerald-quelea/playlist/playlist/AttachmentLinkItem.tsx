const { useState, useEffect } = os.appHooks;
// check_circle
const { Input, Modal, Button, ButtonsCover, Checkbox } = Components;
const Linking = thisBot.LinkingItems();
const isMobile = gridPortalBot.tags.pixelWidth < MOBILE_VIEWPORT_THRESHOLD;

const AttachLinkItem = ({
    clickPass,
    activeItemID,
    playlistId,
    setRef,
    oldItemsMap,
    playlistName,
    linkingMode,
    viewOnly,
    checklistEnabled,
    checkListData,
    data,
    editDataFromPlaylist,
    creatingPlaylist,
    toggle,
    onClickItem,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    deleteFromList,
    originalIndex,
    index,
    playListSubIndex,
    onClick,
    setList,
    activeItemList,
    currentDateActive,
    originalList,
    datesRepeat,
    datesInWrongOrder,
    currentFormat
}) => {

    const [editDateModal, setEditDateModal] = useState(false);

    const [date, setDate] = useState(FORMAT_YYYY_MM_DD(data.additionalInfo.date || new Date()));
    const onDateSave = () => {
        setList(prev => {
            const old = [...prev];
            const index = old.findIndex(ele => ele.id === data.id);
            if (index > -1) {
                old[index] = {
                    ...old[index],
                    content: FORMAT_DATE(date),
                    additionalInfo: {
                        date: FORMAT_YYYY_MM_DD(date)
                    }
                }
            }
            return old;
        })
    }

    return <>
        {editDateModal && (
            <Modal title="Change Date" showIcon={false} onClose={() => setEditDateModal(false)}>
                <h3>Edit Date</h3>
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{
                        margin: "10px 0",
                        padding: "8px",
                        width: "100%",
                        boxSizing: "border-box",
                    }}
                />
                <ButtonsCover>
                    <Button secondary onClick={() => { onDateSave(); setEditDateModal(false); }}>
                        Save
                    </Button>
                    <Button secondaryAlt onClick={() => setEditDateModal(false)}>
                        Close
                    </Button>
                </ButtonsCover>
            </Modal >
        )}
        <div
            draggable={!viewOnly}
            // ref={ref => setRef.current[data.id] = ref}
            tabIndex={0}
            className={`history-item 
                ${currentDateActive === data.id && "current-date-active"} 
                ${datesRepeat[data.id] && "current-date-repeat"} 
                ${datesInWrongOrder[data.id] && "current-date-disorder"} 
                ${(data.id === activeItemID || activeItemList[data.id]) && "current-playing-item"} 
                ${oldItemsMap[data.id] ? 'greyed-out' : ''}
            `}
            onPointerDown={() => {
                if (data.type === "date") return;
                globalThis.ADDING_TOPLAYLIST_TIMEOUT = setTimeout(() => {
                    globalThis.ADDING_TOPLAYLIST_TIMEOUT = null;
                    onClickItem({ dataItem: data })
                }, 1000)
            }}
            onPointerUp={() => {
                if (globalThis.ADDING_TOPLAYLIST_TIMEOUT) {
                    clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT)
                    globalThis.ADDING_TOPLAYLIST_TIMEOUT = null;
                }
            }}
            onMouseLeave={() => {
                if (globalThis.ADDING_TOPLAYLIST_TIMEOUT) clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT);
            }}
            onTouchEnd={() => {
                if (globalThis.ADDING_TOPLAYLIST_TIMEOUT) clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT);
            }}
            onDragStart={() => {
                handleDragStart(index, data.id);
            }}
            onDragOver={() => handleDragOver(originalIndex)}
            onDragEnd={handleDragEnd}
        >
            <input
                style={{ opacity: '0', 'pointer-events': 'none', position: 'absolute', 'left': 0, 'top': 0, zIndex: -1 }}
                placeholder={'test'}
                ref={(ref) => {
                    if (setRef && setRef[data.id]) {
                        setRef[data.id].current = ref
                    }
                }}
            />
            <div className="start-actions">
                {data.type !== "heading" && data.type !== "date" && checklistEnabled && !viewOnly ?
                    <Checkbox
                        small
                        checked={checkListData[data.id] || data.readAlready}
                        onClick={() => {
                            editDataFromPlaylist(data.id, false);
                        }}
                    />
                    :
                    null
                }
                {data.type !== 'heading' && <span
                    onClick={() => {
                        if (data.type === "date" && creatingPlaylist && !viewOnly) {
                            setEditDateModal(true);
                        }
                    }}
                    class="material-symbols-outlined unfollow drag-item-icon"
                >
                    {data.type === "date" ? 'calendar_month' : 'media_link'}
                </span>}
            </div>
            <p
                onPointerUp={() => {
                    if (data.type === "date") return;
                    if (creatingPlaylist) {
                        thisBot.RenderLinkContent({ ...data });
                    }
                    if (globalThis.ADDING_TOPLAYLIST_TIMEOUT) {
                        clearInterval(globalThis.ADDING_TOPLAYLIST_TIMEOUT)
                        globalThis.ADDING_TOPLAYLIST_TIMEOUT = null;
                        // thisBot.RenderLinkContent(data);
                        onClick({ dataItem: data, index: originalIndex });
                        if (checklistEnabled) {
                            editDataFromPlaylist(data.id);
                        }
                        // globalThis.SetCurreIndexPlaylist && globalThis.SetCurreIndexPlaylist(index, playListSubIndex);
                    }
                    if (clickPass) {
                        // thisBot.RenderLinkContent(data);
                        onClick({ dataItem: data, index: originalIndex });
                        if (checklistEnabled) {
                            editDataFromPlaylist(data.id);
                        }
                        // globalThis.SetCurreIndexPlaylist && globalThis.SetCurreIndexPlaylist(index, playListSubIndex);
                    }
                }}
                className={`attachment-link ${data.type === "heading" ? 'no-left-padding' : data.type !== "date" && checklistEnabled && !viewOnly ? "checklistEnabled" : ''} playlist-item-type playlist-item-verse ${toggle === data.id && "current-playing-item"}`}
            >
                {data.type === "date" ? FORMAT_DATE(data?.additionalInfo.date, currentFormat) : data?.content}
            </p>
            <div className="actions">
                {false && <a style={{ marginLeft: "10px" }} target="_blank" rel="noreferrer" href={data.additionalInfo?.link}>🔗</a>}
                {creatingPlaylist && !viewOnly && <p className={`${isMobile && "visible"} end-icon without-right-margin`} onClick={() => deleteFromList(originalIndex)} >
                    <span class="material-symbols-outlined unfollow delete-icon">
                        delete
                    </span>
                </p>}


                {false && <Linking linkingMode={linkingMode} playlistName={playlistName} data={data} playListId={playlistId} />}
            </div>
        </div>
    </>
}

return AttachLinkItem;