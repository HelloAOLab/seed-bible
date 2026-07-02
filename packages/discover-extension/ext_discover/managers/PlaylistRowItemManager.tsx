import { effect, signal } from "@preact/signals";
import { openMergeModal } from "ext_discover.helper.openMergeModal";
import { navigationWithDataItem } from "ext_discover.helper.navigationWithDataItem";
import { onDownloadPlaylist } from "ext_discover.helper.onDownloadPlaylist";
import { onDuplicatePlaylists } from "ext_discover.helper.onDuplicatePlaylists";
import { tryAddDataToPlaylist } from "ext_discover.helper.tryAddDataToPlaylist";
import { runPlaylistPlaying } from "ext_discover.helper.runPlaylistPlaying";
import { DEFAULT_PROFILE_URL } from "ext_discover.models.playlistRowItem";
import type {
  PlaylistRowItemManager,
  PlaylistRowItemRowContext,
} from "ext_discover.interfaces.managers.PlaylistRowItemManager";

const G = globalThis as Record<string, any>;

const managersByRowId = new Map<string, PlaylistRowItemManager>();

export function getPlaylistRowItemManager(
  rowId: string
): PlaylistRowItemManager {
  const existing = managersByRowId.get(rowId);
  if (existing) return existing;

  const manager = createPlaylistRowItemManager(rowId);
  managersByRowId.set(rowId, manager);
  return manager;
}

