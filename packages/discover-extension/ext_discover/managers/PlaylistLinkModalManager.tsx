import { effect, signal } from "@preact/signals";
import { cursorReset } from "ext_discover.helper.cursorReset";
import {
  clearCurrentActiveLinkItemFloat,
  getCurrentActiveLinkItemFloat,
} from "ext_discover.helper.activeLinkItemFloat";
import type { PlaylistLinkModalManager } from "ext_discover.interfaces.managers.PlaylistLinkModalManager";
import type { PlaylistLinkModalOptions } from "ext_discover.interfaces.helper.openPlaylistLinkModal";

const G = globalThis as Record<string, any>;

const APP_NAME = "playlist-link-modal";

let singleton: PlaylistLinkModalManager | undefined;
let collectionEditEffectCleanup: (() => void) | undefined;

function buildPlaylistToLink(opts: PlaylistLinkModalOptions) {
  const { parentId, id, idsMap, currentCollection, name } = opts;
  let playlistToLink: Record<string, any>[] = [];
  let initialName = "";

  if (idsMap) {
    const ids = Object.keys(idsMap);
    const tempArray: Record<string, any>[] = [];
    ids.forEach((playlistId) => {
      const pId = idsMap[playlistId];
      const originalPlaylist = G[`${pId}playlists`] || [];
      const plylist = {
        ...originalPlaylist.find((pl: any) => pl.id === playlistId),
      };
      plylist.parentId = pId;
      tempArray.push(plylist);
    });
    playlistToLink = [...tempArray];
  } else if (parentId && id) {
    const originalPlaylist = G[`${parentId}playlists`] || [];
    playlistToLink = [{ ...originalPlaylist.find((pl: any) => pl.id === id) }];
    playlistToLink[0].parentId = parentId;
  } else {
    playlistToLink = [...(currentCollection || [])];
    initialName = name || "";
  }

  return {
    playlistToLink: G.CLONE_DATA(playlistToLink),
    initialName,
    sourceId: id,
  };
}

export function getPlaylistLinkModalManager(): PlaylistLinkModalManager {
  if (!singleton) {
    singleton = createPlaylistLinkModalManager();
  }
  return singleton;
}

