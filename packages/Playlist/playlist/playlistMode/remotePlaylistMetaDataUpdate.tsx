const playlistUpdated = that.playlistUpdated;
const indexesUpdate = that.indexesUpdate;

if (indexesUpdate) {
  globalThis.SetCurreIndexDirect?.(that.currIndex);
  globalThis.UPDATE_VIA_SHOUT = true;
}

if (playlistUpdated) {
  globalThis.SetPlayingList?.(that.playlists);
  globalThis.UPDATE_VIA_SHOUT = true;
}
