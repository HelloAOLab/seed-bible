const id = that.id;
const G = globalThis as any;
G[`${id}SetPlaylistName`] && G[`${id}SetPlaylistName`]("");
G[`${id}ResetPlaylist`] && G[`${id}ResetPlaylist`]();
G[`${id}currentPlaylist`] = [];
G[`${id}creatingPlaylistName`] = "";
G[`${id}creatingPlaylist`] = false;
G[`${id}isEditMode`] = null;
G[`${id}isEditModeSubID`] = null;
G[`${id}SetCreatingPlaylist`] && G[`${id}SetCreatingPlaylist`](false);
// thisBot.showInfo(`History Mode`);
G[`${id}SetDontOpenPlaylist`] && G[`${id}SetDontOpenPlaylist`](false);
os.unregisterApp("controlButtons");
G.SetEditData({
  color: null,
  id: null,
  name: null,
  description: null,
  icon: null,
});