export function createPlaylistLinkModalManager(): PlaylistLinkModalManager {
  const addList = signal(false);
  const name = signal("");
  const playbackListID = signal("");
  const playlistId = signal("");
  const collection = signal<Record<string, any>[]>([]);
  const initialName = signal("");
  const sourceId = signal<string | undefined>(undefined);
  const allPlaylistGroups = signal<Record<string, any>>({});

  const close = () => {
    cleanup();
    os.unregisterApp(APP_NAME);
    os.unregisterApp("mouseCursor");
  };

  const onCurrentCollectionEdit = (props: Record<string, any>) => {
    const {
      data,
      playlistName,
      playListId,
      isDelete = false,
      index,
      removeID,
    } = props;
    const currentData = getCurrentActiveLinkItemFloat();

    if (currentData?.id === data.id) {
      clearCurrentActiveLinkItemFloat();
      cursorReset();
      ShowNotification({
        message: t("cannotLinkWithItself"),
        severity: "error",
      });
      return;
    }

    if (isDelete) {
      const old = collection.value.map((entry) => ({
        ...entry,
        list: (entry.list || []).map((item: any) => ({
          ...item,
          links: item.links ? [...item.links] : item.links,
        })),
      }));
      const firstI = old.findIndex((e) => e.id === playListId);
      if (firstI > -1) {
        const secondIndex = old[firstI].list.findIndex(
          (e: any) => e.id === removeID
        );
        if (secondIndex > -1 && old[firstI].list[secondIndex].links) {
          old[firstI].list[secondIndex].links.splice(index, 1);
        }
      }
      collection.value = old;
    } else if (currentData) {
      const old = [...collection.value];
      const firstI = old.findIndex((e) => e.id === currentData.playListId);
      if (firstI > -1) {
        const secondIndex = old[firstI].list.findIndex(
          (e: any) => e.id === currentData.id
        );
        if (secondIndex > -1) {
          const listCopy = [...old[firstI].list];
          const listItem = { ...listCopy[secondIndex] };
          if (listItem.links) {
            const isPresent =
              listItem.links.findIndex((d: any) => d.id === data.id) > -1;
            if (isPresent) {
              ShowNotification({
                message: t("alreadyLinkedWithTheItem"),
                severity: "error",
              });
            } else {
              listItem.links = [
                ...listItem.links,
                { ...data, playlistName, playListId },
              ];
            }
          } else {
            listItem.links = [{ ...data, playlistName, playListId }];
          }
          listCopy[secondIndex] = listItem;
          old[firstI] = { ...old[firstI], list: listCopy };
          collection.value = old;
        }
      }
    }

    clearCurrentActiveLinkItemFloat();
    cursorReset();
  };

  const registerCollectionEditHandler = () => {
    collectionEditEffectCleanup?.();
    effect(() => {
      collection.value;
      G.onCurrentCollectionEdit = onCurrentCollectionEdit;
      return () => {
        G.onCurrentCollectionEdit = null;
      };
    });
    collectionEditEffectCleanup = () => {
      G.onCurrentCollectionEdit = null;
    };
  };

  const cleanup = () => {
    collectionEditEffectCleanup?.();
    collectionEditEffectCleanup = undefined;
    G.onCurrentCollectionEdit = null;
  };

  const init = (opts: PlaylistLinkModalOptions) => {
    const built = buildPlaylistToLink(opts);
    addList.value = false;
    name.value = built.initialName;
    playbackListID.value = "";
    playlistId.value = "";
    collection.value = built.playlistToLink;
    initialName.value = built.initialName;
    sourceId.value = built.sourceId;
    allPlaylistGroups.value = G.PlaylistsGroups || {};
    registerCollectionEditHandler();
  };

  const onCloseAddList = () => {
    playbackListID.value = "";
    playlistId.value = "";
    addList.value = false;
  };

  const saveCollections = () => {
    if (!name.value) {
      ShowNotification({
        message: t("pleaseEnterAName"),
        severity: "error",
      });
      return;
    }
    const namesPresent = Object.keys(G.COLLECTIONS || {})
      .map((ele) => G.COLLECTIONS[ele].name)
      .filter((n) => n !== initialName.value);
    if (
      namesPresent.findIndex(
        (nam) =>
          nam.toLocaleLowerCase() === name.value.trim().toLocaleLowerCase()
      ) > -1
    ) {
      ShowNotification({
        message: t("nameAlreadyPresent"),
        severity: "error",
      });
      return;
    }
    const idNew = G.EDIT_COLLECTION_ID || G.createUUID();
    const entry = {
      collection: collection.value,
      name: name.value.trim(),
    };
    if (G.COLLECTIONS) {
      G.COLLECTIONS = { ...G.COLLECTIONS, [idNew]: entry };
    } else {
      G.COLLECTIONS = { [idNew]: entry };
    }
    if (G.COLLECTION_SETTER) {
      G.COLLECTION_SETTER(G.COLLECTIONS);
    }
    G.EDIT_COLLECTION_ID = null;
    close();
  };

  const removeFromCollection = (collId: string) => {
    if (sourceId.value === collId) {
      ShowNotification({
        message: t("cannotDeleteOriginalPlaylist"),
        severity: "error",
      });
      return;
    }
    collection.value = collection.value.filter((c) => c.id !== collId);
  };

  const addPlaylistToCollection = () => {
    if (collection.value.findIndex((pl) => pl.id === playlistId.value) > -1) {
      ShowNotification({
        message: t("playlistAlreadyPresent"),
        severity: "error",
      });
      return;
    }
    const pl = G[`${playbackListID.value}playlists`].find(
      (ele: any) => ele.id === playlistId.value
    );
    collection.value = [...collection.value, pl];
    onCloseAddList();
  };

  const getPlaybackOptions = () =>
    Object.keys(allPlaylistGroups.value).map((groupId, i) => ({
      label: `Playback List ${i + 1}`,
      value: groupId,
    }));

  const getPlaylistOptions = () =>
    (G[`${playbackListID.value}playlists`] || []).map((playlist: any) => ({
      label: playlist.name,
      value: playlist.id,
    }));

  return {
    addList,
    name,
    playbackListID,
    playlistId,
    collection,
    initialName,
    sourceId,
    allPlaylistGroups,
    init,
    cleanup,
    onCurrentCollectionEdit,
    onCloseAddList,
    saveCollections,
    close,
    removeFromCollection,
    addPlaylistToCollection,
    getPlaybackOptions,
    getPlaylistOptions,
  };
}