export function createPlaylistRowItemManager(
  rowId: string
): PlaylistRowItemManager {
  const warningMessage = signal<string | null>(null);
  const showMoreOptions = signal(false);
  const isPlay = signal(false);
  const loading = signal(false);
  const copyURL = signal<string | null>(null);
  const addToQueuePopup = signal(false);

  let touchTimer: ReturnType<typeof setTimeout> | null = null;

  const resolveThisBot = (ctx: PlaylistRowItemRowContext) =>
    ctx.thisBot ?? G.thisBot;

  const setWarningMessage = (value: string | null) => {
    warningMessage.value = value;
  };

  const setShowMoreOptions = (
    value: boolean | ((prev: boolean) => boolean)
  ) => {
    showMoreOptions.value =
      typeof value === "function" ? value(showMoreOptions.value) : value;
  };

  const setIsPlay = (value: boolean) => {
    isPlay.value = value;
  };

  const setLoading = (value: boolean) => {
    loading.value = value;
  };

  const setCopyURL = (value: string | null) => {
    copyURL.value = value;
  };

  const setAddToQueuePopup = (value: boolean) => {
    addToQueuePopup.value = value;
  };

  const onCloseWarningPopup = () => {
    warningMessage.value = null;
  };

  const handleTouchStart = (e: { currentTarget: Element }) => {
    const rect = e.currentTarget.getBoundingClientRect();
    G.LastClickX = Math.max(rect.left, 10);
    G.LastClickY = rect.bottom;
    touchTimer = setTimeout(() => {
      setShowMoreOptions((p) => !p);
    }, 1000);
  };

  const handleTouchEnd = () => {
    if (touchTimer) {
      clearTimeout(touchTimer);
      touchTimer = null;
    }
  };

  const openContextMenu = (e: {
    preventDefault: () => void;
    currentTarget: Element;
  }) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    G.LastClickX = rect.left;
    G.LastClickY = rect.bottom;
    setShowMoreOptions((p) => !p);
  };

  const setPlaylist = (
    ctx: PlaylistRowItemRowContext,
    newList: Record<string, unknown>[]
  ) => {
    const { playListSubIndex, playListIndex, setPlaylists } = ctx;
    setPlaylists((prev) => {
      const old = [...prev];
      if (playListSubIndex || playListSubIndex === 0) {
        const subList = old[playListSubIndex] as Record<string, unknown> & {
          list: Record<string, unknown>[];
        };
        const playlist = subList.list[playListIndex] as Record<
          string,
          unknown
        > & {
          list: Record<string, unknown>[];
        };
        playlist.list = newList;
      } else {
        (
          old[playListIndex] as Record<string, unknown> & {
            list: Record<string, unknown>[];
          }
        ).list = newList;
      }
      return old;
    });
  };

  const deleteDataFromPlaylist = (
    ctx: PlaylistRowItemRowContext,
    index: number | string[]
  ) => {
    const { playListSubIndex, playListIndex, setPlaylists } = ctx;
    const idsMap: Record<string, boolean> = {};
    const isArray = Array.isArray(index);
    if (isArray) index.forEach((itemId) => (idsMap[itemId] = true));

    setPlaylists((prev) => {
      const old = [...prev];
      if (playListSubIndex || playListSubIndex === 0) {
        const subList = old[playListSubIndex] as Record<string, unknown> & {
          list: Array<
            Record<string, unknown> & { list: Record<string, unknown>[] }
          >;
        };
        let oldList = [...subList.list[playListIndex].list];
        if (isArray) {
          oldList = oldList.filter((data) => !idsMap[data.id as string]);
        } else {
          oldList.splice(index as number, 1);
        }
        if (oldList.length === 0) {
          subList.list.splice(playListIndex, 1);
        } else {
          subList.list[playListIndex].list = oldList;
        }
      } else {
        let oldList = [
          ...(
            old[playListIndex] as Record<string, unknown> & {
              list: Record<string, unknown>[];
            }
          ).list,
        ];
        if (isArray) {
          oldList = oldList.filter((data) => !idsMap[data.id as string]);
        } else {
          oldList.splice(index as number, 1);
        }
        if (oldList.length === 0) {
          old.splice(playListIndex, 1);
        } else {
          (
            old[playListIndex] as Record<string, unknown> & {
              list: Record<string, unknown>[];
            }
          ).list = oldList;
        }
      }
      return old;
    });
  };

  const editDataFromPlaylist = (
    ctx: PlaylistRowItemRowContext,
    index: number | number[],
    isGroup: boolean,
    newVal = false
  ) => {
    const { playListSubIndex, playListIndex, setPlaylists } = ctx;
    setPlaylists((prev) => {
      const old = [...prev];
      if (playListSubIndex || playListSubIndex === 0) {
        const playlist = (
          old[playListSubIndex] as Record<string, unknown> & {
            list: Array<
              Record<string, unknown> & {
                list: Array<{ readAlready?: boolean }>;
              }
            >;
          }
        ).list[playListIndex];
        if (isGroup) {
          (index as number[]).forEach((i) => {
            playlist.list[i].readAlready = newVal;
          });
        } else {
          playlist.list[index as number].readAlready =
            !playlist.list[index as number].readAlready;
        }
      } else {
        const playlist = old[playListIndex] as Record<string, unknown> & {
          list: Array<{ readAlready?: boolean }>;
        };
        if (isGroup) {
          (index as number[]).forEach((i) => {
            playlist.list[i].readAlready = newVal;
          });
        } else {
          playlist.list[index as number].readAlready =
            !playlist.list[index as number].readAlready;
        }
      }
      return old;
    });
  };

  const deletePlayList = (ctx: PlaylistRowItemRowContext) => {
    const { id, playListSubIndex, setPlaylists } = ctx;
    setPlaylists((prev) => {
      const old = [...prev];
      let itemIndex = old.findIndex((ele) => ele.id === id);
      if (playListSubIndex || playListSubIndex === 0) {
        itemIndex = (
          old[playListSubIndex] as Record<string, unknown> & {
            list: Array<{ id: string }>;
          }
        ).list.findIndex((ele) => ele.id === id);
      }
      if (itemIndex > -1) {
        if (playListSubIndex || playListSubIndex === 0) {
          (
            old[playListSubIndex] as Record<string, unknown> & {
              list: unknown[];
            }
          ).list.splice(itemIndex, 1);
        } else {
          old.splice(itemIndex, 1);
        }
      }
      return old;
    });
  };

  const exportNestedList = (ctx: PlaylistRowItemRowContext) => {
    const { playListSubIndex, playListIndex, setPlaylists } = ctx;
    setPlaylists((prev) => {
      const old = [...prev];
      const subIndex = playListSubIndex as number;
      const playlist = {
        ...(
          old[subIndex] as Record<string, unknown> & {
            list: Record<string, unknown>[];
          }
        ).list[playListIndex],
      };
      playlist.nesting = 1;
      old.splice(subIndex + 1, 0, playlist);
      (
        old[subIndex] as Record<string, unknown> & { list: unknown[] }
      ).list.splice(playListIndex, 1);
      return old;
    });
  };

  const hanldeAdd = (
    ctx: PlaylistRowItemRowContext,
    params: { dataItem: unknown; bulkAdd: boolean }
  ) => {
    const { creatingPlaylist } = ctx;
    const bot = resolveThisBot(ctx);
    if (creatingPlaylist) {
      tryAddDataToPlaylist(params);
    } else {
      void navigationWithDataItem(params, bot);
    }
  };

  const onClick = (
    ctx: PlaylistRowItemRowContext,
    params: { dataItem: unknown; bulkAdd: boolean; index: number }
  ) => {
    const { playListSubIndex } = ctx;
    const bot = resolveThisBot(ctx);
    G.SetCurreIndexPlaylist?.(params.index, playListSubIndex);
    void navigationWithDataItem(params, bot);
  };

  const copyClipBoard = async (ctx: PlaylistRowItemRowContext) => {
    const {
      id,
      name,
      list,
      attachment,
      icon,
      isCustomIcon,
      color,
      isCustomColor,
      description,
      thisBot,
    } = ctx;
    const bot = thisBot ?? G.thisBot;

    if (!configBot.tags.pattern) {
      return ShowNotification({
        message: t("playlistShareError"),
        severity: "error",
      });
    }

    const authBot = await os.requestAuthBotInBackground();

    if (!authBot?.id) {
      return ShowNotification({
        message: t("pleaseLoginToUseFeature"),
        severity: "error",
      });
    }

    setLoading(true);
    let shareProfileName = "Guest";
    let shareProfilePic = DEFAULT_PROFILE_URL;
    if (authBot?.id) {
      const data = await os.getData(bot?.tags?.keyFetchAccountData, authBot.id);
      if (data.success) {
        const payload = data.data;
        shareProfileName = payload.profileName || "Guest";
        shareProfilePic = payload.photoLink || DEFAULT_PROFILE_URL;
      }
    }

    const playlistObj = {
      id,
      name,
      list,
      nesting: 1,
      toggleRender: false,
      attachment,
      icon,
      isCustomIcon,
      color,
      isCustomColor,
      description,
      icons: G.PREDEFINED_ICONS,
      shareProfileName,
      shareProfilePic,
      sharerID: authBot?.id || "N/A",
    };

    const sanitizedItem = G.sanitizeObject(playlistObj);
    const deployBot = configBot.tags.pattern
      ? configBot.tags.pattern
      : configBot.tags.ab;
    const key = configBot.tags.pattern ? "pattern" : "ab";

    const result = await os.recordData(
      authBot?.id,
      playlistObj.id,
      playlistObj,
      {
        marker: "publicRead",
      }
    );

    const recordShareKey = `${authBot?.id}^_^${playlistObj.id}`;

    if (result.success) {
      const shareURL = `https://ao.bot/?${key}=${deployBot}&Playlist=${recordShareKey}&noGridPortal=true`;
      os.setClipboard(shareURL);
      setShowMoreOptions(false);
      setCopyURL(shareURL);
      ShowNotification({
        message: t("shareURLCopied"),
        severity: "success",
      });
    } else {
      ShowNotification({
        message: t("unableToCopy"),
        severity: "error",
      });
    }
    setLoading(false);
  };

  const openMergeModalHandler = (params: { id: string; parentId: string }) => {
    openMergeModal(params);
  };

  const onPlayPlaylist = (
    ctx: PlaylistRowItemRowContext,
    bypassQueue?: boolean
  ) => {
    const {
      playListSubId,
      id,
      playListSubIndex,
      index,
      parentId,
      name,
      thisBot,
    } = ctx;
    const bot = thisBot ?? G.thisBot;

    globalThis.SetIsBottomBar?.(false);
    if (G.IsQueuePresent) {
      if (!bypassQueue) {
        setAddToQueuePopup(true);
        return;
      }
      ShowNotification({
        message: t("addToTheCurrentQueue"),
        severity: "success",
      });
    }

    void runPlaylistPlaying({
      playingPlaylist: playListSubId || id,
      startIndex:
        playListSubIndex !== null && playListSubIndex !== undefined ? index : 0,
      startSubIndex:
        playListSubIndex !== null && playListSubIndex !== undefined ? 0 : -1,
      parentId,
      name,
    });

    setAddToQueuePopup(false);
    setIsPlay(true);
    setTimeout(() => {
      setIsPlay(false);
      setTimeout(() => {
        setIsPlay(true);
        setTimeout(() => {
          setIsPlay(false);
        }, 150);
      }, 150);
    }, 150);
  };

  const toggleOpen = (ctx: PlaylistRowItemRowContext) => {
    const { id, setOpenedList } = ctx;
    setOpenedList((prev) => (prev === id ? "" : id));
  };

  effect(() => {
    G[`updatePercent${rowId}`] = () => {};
    return () => {
      G[`updatePercent${rowId}`] = null;
    };
  });

  return {
    warningMessage,
    showMoreOptions,
    isPlay,
    loading,
    copyURL,
    addToQueuePopup,
    setWarningMessage,
    setShowMoreOptions,
    setIsPlay,
    setLoading,
    setCopyURL,
    setAddToQueuePopup,
    onCloseWarningPopup,
    handleTouchStart,
    handleTouchEnd,
    openContextMenu,
    setPlaylist,
    deleteDataFromPlaylist,
    editDataFromPlaylist,
    deletePlayList,
    exportNestedList,
    hanldeAdd,
    onClick,
    copyClipBoard,
    openMergeModal: openMergeModalHandler,
    onPlayPlaylist,
    toggleOpen,
  };
}
