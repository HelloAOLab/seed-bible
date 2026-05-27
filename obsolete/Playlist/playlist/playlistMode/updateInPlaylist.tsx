const { dataItem, playlistID } = that;
const G = globalThis as any;
const parentId = "default";

if (dataItem.content === "undefined") return;
if (!dataItem || !dataItem.type || !dataItem.content)
  return os.toast("Invalid Data format!");

const playlists = G[`${parentId}playlists`];
const index = playlists.findIndex((ele: any) => ele.id === playlistID);

const lastData = playlists[index].list[playlists[index].list.length - 1];
const isSame = G.objectComparator(dataItem, lastData, ["content"]);

if (isSame) {
  ShowNotification({ message: "Last item repeated!", severity: "error" });
  return;
}

function safeStringify(obj: any) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[Circular]";
      }
      seen.add(value);
    }
    return value;
  });
}

if (index > -1) {
  const oldList = [...playlists[index].list];

  const item = JSON.parse(safeStringify(dataItem));
  oldList.push(item);
  playlists[index].list = oldList;
}

G[`${parentId}playlists`] = playlists;
if (G[`${parentId}SetPlaylists`]) {
  G[`${parentId}SetPlaylists`](playlists);
  G[`setRenderAgain`]((p) => p + 1);
}
setPlaylistLocale(playlists, parentId);
