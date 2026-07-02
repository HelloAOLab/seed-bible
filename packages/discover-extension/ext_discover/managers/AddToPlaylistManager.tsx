import { computed, signal } from "@preact/signals";
import type { AddToPlaylistManager } from "ext_discover.interfaces.managers.AddToPlaylistManager";

const G = globalThis as Record<string, any>;

const managersById = new Map<string, AddToPlaylistManager>();

export function getAddToPlaylistManager(id: string): AddToPlaylistManager {
  const existing = managersById.get(id);
  if (existing) return existing;

  const manager = createAddToPlaylistManager(id);
  managersById.set(id, manager);
  return manager;
}

function createAddToPlaylistManager(id: string): AddToPlaylistManager {
  const playLists = signal<any[]>(G[`${id}playlists`] || []);

  const filteredPlaylist = computed(() => {
    const owned: any[] = [];
    playLists.value.forEach((ele: any) => {
      if (ele.shareProfileName && ele.sharerID !== G.authBot?.id) {
        return;
      }
      owned.push({ ...ele });
    });
    return owned;
  });

  const setPlayLists: AddToPlaylistManager["setPlayLists"] = (value) => {
    playLists.value =
      typeof value === "function" ? value(playLists.value) : value;
  };

  const onSelectPlaylist = (playlistId: string, onClose: () => void) => {
    if (G[`${id}SetPlaylists`]) {
      G[`${id}SetPlaylists`]((prev: any[]) => {
        const old = [...prev];
        const index = old.findIndex((ele) => ele.id === playlistId);
        if (index > -1) {
          old[index].list = [...old[index].list, ...G.AddToPlaylistData];
        }
        return old;
      });
    }
    const items = [...(G.AddToPlaylistData || [])];
    const playlistIds = items.reduce(
      (acc: Record<string, boolean>, ele: any) => {
        acc[ele.id] = true;
        return acc;
      },
      {}
    );
    G.LasttAddedToPlaylist = playlistIds;
    const verses = items
      .map((ele) => ele.additionalInfo.verse)
      .sort((a, b) => a - b);
    const ranges = G.GetVerseSummaryHeading(verses);
    const heading = `${items[0].content.split(":")[0]}:${ranges.join(", ")}`;

    ShowNotification({
      message: t("headingAddedToPlaylist", { heading }),
      severity: "success",
      onUndoActions: () => {
        G[`${id}SetPlaylists`]((prev: any[]) => {
          const old = [...prev];
          const index = old.findIndex((ele) => ele.id === playlistId);
          if (index > -1) {
            old[index].list = old[index].list.filter(
              (ele: any) => !G.LasttAddedToPlaylist[ele.id]
            );
          }
          return old;
        });
        ShowNotification({
          message: t("undoActionSuccessfull", { heading }),
          severity: "success",
        });
      },
    });
    onClose();
  };

  const onAddNewPlaylist = (onClose: () => void) => {
    G[`${id}currentPlaylist`] = G.AddToPlaylistData;
    G.SetTab("create");
    G[`${id}mode`] = G.PlaylistModeTypes.playlist;
    onClose();
  };

  const mount = () => {
    playLists.value = G[`${id}playlists`] || [];
  };

  const unmount = () => {
    G.AddToPlaylistData = null;
  };

  return {
    playLists,
    filteredPlaylist,
    onSelectPlaylist,
    onAddNewPlaylist,
    setPlayLists,
    mount,
    unmount,
  };
}
