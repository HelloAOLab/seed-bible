import { computed, effect, signal } from "@preact/signals";
import { createControlButtons } from "ext_discover.helper.createControlButtons";
import { openPlaylistLinkModal } from "ext_discover.helper.openPlaylistLinkModal";
import { RegenratePlaylistWithNewCommand } from "ext_discover.helper.RegenratePlaylistWithNewCommand";
import { buildPlaylistFromAI } from "ext_discover.helper.buildPlaylistFromAI";
import { getSuggestedListItems } from "ext_discover.helper.getSuggestedListItems";
import { resetPlaylistGlobalStateVars } from "ext_discover.helper.resetPlaylistGlobalStateVars";
import { tryAddDataToPlaylist } from "ext_discover.helper.tryAddDataToPlaylist";
import { startCreatingPlaylist } from "ext_discover.hooks.startCreatingPlaylist";
import {
  AI_OPTIONS,
  DEFAULT_UPLOAD_ICON,
} from "ext_discover.models.playlistConstants";
import type {
  PlaylistManager,
  PlaylistManagerDeps,
} from "ext_discover.interfaces.managers.PlaylistManager";
import type { DiscoverChipSelection } from "ext_discover.models.discover";
import type { OverlayPosition } from "ext_discover.models.playlist";

const G = globalThis as Record<string, any>;

const managersById = new Map<string, PlaylistManager>();

function getInitialPosition(): OverlayPosition {
  const getPosition = G.getPosition as (() => OverlayPosition) | undefined;
  return getPosition ? getPosition() : { x: 0, y: 0 };
}

function getControlButtons(
  id: string,
  thisBot?: Record<string, unknown>
): { onSave: PlaylistManager["onSave"]; onClose: () => void } {
  return createControlButtons({
    id,
    thisBot: thisBot as Record<string, any> | undefined,
  });
}

export function getPlaylistManager(
  id: string,
  deps: PlaylistManagerDeps
): PlaylistManager {
  const existing = managersById.get(id);
  if (existing) return existing;

  const manager = createPlaylistManager(id, deps);
  managersById.set(id, manager);
  return manager;
}

