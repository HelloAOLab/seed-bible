const playlist = that.playlist;
const features = that.features;
thisBot.OpenSelf();
globalThis.RemotePlaylistPlayed = true;
thisBot.Playlistplaying({ features, playlist, remoteClick: true });
