export async function FetchAnnotationContentInBg(that?: any) {
  const { playlistId } = that;
  const G = globalThis as any;

  if (!playlistId) return { success: false, data: null };
  const [authBotId, playlistid] = playlistId.split(G.RECORD_SEPARATOR);

  if (!authBotId || !playlistid) return { success: false, data: null };

  const res: any = await os.getData(authBotId, playlistid);

  G.LoadedPlaylistAnnotations[playlistid] = { ...res.data };

  return res;
}
