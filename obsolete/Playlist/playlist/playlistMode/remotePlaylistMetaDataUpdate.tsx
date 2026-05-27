const playlistUpdated = that.playlistUpdated;
const indexesUpdate = that.indexesUpdate;
const G = globalThis as any;
if (indexesUpdate) {
  G.SetCurreIndexDirect?.(that.currIndex);
  G.UPDATE_VIA_SHOUT = true;
}

if (playlistUpdated) {
  G.SetPlayingList?.(that.playlists);
  G.UPDATE_VIA_SHOUT = true;
}
