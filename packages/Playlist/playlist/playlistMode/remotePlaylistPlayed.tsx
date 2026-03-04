const playlist = that.playlist;
const features = that.features;
const G = globalThis;
thisBot.OpenSelf();
G.RemotePlaylistPlayed = true;
thisBot.Playlistplaying({ features, playlist, remoteClick: true });
