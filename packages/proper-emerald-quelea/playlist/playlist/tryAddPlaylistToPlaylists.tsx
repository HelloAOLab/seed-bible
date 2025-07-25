const attachment = that?.attachment;
const id = that?.id;
const checklistEnabled = that?.checklist;
const readingPlanEnabled = that?.readingPlan;
const currentFormat = that?.currentFormat;
const color = that?.color;
const icon = that?.icon;
const isCustomColor = that?.isCustomColor;
const isCustomIcon = that?.isCustomIcon;
const description = that?.description;
const selectedTags = that?.selectedTags;

const editId = globalThis[`${id}isEditMode`];
const isEditModeSubID = globalThis[`${id}isEditModeSubID`];

if (globalThis.makingPlaylist) {
    const dataItem = {
        name: globalThis[`${id}creatingPlaylistName`].trim(),
        list: globalThis[`${id}currentPlaylist`],
        id: editId || createUUID(),
        nesting: 1,
        toggleRender: false,
        attachment,
        checklistEnabled,
        readingPlanEnabled,
        dateFormat: currentFormat,
        color,
        icon,
        isCustomColor,
        isCustomIcon,
        description,
        selectedTags
    };

    if (isEditModeSubID) {
        dataItem.type = "playlist";
    }


    if (globalThis[`${id}AddPlaylist`]) {
        globalThis[`${id}AddPlaylist`](dataItem, editId, isEditModeSubID);
    } else {
        if (globalThis[`${id}playlists`]) {
            if (editId) {
                if (isEditModeSubID) {
                    const subIndex = globalThis[`${id}playlists`].findIndex(pl => pl.id === isEditModeSubID);
                    const index = globalThis[`${id}playlists`][subIndex].list.findIndex(pl => pl.id === id);
                    if (dataItem.list.length === 0 && !dataItem.attachment) {
                        globalThis[`${id}playlists`][subIndex].list.splice(index, 1);
                    } else {
                        globalThis[`${id}playlists`][subIndex].list[index] = dataItem;
                    }
                } else {
                    const index = globalThis[`${id}playlists`].findIndex(pl => pl.id === id);
                    if (dataItem.list.length === 0 && !dataItem.attachment) {
                        globalThis[`${id}playlists`].splice(index, 1);
                    } else {
                        globalThis[`${id}playlists`][index] = dataItem;
                    }
                }

            } else {
                if (!dataItem.list?.length) return os.toast("Play list is empty!")
                globalThis[`${id}playlists`].push(dataItem);
            }
        } else {
            globalThis[`${id}playlists`] = [dataItem];
        }
        setPlaylistLocale(globalThis[`${id}playlists`], id);
    }
}
