const { playlistId } = that;

if(!playlistId) return { success: false, data: null };
const [authBotId, playlistid] = playlistId.split(globalThis.RECORD_SEPARATOR);

if(!authBotId || !playlistid) return { success: false, data: null };

const res = await os.getData(authBotId, playlistid);

globalThis.LoadedPlaylistAnnotations[playlistid] = {...res.data};

return res;