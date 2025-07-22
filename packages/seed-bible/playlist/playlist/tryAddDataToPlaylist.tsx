if (globalThis.makingPlaylist) {
    let { dataItem, bulkAdd } = that;
    console.log("Data Item", dataItem);
    if (bulkAdd) {
        dataItem = dataItem.map(data => {
            data.id = createUUID();
            return data;
        })
    } else {
        if (!dataItem.id) {
            dataItem.id = createUUID();
        }
    }

    if (bulkAdd && !dataItem?.length) return os.toast("Cannot add empty list!");
    const idsActive = that.playlistID ? [that.playlistID] : Object.keys(PlaylistsGroups).filter(key => PlaylistsGroups[key].active);
    idsActive.forEach(id => {
        if (globalThis[`${id}creatingPlaylist`] || that.force) {
            if (globalThis[`${id}AddDataToPlaylist`]) {
                globalThis[`${id}AddDataToPlaylist`](dataItem, bulkAdd);
            } else {
                if (globalThis[`${id}currentPlaylist`]) {
                    if (bulkAdd) {
                        globalThis[`${id}currentPlaylist`] = [...globalThis[`${id}currentPlaylist`], ...dataItem];
                        return;
                    }
                    const lastData = globalThis[`${id}currentPlaylist`][globalThis[`${id}currentPlaylist`].length - 1];
                    const isSame = objectComparator(dataItem, lastData, ["content"]);
                    if (!isSame) {
                        globalThis[`${id}currentPlaylist`].push(dataItem);
                    } else {
                        os.toast("Last item repeated!");
                    }
                } else {
                    if (bulkAdd) {
                        globalThis[`${id}currentPlaylist`] = [...dataItem];
                        return;
                    } else {
                        globalThis[`${id}currentPlaylist`] = [dataItem];
                    }
                }

            }
        }
    })
}
