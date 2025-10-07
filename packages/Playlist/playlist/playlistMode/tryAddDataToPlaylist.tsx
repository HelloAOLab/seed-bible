if (globalThis.makingPlaylist) {
  let { dataItem, bulkAdd } = that;

  const combineLast = that.combineLast;

  if (bulkAdd) {
    dataItem = dataItem.map((data) => {
      data.id = createUUID();
      return data;
    });
  } else {
    if (!dataItem.id) {
      dataItem.id = createUUID();
    }
  }

  if (bulkAdd && !dataItem?.length) return os.toast("Cannot add empty list!");
  const idsActive = ["default"];

  idsActive.forEach((id) => {
    if (globalThis[`${id}creatingPlaylist`] || that.force) {
      if (globalThis[`${id}AddDataToPlaylist`]) {
        globalThis[`${id}AddDataToPlaylist`](dataItem, bulkAdd, combineLast);
      } else {
        const oldItems = [...(globalThis[`${id}currentPlaylist`] || [])];
        if (combineLast) oldItems.pop();

        if (oldItems) {
          if (bulkAdd) {
            globalThis[`${id}currentPlaylist`] = [...oldItems, ...dataItem];
            return;
          }
          const lastData = oldItems[oldItems.length - 1];
          const isSame = objectComparator(dataItem, lastData, ["content"]);
          if (!isSame) {
            globalThis[`${id}currentPlaylist`].push(dataItem);
          } else {
            // os.toast("Last item repeated!");
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
  });
}