export function createPlaylistManager(
  id: string,
  deps: PlaylistManagerDeps
): PlaylistManager {
  G.DEFAULT_UPLOAD_ICON = DEFAULT_UPLOAD_ICON;

  const { onSave, onClose } = getControlButtons(id, deps.thisBot);

  const query = signal("");
  const selectedChip = signal<DiscoverChipSelection>({ All: true });
  const isLayers = signal<boolean | undefined>(undefined);
  const isCreate = signal<boolean | undefined>(undefined);

  const mediaURL = signal("");
  const videoSrc = signal<boolean | string>(false);
  const currentItem = signal<Record<string, unknown>>({});
  const selectedAI = signal(AI_OPTIONS[0]?.value || "");

  const showPlaylistSettings = signal(false);
  const showMoreOptions = signal(false);
  const itemSelected = signal<string | null>(null);
  const hasGenrated = signal(false);
  const selectedTags = signal<string[]>([]);
  const selectPlaylist = signal(false);
  const checkListData = signal<Record<string, boolean>>({});
  const checkListEmbeded = signal<
    Record<string, { idFinal: string; pId: string }>
  >({});
  const checklistEnabled = signal(!!G.ChecklistEnabledRestorePlaylist);
  const embedding = signal<string | null>(null);
  const layers = signal<boolean | undefined>(undefined);
  const searchText = signal("");
  const regenrateUI = signal(false);
  const layersWarning = signal(false);
  const dataWarning = signal(false);
  const loseProgressWarning = signal(false);
  const openAttachLink = signal(false);
  const attachment = signal<unknown>(G[`${id}Attachments`] || null);
  const openModal = signal(false);
  const mergeMode = signal(false);
  const renderAgain = signal(0);
  const checklist = signal(!!G.ChecklistEnabledRestorePlaylist);
  const readingPlan = signal(false);
  const currentFormat = signal("MM-DD-YYYY");
  const currentPromptText = signal("prompt");
  const systemPrompt = signal(G.SYSTEM_PROMPT || "");
  const openModalName = signal(!!G.OpenModalEditName);
  const renamingPlaylist = signal(!!G.RenamingPlaylist);
  const autoGenerateOn = signal(false);
  const genDetails = signal("");
  const loading = signal(false);
  const name = signal(G[`${id}creatingPlaylistName`] || "");
  const link = signal("");
  const publishAccess = signal(G.PublishAccessRestorePlaylist || "public");
  const customColor = signal("#D3643329");
  const selectedColor = signal("#D9D9D9");
  const selectedIcon = signal<string | null>(
    G.SelectedIconRestorePlaylist || null
  );
  const description = signal(G.DescriptionRestorePlaylist || "");
  const customIcon = signal<string | null>(G.CustomIconRestorePlaylist || null);
  const playLists = signal<any[]>(G[`${id}playlists`] || []);
  const selectedPlaylist = signal<Record<string, boolean | string>>({});
  const playList = signal<any[]>(G[`${id}currentPlaylist`] || []);
  const hasOldList = signal(false);
  const oldListSnapshot = signal<any[]>([]);
  const blinkAfterPlaylistAdd = signal(false);
  const showMorePosition = signal<OverlayPosition>(getInitialPosition());
  const showPlaylistPosition = signal<OverlayPosition>(getInitialPosition());
  const playlistListUiElement = signal<HTMLDivElement | null>(null);
  const editId = { current: G.EditIDRestore || false };

  const isSomethingChecked = computed(
    () => Object.keys(checkListData.value).length > 0
  );
  const isSomethingEmbededChecked = computed(
    () => Object.keys(checkListEmbeded.value).length > 0
  );
  const sharedFilterPlaylists = computed(() => {
    const q = query.value.toLocaleLowerCase();
    const shared: any[] = [];
    playLists.value.forEach((ele: any) => {
      const playlistName = ele.name?.toLocaleLowerCase();
      const des = ele.description?.toLocaleLowerCase();
      if (playlistName?.includes(q) || des?.includes(q)) {
        if (ele.shareProfileName && ele.sharerID !== G.authBot?.id) {
          shared.push({ ...ele });
        }
      }
    });
    return shared;
  });
  const filteredPlaylist = computed(() => {
    const q = query.value.toLocaleLowerCase();
    const owned: any[] = [];
    playLists.value.forEach((ele: any) => {
      const playlistName = ele.name?.toLocaleLowerCase();
      const des = ele.description?.toLocaleLowerCase();
      if (playlistName?.includes(q) || des?.includes(q)) {
        if (!ele.shareProfileName || ele.sharerID === G.authBot?.id) {
          owned.push({ ...ele });
        }
      }
    });
    return owned;
  });

  const setPlaylist = (value: any[] | ((prev: any[]) => any[])) => {
    playList.value =
      typeof value === "function" ? value(playList.value) : value;
  };

  const setPlayLists = (value: any[] | ((prev: any[]) => any[])) => {
    playLists.value =
      typeof value === "function" ? value(playLists.value) : value;
  };

  const setTags = (value: string[] | ((prev: string[]) => string[])) => {
    selectedTags.value =
      typeof value === "function" ? value(selectedTags.value) : value;
  };

  const setName = (value: string) => {
    name.value = value;
  };

  const setLink = (value: string) => {
    link.value = value;
  };

  const setLoading = (value: boolean) => {
    loading.value = value;
  };

  const setOpenModalName = (value: boolean) => {
    openModalName.value = value;
  };

  const setRenamingPlaylist = (value: boolean) => {
    renamingPlaylist.value = value;
  };

  const setCustomIcon = (value: string | null) => {
    customIcon.value = value;
  };

  const setCustomColor = (value: string) => {
    customColor.value = value;
  };

  const setSelectedColor = (value: string) => {
    selectedColor.value = value;
  };

  const setSelectedIcon = (value: string | null) => {
    selectedIcon.value = value;
  };

  const setDescription = (value: string) => {
    description.value = value;
  };

  const setPublishAccess = (value: string) => {
    publishAccess.value = value;
  };

  const setItemSelected = (value: string | null) => {
    itemSelected.value = value;
  };

  const setChecklistData = (
    value:
      | Record<string, boolean>
      | ((prev: Record<string, boolean>) => Record<string, boolean>)
  ) => {
    checkListData.value =
      typeof value === "function" ? value(checkListData.value) : value;
  };

  const setChecklistEmbeded = (
    value:
      | Record<string, { idFinal: string; pId: string }>
      | ((
          prev: Record<string, { idFinal: string; pId: string }>
        ) => Record<string, { idFinal: string; pId: string }>)
  ) => {
    checkListEmbeded.value =
      typeof value === "function" ? value(checkListEmbeded.value) : value;
  };

  const setEmbedding = (value: string | null | false) => {
    embedding.value = value === false ? null : value;
  };

  const setRegenrateUI = (value: boolean) => {
    regenrateUI.value = value;
  };

  const setGenDetails = (value: string) => {
    genDetails.value = value;
  };

  const setSystemPrompt = (value: string) => {
    systemPrompt.value = value;
  };

  const setCurrentPromptText = (value: string) => {
    currentPromptText.value = value;
  };

  const setSelectedAI = (value: string) => {
    selectedAI.value = value;
  };

  const setAutoGenerateOn = (value: boolean | ((prev: boolean) => boolean)) => {
    autoGenerateOn.value =
      typeof value === "function" ? value(autoGenerateOn.value) : value;
  };

  const setShowPlaylistSettings = (value: boolean) => {
    showPlaylistSettings.value = value;
  };

  const setShowMoreOptions = (value: boolean) => {
    showMoreOptions.value = value;
  };

  const setDataWarning = (value: boolean) => {
    dataWarning.value = value;
  };

  const setLoseProgressWarning = (value: boolean) => {
    loseProgressWarning.value = value;
  };

  const setLayersWarning = (value: boolean) => {
    layersWarning.value = value;
  };

  const setOpenModal = (value: boolean) => {
    openModal.value = value;
  };

  const setMergeMode = (value: boolean) => {
    mergeMode.value = value;
  };

  const setOpenAttachLink = (value: boolean) => {
    openAttachLink.value = value;
  };

  const setChecklist = (value: boolean | ((prev: boolean) => boolean)) => {
    checklist.value =
      typeof value === "function" ? value(checklist.value) : value;
  };

  const setAttachment = (value: unknown) => {
    attachment.value = value;
  };

  const setMediaURL = (value: string) => {
    mediaURL.value = value;
  };

  const setVideoSrc = (value: boolean | string) => {
    videoSrc.value = value;
  };

  const setCurrentItem = (value: Record<string, unknown>) => {
    currentItem.value = value;
  };

  const setPlaylistListUiElement = (el: HTMLDivElement | null) => {
    playlistListUiElement.value = el;
  };

  const syncProps = (props: {
    query: string;
    selectedChip: DiscoverChipSelection;
    isLayers?: boolean;
    isCreate?: boolean;
  }) => {
    query.value = props.query;
    selectedChip.value = props.selectedChip;
    isLayers.value = props.isLayers;
    isCreate.value = props.isCreate;
    if (props.isLayers !== undefined && layers.value === undefined) {
      layers.value = props.isLayers;
    }
  };

  const runBlinkLastPlaylistItem = () => {
    const root = playlistListUiElement.value;
    if (!root) return;
    const nodes = root.querySelectorAll(".playlist-item-type");
    const last = nodes[nodes.length - 1] as HTMLElement | undefined;
    if (!last) return;
    last.classList.remove("playlist-item-blink");
    void last.offsetWidth;
    const done = () => {
      last.classList.remove("playlist-item-blink");
    };
    const safety = window.setTimeout(done, 900);
    last.addEventListener(
      "animationend",
      () => {
        window.clearTimeout(safety);
        done();
      },
      { once: true }
    );
    last.classList.add("playlist-item-blink");
    last.scrollIntoView({ behavior: "smooth" });
  };

  const editPlaylistData = (
    idRec: string,
    newValueContent: Record<string, unknown>,
    parentId: string | null = null,
    fullData = false,
    isQuotedText?: boolean
  ) => {
    setPlaylist((prev: any[]) => {
      const old = [...prev];
      if (parentId) {
        const parentIdx = old.findIndex((e) => e.id === parentId);
        if (parentIdx > -1) {
          const idx = old[parentIdx].additionalInfo.layers.findIndex(
            (e: any) => e.id === idRec
          );
          if (idx > -1) {
            if (fullData) {
              old[parentIdx].additionalInfo.layers[idx] = {
                ...newValueContent,
              };
            } else {
              old[parentIdx].additionalInfo.layers[idx] = {
                ...old[parentIdx].additionalInfo.layers[idx],
                content: newValueContent,
              };
              if (isQuotedText !== undefined) {
                old[parentIdx].additionalInfo.layers[
                  idx
                ].additionalInfo.isQuotedText = isQuotedText;
              }
            }
          }
        }
      } else {
        const idx = old.findIndex((e) => e.id === idRec);
        if (idx > -1) {
          if (fullData) {
            old[idx] = { ...newValueContent };
          } else {
            old[idx] = { ...old[idx], content: newValueContent };
            if (isQuotedText !== undefined) {
              old[idx].additionalInfo.isQuotedText = isQuotedText;
            }
          }
        }
      }
      return old;
    });
  };

  const addDataToPlaylist = (
    data: any,
    isBulk = false,
    combineLast = false,
    setDirect = false
  ) => {
    if (setDirect) {
      setPlaylist(data);
      return;
    }

    if (isBulk) {
      setPlaylist((prev: any[]) => [...prev, ...data]);
      return;
    }

    setPlaylist((prev: any[]) => {
      const old = [...prev];
      if (combineLast) old.pop();
      const lastData = old[old.length - 1];
      const isSame = G.objectComparator(data, lastData, ["content"]);
      if (!isSame) {
        old.push(data);
        blinkAfterPlaylistAdd.value = true;
      }
      return old;
    });
  };

  const resetPlayist = () => {
    setPlaylist([]);
    setLink("");
    setAttachment(null);
    setChecklist(false);
  };

  const addPlaylist = (
    data: any,
    playlistId: string | false = false,
    subId: string | null = null
  ) => {
    setPlayLists((p: any[]) => {
      const old = [...p];
      G.AlreadySet = true;
      if (playlistId) {
        if (subId) {
          const subIndex = G[`${id}playlists`].findIndex(
            (pl: any) => pl.id === subId
          );
          const index = G[`${id}playlists`][subIndex].list.findIndex(
            (pl: any) => pl.id === playlistId
          );
          if (data.list.length === 0 && !old[subIndex].list[index].attachment) {
            old[subIndex].list[index].splice(index, 1);
          } else {
            old[subIndex].list[index] = data;
          }
        } else {
          const index = old.findIndex((pl) => pl.id === playlistId);
          if (data.list.length === 0 && !old[index].attachment) {
            old.splice(index, 1);
          } else {
            old[index] = data;
          }
        }
      } else {
        G[`${"default"}playlists`] = old;
        if (data.list.length === 0) return old;
        old.push(data);
      }
      G[`${"default"}playlists`] = old;
      return old;
    });
  };

  const deleteDataFromPlaylist = (
    index: number | number[],
    pId: string | null = null
  ) => {
    setPlaylist((prev: any[]) => {
      const isBulk = Array.isArray(index);
      const idMaps: Record<string, boolean> = {};
      let old = [...prev];
      if (pId) {
        const indexParent = old.findIndex((ele) => ele.id === pId);
        if (indexParent > -1) {
          old[indexParent].additionalInfo.layers.splice(index, 1);
        }
      } else if (isBulk) {
        (index as number[]).forEach((ele) => {
          idMaps[ele] = true;
        });
        old = old.filter(({ id: itemId }) => !idMaps[itemId]);
      } else {
        old.splice(index as number, 1);
      }
      return old;
    });
  };

  const deleteDateData = () => {
    setPlaylist((prev: any[]) => prev.filter((ele) => ele.type !== "date"));
  };

  const setCreatingPlaylist = (value: boolean, list: any[] = []) => {
    const anyDate = list.findIndex((ele) => ele.type === "date") > -1;
    readingPlan.value = anyDate;
    deps.setCreatingPlaylistParent(value);
    setPlaylist(list);
  };

  const onSearchHit = async () => {
    const allItems = getSuggestedListItems({ searchText: searchText.value });
    searchText.value = "";
    setPlaylist((prev: any[]) => [...prev, ...allItems]);
  };

  const toggleOpenModalName = (val: boolean) => {
    setOpenModalName(val);
    if (G.SetRenamingPlaylist) G.SetRenamingPlaylist(val);
  };

  const toggleSelectedPlaylist = (playlistId: string, parentID: string) => {
    selectedPlaylist.value = (() => {
      const old: Record<string, boolean | string> = {
        ...selectedPlaylist.value,
      };
      old[playlistId] = old[playlistId] ? false : parentID || true;
      return old;
    })();
  };

  const setEditModal = (props: Record<string, unknown>) => {
    const {
      id: editModalId,
      color,
      isCustomColor,
      icon,
      name: editName,
      description: des,
      isCustomIcon,
      selectedTags: tags,
      isLayers: editLayers,
    } = props;
    setName(editName as string);
    if (isCustomColor) setCustomColor(color as string);
    if (isCustomIcon) setCustomIcon(icon as string | null);
    setSelectedColor(color as string);
    setSelectedIcon(icon as string | null);
    setDescription(des as string);
    setTags((tags as string[]) || []);
    layers.value = editLayers as boolean;
    editId.current = editModalId as string;
    setTimeout(() => {
      toggleOpenModalName(true);
    }, 10);
  };

  const checkNameDuplicate = (newName: string) => {
    const nameValue = (newName || name.value).trim();
    if (!nameValue) {
      ShowNotification({
        message: t("playlistNameNotFound"),
        severity: "error",
      });
      return true;
    }
    const names = playLists.value.map((ele: any) => ele.name);
    if (names.includes(nameValue) && !editId.current) {
      ShowNotification({
        message: t("playlistNameAlreadyPresent"),
        severity: "error",
      });
      return true;
    }
    return false;
  };

  const attachLink = (
    title: string,
    linkUrl: string,
    linkState: Record<string, unknown>
  ) => {
    const dataItem = {
      content: title,
      additionalInfo: {
        link: linkUrl,
        ...linkState,
      },
      type: linkState.type === "text" ? "heading" : "attachment-link",
    };
    if (itemSelected.value) {
      setPlaylist((old: any[]) => {
        const prev = [...old];
        const index = prev.findIndex((ele) => ele.id === itemSelected.value);
        const targetVerse = prev[index];
        targetVerse.additionalInfo.layers = [
          {
            id: G.createUUID(),
            content: title,
            additionalInfo: {
              link: linkUrl,
              ...linkState,
            },
            type: linkState.type === "text" ? "heading" : "attachment-link",
          },
          ...(targetVerse.additionalInfo.layers || []),
        ];
        prev[index] = targetVerse;
        return prev;
      });
      setTimeout(() => {
        G[`${itemSelected.value}OpenToggle`](true);
      }, 300);
    } else {
      tryAddDataToPlaylist({ dataItem });
    }
    setOpenAttachLink(false);
  };

  const massAdd = (items: any[]) => {
    if (itemSelected.value) {
      setPlaylist((old: any[]) => {
        const prev = [...old];
        const index = prev.findIndex((ele) => ele.id === itemSelected.value);
        const targetVerse = prev[index];
        targetVerse.additionalInfo.layers = [
          ...items,
          ...(targetVerse.additionalInfo.layers || []),
        ];
        prev[index] = targetVerse;
        return prev;
      });
      setTimeout(() => {
        G[`${itemSelected.value}OpenToggle`](true);
      }, 300);
    } else {
      items.forEach((item) => {
        tryAddDataToPlaylist({ dataItem: { ...item } });
      });
    }
    setOpenAttachLink(false);
  };

  const attachDate = (date: string = "") => {
    readingPlan.value = true;
    tryAddDataToPlaylist({
      dataItem: {
        content: G.FORMAT_DATE(
          date.replaceAll("/", "-") || new Date(),
          "DEFAULT",
          "MM-DD-YYYY"
        ),
        additionalInfo: {
          date: G.FORMAT_YYYY_MM_DD(
            new Date(`${date.replaceAll("/", "-")} 12:00:00`) || new Date()
          ),
        },
        type: "date",
      },
    });
  };

  const onBulkDelete = () => {
    setPlayLists((prev: any[]) =>
      prev.filter((pl) => !selectedPlaylist.value[pl.id])
    );
    selectedPlaylist.value = {};
  };

  const onBulkJsonDownload = () => {
    const listToDownload: any[] = [];
    playLists.value.forEach((props: any) => {
      const { list, id: playlistID } = props;
      if (selectedPlaylist.value[playlistID]) {
        list.forEach((ele: any) => {
          listToDownload.push({
            ...ele,
            id: G.createUUID(),
          });
        });
      }
    });
    const jsonStr = JSON.stringify(listToDownload, null, 2);
    os.download(jsonStr, `BulkPlaylist.json`);
    selectedPlaylist.value = {};
  };

  const onBulkAddToCollection = () => {
    openPlaylistLinkModal({
      idsMap: selectedPlaylist.value as Record<string, string>,
    });
  };

  const onRegenration = async () => {
    oldListSnapshot.value = JSON.parse(JSON.stringify(playList.value));
    if (loading.value) {
      ShowNotification({
        message: t("regenrationInProgress"),
        severity: "error",
      });
      return;
    }
    const oldData = JSON.stringify(playList.value);
    setLoading(true);
    try {
      const { allItems } = await RegenratePlaylistWithNewCommand({
        aiModal: selectedAI.value,
        oldData,
        systemPrompt: systemPrompt.value,
        command: genDetails.value,
      });
      setLoading(false);
      if (!allItems?.length) {
        ShowNotification({
          message: t("unableToGeneratePlaylist"),
          severity: "error",
        });
        return;
      }
      hasOldList.value = true;
      setPlaylist(allItems);
      hasGenrated.value = true;
      setRegenrateUI(false);
    } catch {
      setLoading(false);
      ShowNotification({
        message: t("regenerationFailed"),
        severity: "error",
      });
    }
  };

  const onRevert = () => {
    hasOldList.value = false;
    setPlaylist(oldListSnapshot.value);
  };

  const editDataFromPlaylist = (receivedIds: string | string[]) => {
    let ids = Array.isArray(receivedIds) ? [...receivedIds] : [receivedIds];
    setChecklistData((prev) => {
      const old = { ...prev };
      ids.forEach((idEle: string) => {
        if (old[idEle]) {
          delete old[idEle];
        } else {
          old[idEle] = true;
        }
      });
      return old;
    });
  };

  const onBulkDeleteItems = () => {
    setPlaylist((prev: any[]) =>
      prev.filter(
        (ele) => !checkListData.value[ele.id] && embedding.value !== ele.id
      )
    );
    setChecklistData({});
    setEmbedding(null);
    setChecklistEmbeded({});
  };

  const onEmbedItems = () => {
    let embededItem: string | null = null;
    if (!embedding.value) return;

    playList.value.forEach((ele: any) => {
      if (checkListData.value[ele.id] && ele.id !== embedding.value) {
        if (ele.additionalInfo?.layers?.length) {
          embededItem = ele.content;
        }
      }
    });

    if (embededItem) {
      ShowNotification({
        message: t("cannotEmbedEmbeddedItem", { embededItem }),
        severity: "error",
      });
      return;
    }

    setPlaylist((prev: any[]) => {
      const oldItems: any[] = [];
      const newLayers: any[] = [];
      const old = [...prev];
      old.forEach((ele) => {
        if (checkListData.value[ele.id]) {
          newLayers.push({ ...ele });
        } else {
          oldItems.push({ ...ele });
        }
      });
      const embeddingItemsIndex = oldItems.findIndex(
        (ele) => ele.id === embedding.value
      );
      oldItems[embeddingItemsIndex] = {
        ...oldItems[embeddingItemsIndex],
        additionalInfo: {
          ...oldItems[embeddingItemsIndex].additionalInfo,
          layers: [
            ...(oldItems[embeddingItemsIndex].additionalInfo.layers || []),
            ...newLayers,
          ],
        },
      };
      return oldItems;
    });
    setEmbedding(null);
    setChecklistData({});
  };

  const onDisembed = (ids: any, isDelete?: boolean) => {
    let idtoDisembed = Array.isArray(ids) ? [...ids] : [ids];
    const idsMap: Record<string, boolean> = {};
    const pidsMap: Record<string, boolean> = {};

    idtoDisembed.forEach((ele: any) => {
      idsMap[ele.id] = true;
      pidsMap[ele.pId] = true;
    });

    setPlaylist((prev: any[]) => {
      const toBeAddedAtIndex: Record<string, any[]> = {};
      const old = prev.map((ele, idx) => {
        const prevEle = {
          ...ele,
          additionalInfo: {
            ...ele.additionalInfo,
            layers: [...(ele.additionalInfo.layers || [])],
          },
        };
        const layersFilter: any[] = [];
        const remaningLayers: any[] = [];
        if (pidsMap[prevEle.id]) {
          prevEle.additionalInfo.layers.forEach((layer: any) => {
            if (idsMap[layer.id]) {
              layersFilter.push({ ...layer });
            } else {
              remaningLayers.push({ ...layer });
            }
          });
          prevEle.additionalInfo.layers = [...remaningLayers];
        }
        if (!isDelete) {
          toBeAddedAtIndex[idx] = [...layersFilter];
        }
        return prevEle;
      });
      Object.keys(toBeAddedAtIndex).forEach((ele: string) => {
        const items = [...(toBeAddedAtIndex[ele] || [])];
        old.splice(Number(ele), 0, ...items);
      });
      return old;
    });
  };

  const onCheckEmbeded = (checkId: string | string[], pId: string) => {
    setChecklistEmbeded((prev) => {
      const old: Record<string, { idFinal: string; pId: string }> = { ...prev };
      const idMap = Array.isArray(checkId) ? [...checkId] : [checkId];
      idMap.forEach((idFinal) => {
        if (old[idFinal]) {
          delete old[idFinal];
        } else {
          old[idFinal] = { idFinal, pId };
        }
      });
      return old;
    });
  };

  const onClickSave = () => {
    if (layers.value) {
      const checkEmbed = playList.value.some(
        (ele: any) => !ele.additionalInfo.layers?.length
      );
      if (checkEmbed) {
        setLayersWarning(true);
        return;
      }
    }
    setOpenAttachLink(false);
    onSave(
      attachment.value,
      checklist.value,
      readingPlan.value,
      currentFormat.value,
      selectedColor.value,
      selectedIcon.value,
      selectedColor.value === customColor.value,
      description.value,
      selectedIcon.value === customIcon.value && !!selectedIcon.value,
      selectedTags.value,
      layers.value,
      publishAccess.value
    );
    resetPlaylistGlobalStateVars();
  };

  const generatePlaylistFromAI = async () => {
    if (loading.value) return;
    setTags([]);
    if (!genDetails.value) {
      ShowNotification({
        message: t("enterTextForGeneration"),
        severity: "error",
      });
      return;
    }
    setLoading(true);
    try {
      const {
        suggestedName,
        allItems,
        suggestedColor,
        suggestedIcon,
        suggestedDescription,
      } = await buildPlaylistFromAI({
        aiModal: selectedAI.value,
        text: genDetails.value,
        prompt: systemPrompt.value,
      });
      if (!allItems?.length) {
        setLoading(false);
        ShowNotification({
          message: t("unableToGeneratePlaylist"),
          severity: "error",
        });
        return;
      }
      hasGenrated.value = true;
      setName(suggestedName);
      setSelectedIcon(null);
      setSelectedColor(suggestedColor);
      setDescription(suggestedDescription);
      startCreatingPlaylist(suggestedName, allItems, id);
      setTags((prev) => [...prev, "ai-generated", suggestedName]);
      setLoading(false);
    } catch (er) {
      console.log("ERROR IN MAKING PLAYLIST: ", er);
      ShowNotification({
        message: t("unableToGeneratePlaylist"),
        severity: "error",
      });
      setLoading(false);
    }
  };

  const openCreateFlow = () => {
    toggleOpenModalName(true);
    G[`${id}setCustomIcon`](DEFAULT_UPLOAD_ICON);
  };

  effect(() => {
    G.SetVideoSrc = setVideoSrc;
    G.SetMediaURL = setMediaURL;
    G.SetCurrentItem = setCurrentItem;
  });

  effect(() => {
    embedding.value;
    itemSelected.value = null;
  });

  effect(() => {
    G.SetChecklistEnabled = (value: boolean) => {
      checklistEnabled.value = value;
    };
    return () => {
      G.SetChecklistEnabled = null;
    };
  });

  effect(() => {
    G.IS_PLAYLIST_ACTIVE = deps.creatingPlaylist.value;
    G.SET_SHOW_CHECK?.(deps.creatingPlaylist.value);
    return () => {
      G.SET_SHOW_CHECK?.(false);
    };
  });

  effect(() => {
    G.OpenModalEditName = openModalName.value;
    G.ChecklistEnabledRestorePlaylist = checklistEnabled.value;
    G.RenamingPlaylist = renamingPlaylist.value;
    G.SetRenamingPlaylistEditTitle = setRenamingPlaylist;
    G.SetOpenModalEditName = setOpenModalName;
    G.EditIDRestore = editId.current;
    return () => {
      G.SetRenamingPlaylistEditTitle = null;
    };
  });

  effect(() => {
    G.PublishAccessRestorePlaylist = publishAccess.value;
    G.CustomIconRestorePlaylist = customIcon.value;
    G.SelectedIconRestorePlaylist = selectedIcon.value;
    G.DescriptionRestorePlaylist = description.value;
  });

  effect(() => {
    if (!openModalName.value) {
      editId.current = false;
    }
  });

  effect(() => {
    G[`${id}AddDataToPlaylist`] = addDataToPlaylist;
    G[`${id}EditPlaylistData`] = editPlaylistData;
    G[`${id}ResetPlaylist`] = resetPlayist;
    G[`${id}SetCreatingPlaylist`] = setCreatingPlaylist;
    G[`${id}SetPlaylistName`] = setName;
    G[`${id}AddPlaylist`] = addPlaylist;
    G[`${id}creatingPlaylistName`] = name.value;
    G[`${id}currentPlaylist`] = playList.value;
    G.SetRenderMylist?.(playList.value);
    if (!G.AlreadySet) G[`${id}playlists`] = playLists.value;
    G.AlreadySet = false;
    G[`${id}Attachments`] = attachment.value;
    G[`${id}SetAttachments`] = setAttachment;
    G[`${id}SetPlaylists`] = setPlayLists;
    G[`${id}SetChecklist`] = setChecklist;
    G[`${id}SetReadingPlan`] = (value: boolean) => {
      readingPlan.value = value;
    };
    G[`${id}SetCurrentFormat`] = (value: string) => {
      currentFormat.value = value;
    };
    G[`${id}setCustomColor`] = setCustomColor;
    G[`${id}setCustomIcon`] = setCustomIcon;
    G[`${id}setSelectedColor`] = setSelectedColor;
    G[`${id}setSelectedIcon`] = setSelectedIcon;
    G[`${id}setDescription`] = setDescription;
    G[`${id}setPublishAccess`] = setPublishAccess;
    G.setRenderAgain = (value: number) => {
      renderAgain.value = value;
    };
    G.setPlaylistLocale?.(playLists.value, id);
    G.setOpenAttachLink = setOpenAttachLink;
    G.SetEditModal = setEditModal;
    G.SetSelectPlaylist = (value: boolean) => {
      selectPlaylist.value = value;
    };
    G[`${id}SetSelectedTags`] = setTags;
    G[`${id}SetLayers`] = (value: boolean) => {
      layers.value = value;
    };
    return () => {
      G[`${id}SetPlaylistName`] = null;
      G[`${id}AddDataToPlaylist`] = null;
      G[`${id}AddPlaylist`] = null;
      G[`${id}SetChecklist`] = null;
      G[`${id}SetPlaylists`] = null;
      G[`${id}setPublishAccess`] = null;
      G[`${id}setCustomColor`] = null;
      G[`${id}setCustomIcon`] = null;
      G[`${id}setSelectedColor`] = null;
      G.setOpenAttachLink = null;
      G[`${id}setSelectedIcon`] = null;
      G[`${id}setDescription`] = null;
      G[`${id}SetCurrentFormat`] = null;
      G[`${id}SetReadingPlan`] = null;
      G.SetSelectPlaylist = null;
    };
  });

  effect(() => {
    if (!blinkAfterPlaylistAdd.value) return;
    blinkAfterPlaylistAdd.value = false;
    runBlinkLastPlaylistItem();
  });

  return {
    id,
    query,
    selectedChip,
    isLayers,
    isCreate,
    mediaURL,
    videoSrc,
    currentItem,
    selectedAI,
    showPlaylistSettings,
    showMoreOptions,
    itemSelected,
    hasGenrated,
    selectedTags,
    selectPlaylist,
    checkListData,
    checkListEmbeded,
    checklistEnabled,
    embedding,
    layers,
    searchText,
    regenrateUI,
    layersWarning,
    dataWarning,
    loseProgressWarning,
    openAttachLink,
    attachment,
    openModal,
    mergeMode,
    renderAgain,
    checklist,
    readingPlan,
    currentFormat,
    currentPromptText,
    systemPrompt,
    openModalName,
    renamingPlaylist,
    autoGenerateOn,
    genDetails,
    loading,
    name,
    link,
    publishAccess,
    customColor,
    selectedColor,
    selectedIcon,
    description,
    customIcon,
    playLists,
    selectedPlaylist,
    playList,
    hasOldList,
    isSomethingChecked,
    isSomethingEmbededChecked,
    sharedFilterPlaylists,
    filteredPlaylist,
    showMorePosition,
    showPlaylistPosition,
    playlistListUiElement,
    editId,
    onSave,
    onClose,
    syncProps,
    setPlaylistListUiElement,
    toggleOpenModalName,
    toggleSelectedPlaylist,
    setEditModal,
    addDataToPlaylist,
    editPlaylistData,
    resetPlayist,
    addPlaylist,
    deleteDataFromPlaylist,
    deleteDateData,
    setCreatingPlaylist,
    onSearchHit,
    checkNameDuplicate,
    attachLink,
    massAdd,
    attachDate,
    onBulkDelete,
    onBulkJsonDownload,
    onBulkAddToCollection,
    onRegenration,
    onRevert,
    editDataFromPlaylist,
    onBulkDeleteItems,
    onEmbedItems,
    onDisembed,
    onCheckEmbeded,
    onClickSave,
    setPlaylist,
    setPlayLists,
    setTags,
    setName,
    setLink,
    setLoading,
    setOpenModalName,
    setRenamingPlaylist,
    setCustomIcon,
    setCustomColor,
    setSelectedColor,
    setSelectedIcon,
    setDescription,
    setPublishAccess,
    setItemSelected,
    setChecklistData,
    setChecklistEmbeded,
    setEmbedding,
    setRegenrateUI,
    setGenDetails,
    setSystemPrompt,
    setCurrentPromptText,
    setSelectedAI,
    setAutoGenerateOn,
    setShowPlaylistSettings,
    setShowMoreOptions,
    setDataWarning,
    setLoseProgressWarning,
    setLayersWarning,
    setOpenModal,
    setMergeMode,
    setOpenAttachLink,
    setChecklist,
    setAttachment,
    setMediaURL,
    setVideoSrc,
    setCurrentItem,
    generatePlaylistFromAI,
    openCreateFlow,
  };
}
