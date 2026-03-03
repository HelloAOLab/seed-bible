const G = globalThis as any;
if (G[`${"default"}creatingPlaylist`]) {
  let { dataItem, bulkAdd } = that;

  const combineLast = that.combineLast;

  if (bulkAdd) {
    dataItem = dataItem.map((data: any) => {
      data.id = G.createUUID();
      return data;
    });
  } else {
    if (!dataItem.id) {
      dataItem.id = G.createUUID();
    }
  }

  if (bulkAdd && !dataItem?.length) return os.toast("Cannot add empty list!");
  const idsActive = ["default"];

  idsActive.forEach((id) => {
    if (G[`${id}creatingPlaylist`] || that.force) {
      if (G[`${id}AddDataToPlaylist`]) {
        G[`${id}AddDataToPlaylist`](dataItem, bulkAdd, combineLast);
      } else {
        const oldItems = [...(G[`${id}currentPlaylist`] || [])];
        if (combineLast) oldItems.pop();

        if (oldItems) {
          if (bulkAdd) {
            G[`${id}currentPlaylist`] = [...oldItems, ...dataItem];
            return;
          }
          const lastData = oldItems[oldItems.length - 1];
          const isSame = G.objectComparator(dataItem, lastData, ["content"]);
          if (!isSame) {
            G[`${id}currentPlaylist`].push(dataItem);
          } else {
            // os.toast("Last item repeated!");
          }
        } else {
          if (bulkAdd) {
            G[`${id}currentPlaylist`] = [...dataItem];
            return;
          } else {
            G[`${id}currentPlaylist`] = [dataItem];
          }
        }
      }
    }
  });
}
