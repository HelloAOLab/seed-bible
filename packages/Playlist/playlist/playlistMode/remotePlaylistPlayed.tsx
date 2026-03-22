const playlist = that.playlist;
const features = that.features;
const G = globalThis as any;
thisBot.OpenSelf();
G.RemotePlaylistPlayed = true;
thisBot.Playlistplaying({ features, playlist, remoteClick: true });
