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
const isLayers = that?.isLayers;
const access = that?.access;
const G = globalThis;
const editId = G[`${id}isEditMode`];
const isEditModeSubID = G[`${id}isEditModeSubID`];

if (G.makingPlaylist) {
  const dataItem: any = {
    name: G[`${id}creatingPlaylistName`].trim(),
    list: G[`${id}currentPlaylist`],
    id: editId || G.createUUID(),
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
    selectedTags,
    isLayers,
    access,
  };

  if (isEditModeSubID) {
    dataItem.type = "playlist";
  }

  if (G[`${id}AddPlaylist`]) {
    G[`${id}AddPlaylist`](dataItem, editId, isEditModeSubID);
  } else {
    if (G[`${id}playlists`]) {
      if (editId) {
        if (isEditModeSubID) {
          const subIndex = G[`${id}playlists`].findIndex(
            (pl: any) => pl.id === isEditModeSubID
          );
          const index = G[`${id}playlists`][subIndex].list.findIndex(
            (pl: any) => pl.id === id
          );
          if (dataItem.list.length === 0 && !dataItem.attachment) {
            G[`${id}playlists`][subIndex].list.splice(index, 1);
          } else {
            G[`${id}playlists`][subIndex].list[index] = dataItem;
          }
        } else {
          const index = G[`${id}playlists`].findIndex(
            (pl: any) => pl.id === id
          );
          if (dataItem.list.length === 0 && !dataItem.attachment) {
            G[`${id}playlists`].splice(index, 1);
          } else {
            G[`${id}playlists`][index] = dataItem;
          }
        }
      } else {
        if (!dataItem.list?.length) return os.toast("Play list is empty!");
        G[`${id}playlists`].push(dataItem);
      }
    } else {
      G[`${id}playlists`] = [dataItem];
    }
    G.setPlaylistLocale(G[`${id}playlists`], id);
  }
}
