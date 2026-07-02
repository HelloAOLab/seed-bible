const G = globalThis as Record<string, any>;

export function getAddNewPlaylistList(options: {
  renameScreen?: boolean;
  id: string;
  editId: string | false;
  list: any[];
}): any[] {
  const { renameScreen, id, editId, list } = options;
  if (renameScreen) {
    return (
      G[`${id}playlists`]?.find((ele: { id: string }) => ele.id === editId)
        ?.list || []
    );
  }
  return list;
}
