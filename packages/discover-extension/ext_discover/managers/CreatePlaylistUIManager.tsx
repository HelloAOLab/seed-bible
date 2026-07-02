import { computed, effect, signal } from "@preact/signals";
import { resetPlaylistGlobalStateVars } from "ext_discover.helper.resetPlaylistGlobalStateVars";
import { getPlaylistManager } from "ext_discover.managers.PlaylistManager";
import { startCreatingPlaylist } from "ext_discover.hooks.startCreatingPlaylist";
import type {
  CreatePlaylistUIManager,
  CreatePlaylistUIManagerInit,
} from "ext_discover.interfaces.managers.CreatePlaylistUIManager";

const G = globalThis as Record<string, any>;

const managersById = new Map<string, CreatePlaylistUIManager>();

function resetRetainDataGlobals(): void {
  G.RetainDataData = false;
  G.RetainDataSelectedType = null;
  G.RetainDataName = "";
  G.RetainDataLink = "";
  G.RetainDataLinkState = null;
  G.RetainDataLinkStateType = "";
  G.RetainDataLinkStateSubType = "";
  G.RetainDataLinkStateIsValid = false;
}

export function getCreatePlaylistUIManager(
  id: string,
  init: CreatePlaylistUIManagerInit
): CreatePlaylistUIManager {
  const key = `create-${id}`;
  const existing = managersById.get(key);
  if (existing) {
    existing.syncInit(init);
    return existing;
  }

  const manager = createCreatePlaylistUIManager(id, init);
  managersById.set(key, manager);
  return manager;
}

function createCreatePlaylistUIManager(
  id: string,
  init: CreatePlaylistUIManagerInit
): CreatePlaylistUIManager {
  const PlaylistModeTypes = G.PlaylistModeTypes as Record<string, string>;

  const uiCreatingPlaylist = signal(false);
  const creatingPlaylistDep = signal(true);
  const mode = signal(
    init.editData?.address
      ? PlaylistModeTypes.annotations
      : G[`${id}mode`] || PlaylistModeTypes.playlist
  );
  const isTempEdit = { current: false };
  const setTabRef = { current: init.setTab };
  const editData = signal(init.editData);

  const setCreatingPlaylistParent = (value: boolean) => {
    uiCreatingPlaylist.value = value;
  };

  effect(() => {
    creatingPlaylistDep.value = !uiCreatingPlaylist.value;
  });

  const playlist = getPlaylistManager(`create-${id}`, {
    creatingPlaylist: creatingPlaylistDep,
    setCreatingPlaylistParent,
    thisBot: (G.Playlist ?? G.thisBot) as Record<string, unknown>,
  });

  effect(() => {
    playlist.openModalName.value = !!init.isCreate;
    playlist.isCreate.value = init.isCreate;
    playlist.isLayers.value = init.isLayers;
    playlist.layers.value = init.isLayers;
  });

  effect(() => {
    G[`${id}mode`] = mode.value;
  });

  effect(() => {
    if (!playlist.openModalName.value) {
      playlist.editId.current = false;
    }
  });

  const editorVisible = computed(() => !uiCreatingPlaylist.value);

  const onCreateTabSave = () => {
    if (!playlist.playList.value.length) {
      ShowNotification({
        message: t("pleaseAddSomeItemsToSavePlaylist"),
        severity: "error",
      });
      return;
    }
    if (playlist.layers.value) {
      const checkEmbed = playlist.playList.value.some(
        (ele: any) => !ele.additionalInfo.layers?.length
      );
      if (checkEmbed) {
        playlist.setLayersWarning(true);
        return;
      }
    }
    resetRetainDataGlobals();
    playlist.setOpenAttachLink(false);
    startCreatingPlaylist("", playlist.playList.value, id);
  };

  const discardCreateProgress = () => {
    G[`${id}currentPlaylist`] = [];
    resetPlaylistGlobalStateVars();
    setTabRef.current?.("discover");
  };

  const syncInit = (next: CreatePlaylistUIManagerInit) => {
    setTabRef.current = next.setTab;
    editData.value = next.editData;
    playlist.isLayers.value = next.isLayers;
    playlist.layers.value = next.isLayers;
    if (next.isCreate !== undefined) {
      playlist.isCreate.value = next.isCreate;
    }
  };

  const setMode = (value: string) => {
    mode.value = value;
  };

  return {
    id,
    playlist,
    uiCreatingPlaylist,
    mode,
    setMode,
    isTempEdit,
    editData,
    onCreateTabSave,
    discardCreateProgress,
    syncInit,
    editorVisible,
  };
}
