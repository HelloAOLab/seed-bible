const id = that.id;

globalThis[`${id}SetPlaylistName`] && globalThis[`${id}SetPlaylistName`]("");
globalThis[`${id}ResetPlaylist`] && globalThis[`${id}ResetPlaylist`]();
globalThis[`${id}currentPlaylist`] = [];
globalThis[`${id}creatingPlaylistName`] = "";
globalThis[`${id}creatingPlaylist`] = false;
globalThis[`${id}isEditMode`] = null;
globalThis[`${id}isEditModeSubID`] = null;
globalThis[`${id}SetCreatingPlaylist`] && globalThis[`${id}SetCreatingPlaylist`](false);
// thisBot.showInfo(`History Mode`);
globalThis[`${id}SetDontOpenPlaylist`] && globalThis[`${id}SetDontOpenPlaylist`](false);
os.unregisterApp("controlButtons");

globalThis.SetEditData({
    color: null,
    id: null,
    name: null,
    description: null,
    icon: null
});