import { computed, effect, signal, untracked } from "@preact/signals";
import {
  getAnnotationRecord,
  createAnnotation,
  saveAnnotation,
} from "db.annotations.library";
import { fetchAnnotationsData } from "ext_discover.helper.fetchAnnotationsData";
import { resetPlaylistGlobalStateVars } from "ext_discover.helper.resetPlaylistGlobalStateVars";
import { extractHashtagsFromHTML } from "ext_discover.hooks.extractHashtagsFromHTML";
import type { AddAnotationUIProps } from "ext_discover.interfaces.components.AddAnotationUI";
import type { AddAnotationUIManager } from "ext_discover.interfaces.managers.AddAnotationUIManager";

const G = globalThis as Record<string, any>;

const managersById = new Map<string, AddAnotationUIManager>();

export function getAddAnotationUIManager(
  id: string,
  props: AddAnotationUIProps
): AddAnotationUIManager {
  const existing = managersById.get(id);
  if (existing) {
    existing.syncProps(props);
    return existing;
  }

  const manager = createAddAnotationUIManager(id, props);
  managersById.set(id, manager);
  return manager;
}

function createAddAnotationUIManager(
  id: string,
  initialProps: AddAnotationUIProps
): AddAnotationUIManager {
  const list = signal(initialProps.list);
  const editData = signal(initialProps.editData ?? null);
  const showPlaylistSettings = signal(initialProps.showPlaylistSettings);

  const setListRef = { current: initialProps.setList };
  const setModeRef = { current: initialProps.setMode };
  const setShowPlaylistSettingsRef = {
    current: initialProps.setShowPlaylistSettings,
  };
  const setTabRef = { current: initialProps.setTab };

  const mediaURL = signal("");
  const videoSrc = signal<any>(false);
  const currentItem = signal<any>({});
  const loseProgresss = signal(false);
  const loseProgressAction = { current: null as (() => void) | null };
  const singleMode = signal(true);
  const embedItems = signal<any[]>([]);
  const tags = signal<string[]>([]);
  const textHTML = signal<string | null>(G.PreviousHTML || "");
  const isEditAddress = signal(initialProps.editData?.address);
  const editDataDetails = signal<any>(
    G.EditAnnoDataDetailsRestorePlaylist || {}
  );
  const showPreview = signal(false);
  const selectedAnnotation = signal<string | null>(
    G.SelectedItemIDForAttachments
  );
  const showMoreOptions = signal(false);
  const publishAccess = signal(G.PublishAccessRestorePlaylist || "public");
  const loading = signal(false);
  const dataFetching = signal(false);
  const checkListData = signal<Record<string, boolean>>({});
  const checkListEmbeded = signal<Record<string, any>>({});
  const embedding = signal<string | boolean | null>(null);
  const checklistEnabled = signal(false);
  const dragOverSet = signal({ position: "top", itemId: null, pId: null });
  const draggedItemID = signal<string | null>(null);
  const draggedParent = signal<string | null>(null);
  const toBeSetItems = { current: [] as any[] };
  const showMorePosition = { current: G.getPosition?.() };
  const showPlaylistPosition = { current: G.getPosition?.() };

  let mounted = false;
  let mountCleanup: (() => void) | undefined;

  const setList = (value: any[] | ((prev: any[]) => any[])) => {
    setListRef.current(value);
    if (typeof value === "function") {
      list.value = value(list.value);
    } else {
      list.value = value;
    }
  };

  const setSelectedAnnotation = (
    value: string | null | ((prev: string | null) => string | null)
  ) => {
    if (typeof value === "function") {
      selectedAnnotation.value = value(selectedAnnotation.value);
    } else {
      selectedAnnotation.value = value;
    }
  };

  const setDragoverSet = (newState: any) => {
    const current = dragOverSet.value;
    if (
      newState.itemId !== current.itemId ||
      newState.position !== current.position
    ) {
      if (G[`${newState.itemId}OpenToggle`]) {
        G[`${newState.itemId}OpenToggle`](true);
      }
      dragOverSet.value = newState;
    }
  };

  const finalHistoryObject = computed(() => {
    if (!singleMode.value || editData.value?.address) return list.value;

    const trackVerse: Record<string, boolean> = {};
    const listItems: any[] = [];

    list.value.forEach((ele: any) => {
      const verse = ele.additionalInfo.verse;
      if (trackVerse[verse]) return;
      trackVerse[verse] = true;
      if (
        ele.type === "verse" ||
        ele.type === "verse-range" ||
        ele.type === "verse-grouped"
      ) {
        if (ele.type === "verse-grouped") {
          ele.additionalInfo.verse.forEach((vNumber: number) => {
            if (trackVerse[vNumber]) return;
            trackVerse[vNumber] = true;
            listItems.push({
              ...ele,
              additionalInfo: {
                ...ele.additionalInfo,
                verse: vNumber,
              },
            });
          });
        } else {
          listItems.push(ele);
        }
      }
    });

    const listFinal = listItems.sort(
      (a: any, b: any) => a.additionalInfo.verse - b.additionalInfo.verse
    );

    if (listFinal.length < 1) {
      return listFinal;
    }

    const item = {
      content: listFinal[0].content,
      type: "chapter",
      additionalInfo: {
        ...listFinal[0],
      },
      id: "singleMode",
    };

    const verses = listFinal
      .map((ele) => ele.additionalInfo.verse)
      .sort((a, b) => a - b);
    const ranges = G.GetVerseSummaryHeading(verses);
    item.content = `${item.content.split(":")[0]}:${ranges.join(", ")}`;

    return [item];
  });

  effect(() => {
    const history = finalHistoryObject.value;
    if (!singleMode.value || editData.value?.address) return;
    if (history.length < 1) {
      selectedAnnotation.value = null;
      return;
    }
    if (singleMode.value && history.length) {
      selectedAnnotation.value = "singleMode";
    } else {
      selectedAnnotation.value = null;
    }
  });

  const isSomethingChecked = computed(
    () => Object.keys(checkListData.value).length > 0
  );
  const isSomethingEmbededChecked = computed(
    () => Object.keys(checkListEmbeded.value).length > 0
  );
  const checkEnabled = computed(
    () =>
      checklistEnabled.value ||
      isSomethingChecked.value ||
      isSomethingEmbededChecked.value ||
      embedding.value
  );

  const onEmbedInside = () => {
    if (!embedding.value) return;

    let embededItem: string | null = null;
    list.value.forEach((ele: any) => {
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

    setList((prev: any[]) => {
      const oldItems: any[] = [];
      const newLayers: any[] = [];
      const old = [...prev];
      old.forEach((ele) => {
        if (checkListData.value[ele.id]) {
          newLayers.push({ ...ele });
        }
        if (!checkListData.value[ele.id]) {
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
    embedding.value = null;
    checkListData.value = {};
  };

  const deleteFromList = (itemId: string, pid?: string) => {
    if (singleMode.value && !editData.value?.address) {
      if (pid) {
        embedItems.value = embedItems.value.filter((ele) => ele.id !== itemId);
      } else {
        setList([]);
      }
      selectedAnnotation.value = null;
      return;
    }

    if (pid) {
      setList((prev: any[]) => {
        const old = [...prev];
        const index = old.findIndex((ele) => ele.id === pid);
        if (index > -1) {
          old[index].additionalInfo.layers = old[
            index
          ].additionalInfo.layers.filter((ele: any) => ele.id !== itemId);
        }
        return old;
      });
    } else {
      setList((prev: any[]) => prev.filter((ele: any) => ele.id !== itemId));
    }

    selectedAnnotation.value = null;
  };

  const deleteAttachment = (_index: number, pID: string, itemId: string) => {
    if (singleMode.value && !editData.value?.address) {
      embedItems.value = embedItems.value.filter((ele) => ele.id !== itemId);
      return;
    }

    setList((prev: any[]) => {
      const old = [...prev];
      const parentIndex = old.findIndex((ele) => ele.id === pID);
      if (parentIndex > -1) {
        old[parentIndex].additionalInfo.layers = old[
          parentIndex
        ].additionalInfo.layers.filter((ele: any) => ele.id !== itemId);
      }
      return old;
    });
    selectedAnnotation.value = null;
  };

  const onRemoveTag = (indexofTag: number, idOfParent?: string) => {
    if (singleMode.value || editData.value?.address) {
      const old = [...tags.value];
      old.splice(indexofTag, 1);
      tags.value = old;
      return;
    }

    setList((old: any[]) => {
      const prev = [...old];
      const index = prev.findIndex((ele) => ele.id === idOfParent);
      const targetVerse = prev[index];
      targetVerse.additionalInfo.tags.splice(indexofTag, 1);
      prev[index] = { ...targetVerse };
      return prev;
    });
  };

  const onDisembed = (ids: any, isDelete?: boolean) => {
    let idtoDisembed = [ids];
    if (Array.isArray(ids)) {
      idtoDisembed = [...ids];
    }

    const idsMap: Record<string, boolean> = {};
    const pidsMap: Record<string, boolean> = {};

    idtoDisembed.forEach((ele: any) => {
      idsMap[ele.idFinal] = true;
      pidsMap[ele.pId] = true;
    });

    if (singleMode.value) {
      if (isDelete) {
        if (Object.keys(idsMap).length) {
          embedItems.value = embedItems.value.filter((ele) => !idsMap[ele.id]);
        }
        checkListData.value = {};
        checkListEmbeded.value = {};
        return;
      }
      ShowNotification({
        message: t("youCannotUnlinkAttachmentsInAnnotationMode"),
        severity: "error",
      });
      return;
    }

    setList((prev: any[]) => {
      const toBeAddedAtIndex: Record<any, any[]> = {};
      const old = prev.map((ele: any, idx: number) => {
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
      Object.keys(toBeAddedAtIndex).forEach((ele: any) => {
        const items = [...(toBeAddedAtIndex[ele] || [])];
        old.splice(ele, 0, ...items);
      });
      return old;
    });
    checkListData.value = {};
    selectedAnnotation.value = null;
    checkListEmbeded.value = {};
  };

  const editDataFromPlaylist = (receivedIds: any) => {
    let ids = [receivedIds];
    if (Array.isArray(receivedIds)) {
      ids = [...receivedIds];
    }

    const old: Record<any, boolean> = { ...checkListData.value };
    ids.forEach((idEle: any) => {
      if (old[idEle]) {
        delete old[idEle];
      } else {
        old[idEle] = true;
      }
    });
    checkListData.value = old;
  };

  const onCheckEmbeded = (itemId: any, pId: string) => {
    const old: Record<any, any> = { ...checkListEmbeded.value };
    let idMap = [itemId];
    if (Array.isArray(itemId)) {
      idMap = [...itemId];
    }
    idMap.forEach((idFinal) => {
      if (old[idFinal]) {
        delete old[idFinal];
      } else {
        old[idFinal] = { idFinal, pId };
      }
    });
    checkListEmbeded.value = old;
  };

  const onBulkDeleteItems = () => {
    if (singleMode.value) {
      setList([]);
    } else {
      setList((prev: any[]) =>
        prev.filter(
          (ele) => !checkListData.value[ele.id] && embedding.value !== ele.id
        )
      );
    }
    checkListData.value = {};
    selectedAnnotation.value = null;
    embedding.value = null;
    checkListEmbeded.value = {};
  };

  const onEditSave = async () => {
    if (textHTML.value?.trim().length! < 1) {
      return ShowNotification({
        message: t("cannotSaveEmptyAnnotation"),
        severity: "error",
      });
    }

    try {
      loading.value = true;
      const promisesArray: Promise<unknown>[] = [];
      const details = editDataDetails.value;
      const book =
        details.additionalInfo?.chapterData?.id ||
        details.additionalInfo?.chapterData?.bookId ||
        details.additionalInfo?.data?.id ||
        details.additionalInfo?.data?.bookId;
      const chapter = details?.additionalInfo?.chapter;
      const hashtags = extractHashtagsFromHTML(textHTML.value || "");

      const comment: any = {
        type: "comment",
        html: textHTML.value,
        createdAtMs: details.createdAtMs ?? Date.now(),
        updatedAtMs: Date.now(),
        userId: details.userId,
        userName: details.userName,
        userProfilePicture: details.userProfilePicture,
        tags: hashtags,
      };

      const annotation = createAnnotation(
        book,
        chapter,
        comment,
        details.additionalInfo?.verse
      );
      const userRecord = await getAnnotationRecord();
      promisesArray.push(
        saveAnnotation(userRecord, { ...annotation, id: isEditAddress.value })
      );
      await Promise.all(promisesArray);
      G.SelectedItemIDForAttachments = null;
      ShowNotification({
        message: t("annotationsSavedSuccessfully"),
        severity: "success",
      });
      setList([]);
      selectedAnnotation.value = null;
      loading.value = false;
      G.PreviousHTML = null;
      textHTML.value = null;
      setTabRef.current?.("discover");
      delete G.AnnotationsData[`${book}-${chapter}`];
      fetchAnnotationsData({ ...G.CurrentBookData });
      G.LastEditingAnnotationAddress = null;
      resetPlaylistGlobalStateVars();
    } catch (e) {
      loading.value = false;
      console.error(`${t("errorUpdatingAnnotations")}:`, e);
      ShowNotification({
        message: t("failedToUpdateAnnotations"),
        severity: "error",
      });
    } finally {
      loading.value = false;
    }
  };

  const onClickSave = async () => {
    if (loading.value) return;
    if (textHTML.value?.trim().length! < 1) {
      return ShowNotification({
        message: t("cannotSaveEmptyAnnotations"),
        severity: "error",
      });
    }
    if (isEditAddress.value) {
      await onEditSave();
      return;
    }

    const currentList = [...list.value].filter((ele) =>
      singleMode.value
        ? ele.type === "verse" ||
          ele.type === "verse-range" ||
          ele.type === "verse-grouped"
        : true
    );
    const nonScriptureName: Record<string, boolean> = {
      date: true,
      "attachment-link": true,
      heading: true,
    };

    let somethingNotScripture = false;
    let somethingNotEmbedded = false;
    if (singleMode.value) {
      if (textHTML.value?.trim().length === 0) {
        return ShowNotification({
          message: t("pleaseEmbedSomethingToSaveAnnotations"),
          severity: "error",
        });
      }
    } else {
      currentList.forEach((ele) => {
        if (nonScriptureName[ele.type]) {
          somethingNotScripture = true;
        }
        if (!Array.isArray(ele.additionalInfo.layers)) {
          somethingNotEmbedded = true;
        }
      });

      if (somethingNotScripture) {
        return ShowNotification({
          message: t("onlyVersesAndChaptersAreAllowedForTopLevelAnnotation"),
          severity: "error",
        });
      }

      if (somethingNotEmbedded) {
        return ShowNotification({
          message: t("someOfYourScripturesAreNotEmbedded"),
          severity: "error",
        });
      }
    }

    loading.value = true;

    try {
      const promisesArray: Promise<unknown>[] = [];
      const userRecord = await getAnnotationRecord();
      const singleRangeTrack: Record<string, boolean> = {};
      const data: any = await os.getData(
        thisBot.tags.keyFetchAccountData,
        authBot.id
      );
      const verseNumbers: number[] = [];
      const hashtags = extractHashtagsFromHTML(textHTML.value || "");

      const comment: any = {
        type: "comment",
        html: textHTML.value,
        createdAtMs: Date.now(),
        updatedAtMs: Date.now(),
        userProfilePicture: data.data?.photoLink,
        userName: data.data?.profileName,
        userId: authBot.id,
        tags: hashtags,
      };

      let book = "";
      let chapter = "";

      currentList.forEach((ele) => {
        if (
          ele.type !== "chapter-range" &&
          ele.type !== "chapter-grouped" &&
          !singleRangeTrack[ele.additionalInfo.verse]
        ) {
          if (singleMode.value) {
            singleRangeTrack[ele.additionalInfo.verse] = true;
          }
          book =
            ele.additionalInfo?.chapterData?.id ||
            ele.additionalInfo?.chapterData?.bookId ||
            ele.additionalInfo?.data?.id ||
            ele.additionalInfo?.data?.bookId;
          chapter = ele.additionalInfo.chapter;
          verseNumbers.push(ele.additionalInfo.verse);
        }
      });

      if (book && chapter && verseNumbers.length > 0) {
        const annotation = createAnnotation(
          book,
          Number(chapter),
          comment,
          verseNumbers.length > 1 ? verseNumbers : verseNumbers[0] || 0
        );

        promisesArray.push(saveAnnotation(userRecord, annotation));
        await Promise.all(promisesArray);

        loading.value = false;
        G.SelectedItemIDForAttachments = null;
        ShowNotification({
          message: t("annotationsSavedSuccessfully"),
          severity: "success",
        });
        setList([]);
        selectedAnnotation.value = null;
        G.PreviousHTML = null;
        delete G.AnnotationsData[`${book}-${chapter}`];
        fetchAnnotationsData({ ...G.CurrentBookData });
        textHTML.value = null;
        resetPlaylistGlobalStateVars();
      }
    } catch (e) {
      loading.value = false;
      console.error(`${t("errorSavingAnnotations")}:`, e);
      ShowNotification({
        message: t("failedToSaveAnnotations"),
        severity: "error",
      });
    } finally {
      loading.value = false;
    }
  };

  const handleDragStart = (index: number, pId: string | null) => {
    toBeSetItems.current = finalHistoryObject.value;
    if (pId) {
      draggedParent.value = pId;
      const pIndex = finalHistoryObject.value.findIndex(
        (ele: any) => ele.id === pId
      );
      const itemId =
        finalHistoryObject.value[pIndex].additionalInfo.layers[index].id;
      draggedItemID.value = itemId;
    } else {
      draggedItemID.value = finalHistoryObject.value[index].id;
    }
  };

  const handleDragOver = (
    index: number,
    pseudoIndex: number | null = 1,
    pseudoID: string | null = null,
    event: any
  ) => {
    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    const mouseY = event.clientY;
    const middleVertical = rect.top + rect.height / 2;
    const distanceThreshold = 10;
    const isNearCenter = Math.abs(mouseY - middleVertical) < distanceThreshold;

    if (!draggedItemID.value) return;

    const originalRespectiveIndex = index;
    let draggedItemIndex = finalHistoryObject.value.findIndex(
      (hist: any) => hist.id === draggedItemID.value
    );
    const parentIdx = finalHistoryObject.value.findIndex(
      (ele: any) => ele.id === draggedParent.value
    );

    let dragItem: any = [finalHistoryObject.value[draggedItemIndex]];

    if (draggedItemIndex === -1 && parentIdx > -1) {
      draggedItemIndex = finalHistoryObject.value[
        parentIdx
      ].additionalInfo.layers?.findIndex(
        (hist: any) => hist.id === draggedItemID.value
      );
      dragItem = [
        finalHistoryObject.value[parentIdx].additionalInfo.layers[
          draggedItemIndex
        ],
      ];
    }

    let draggedOverItem = finalHistoryObject.value[index];

    if (pseudoID) {
      const parentIndexDragOver = finalHistoryObject.value.findIndex(
        (ele: any) => ele.id === pseudoID
      );
      draggedOverItem =
        finalHistoryObject.value[parentIndexDragOver].additionalInfo.layers[
          index
        ];
    }

    const newIndex = originalRespectiveIndex;
    const filterAbleItems = {
      [draggedItemID.value]: true,
    };

    if (dragItem.id === draggedOverItem.id) {
      toBeSetItems.current = list.value;
      setDragoverSet({
        itemId: null,
        position: originalRespectiveIndex > draggedItemIndex ? "Bottom" : "Top",
      });
      return;
    }

    if (dragItem.id !== draggedOverItem.id) {
      setDragoverSet({
        itemId: draggedOverItem.id,
        position:
          isNearCenter && !pseudoID
            ? "Embed"
            : originalRespectiveIndex > draggedItemIndex
              ? "Bottom"
              : "Top",
      });
    }

    let newItems: any[] = [
      ...finalHistoryObject.value.filter(
        (hist: any) => !filterAbleItems[hist.id]
      ),
    ];
    newItems = JSON.parse(JSON.stringify(newItems));
    if (parentIdx > -1) {
      newItems[parentIdx].additionalInfo.layers = [
        ...newItems[parentIdx].additionalInfo.layers.filter(
          (hist: any) => !filterAbleItems[hist.id]
        ),
      ];
    }
    if (pseudoID) {
      newItems[pseudoIndex as number].additionalInfo.layers.splice(
        newIndex,
        0,
        ...dragItem
      );
    } else if (isNearCenter) {
      const indexForNew = newItems.findIndex(
        (ele) => ele.id === draggedOverItem.id
      );
      if (indexForNew > -1) {
        if (!newItems[indexForNew].additionalInfo.layers) {
          newItems[indexForNew].additionalInfo.layers = [];
        }
        newItems[indexForNew].additionalInfo.layers = [
          ...newItems[indexForNew].additionalInfo.layers,
          ...dragItem,
        ];
      }
    } else {
      newItems.splice(newIndex, 0, ...dragItem);
    }

    toBeSetItems.current = newItems;
  };

  const handleDragEnd = () => {
    const dragOverItem = finalHistoryObject.value.find(
      (ele: any) => ele.id === dragOverSet.value.itemId
    );
    const currentDragOver = dragOverSet.value;
    const currentDraggedItemID = draggedItemID.value;
    const currentDraggedParent = draggedParent.value;

    setDragoverSet({
      itemId: null,
      position: "false",
    });
    draggedItemID.value = null;
    draggedParent.value = null;

    if (currentDragOver.position === "Embed") {
      if (isEditAddress.value) {
        ShowNotification({
          message: t(
            "youAreInEditModeEditingANotationCannotEmbedItemsInsideTheAnnotation"
          ),
          severity: "error",
        });
        return;
      }

      if (
        dragOverItem?.type === "attachment-link" ||
        dragOverItem?.type === "heading"
      ) {
        ShowNotification({
          message: t("youCannotEmbedItemsIntoAttachmentItem"),
          severity: "error",
        });
        return;
      }

      let draggedItemIndex = finalHistoryObject.value.findIndex(
        (hist: any) => hist.id === currentDraggedItemID
      );
      let dragItem = finalHistoryObject.value[draggedItemIndex];
      const parentIdx = finalHistoryObject.value.findIndex(
        (ele: any) => ele.id === currentDraggedParent
      );

      if (draggedItemIndex === -1 && parentIdx > -1) {
        draggedItemIndex = finalHistoryObject.value[
          parentIdx
        ].additionalInfo.layers?.findIndex(
          (hist: any) => hist.id === currentDraggedItemID
        );
        dragItem =
          finalHistoryObject.value[parentIdx].additionalInfo.layers[
            draggedItemIndex
          ];
      }

      if (dragItem.additionalInfo.layers?.length) {
        ShowNotification({
          message: t("cannotEmbedEmbeddedItem"),
          severity: "error",
        });
        return;
      }
    }

    if (toBeSetItems.current) {
      setList(toBeSetItems.current);
    }
  };

  const syncProps = (props: AddAnotationUIProps) => {
    setListRef.current = props.setList;
    setModeRef.current = props.setMode;
    setShowPlaylistSettingsRef.current = props.setShowPlaylistSettings;
    setTabRef.current = props.setTab;
    list.value = props.list;
    editData.value = props.editData ?? null;
    showPlaylistSettings.value = props.showPlaylistSettings;
    G[`FirstAnnnotationItem`] = props.list[0];
  };

  const mount = () => {
    if (mounted) return;
    mounted = true;

    const disposers: (() => void)[] = [];

    G.SetVideoSrc = (value: any) => {
      videoSrc.value = value;
    };
    G.SetMediaURL = (value: string) => {
      mediaURL.value = value;
    };
    G.SetCurrentItem = (value: any) => {
      currentItem.value = value;
    };

    G.SetSelectedAnnotations = (value: string | null) => {
      selectedAnnotation.value = value;
    };
    G.AddAnotationUI = true;

    if (
      editData.value?.address &&
      editData.value?.address !== G.LastEditingAnnotationAddress
    ) {
      void (async () => {
        G.LastEditingAnnotationAddress = editData.value?.address;
        dataFetching.value = true;
        setList([]);
        try {
          const userRecord = await getAnnotationRecord();
          const res: any = await os.getData(
            userRecord,
            editData.value?.address
          );
          let data: any = res.data.data;
          if (data.type === "comment") {
            data = res.data;
            textHTML.value = data.data.html;
            tags.value = [...(data.chronicle_tags || [])];
            G.IsEditingAnnotation = true;
            const booksDetails = G.findNameRank(data.bookId);
            const ediDataBookItem = {
              type: "heading",
              content: data.data.html,
              createdAtMs: data.data.createdAtMs,
              updatedAtMs: data.data.updatedAtMs,
              userId: data.data.userId,
              userName: data.data.userName,
              userProfilePicture: data.data.userProfilePicture,
              additionalInfo: {
                verse: data.verseNumber,
                chapter: data.chapterNumber,
                book: data.bookId,
                data: {
                  bookId: data.bookId,
                },
                bookRank: booksDetails.item,
              },
              id: data.id,
            };
            G.EditAnnoDataDetailsRestorePlaylist = ediDataBookItem;
            editDataDetails.value = ediDataBookItem;
          } else if (data.data) {
            G.EditAnnoDataDetailsRestorePlaylist = { ...data.data };
            editDataDetails.value = { ...data.data };
            const layers = data.data.additionalInfo?.layers?.filter(
              (ele: any) => ele.type === "heading"
            );
            textHTML.value = layers?.[0]?.content || "";
            tags.value = [...(data.chronicle_tags || [])];
            G.IsEditingAnnotation = true;
          } else {
            dataFetching.value = false;
            ShowNotification({
              message: t("failedToFetchAnnotations"),
              severity: "error",
            });
          }
        } catch (e) {
          console.error(`${t("errorFetchingAnnotations")}:`, e);
          ShowNotification({
            message: t("failedToFetchAnnotations"),
            severity: "error",
          });
        } finally {
          dataFetching.value = false;
        }
      })();
    }

    G.SelectedItemIDForAttachments = null;

    disposers.push(
      effect(() => {
        G.PublishAccessRestorePlaylist = publishAccess.value;
      })
    );

    disposers.push(
      effect(() => {
        G.AnnotationUISingleMode = singleMode.value;
      })
    );

    disposers.push(
      effect(() => {
        G.SelectedItemIDForAttachments = selectedAnnotation.value;
        G.PreviousHTML = textHTML.value;
      })
    );

    disposers.push(
      effect(() => {
        G.SetChecklistEnabled = (value: boolean) => {
          checklistEnabled.value = value;
        };
        return () => {
          G.SetChecklistEnabled = null;
        };
      })
    );

    disposers.push(
      effect(() => {
        const mode = singleMode.value;
        untracked(() => {
          if (!mode) {
            setList((prev: any[]) =>
              prev.map((ele) => ({
                ...ele,
                additionalInfo: {
                  ...ele.additionalInfo,
                  layers: [...embedItems.value],
                  tags: [...tags.value],
                },
              }))
            );
            selectedAnnotation.value = null;
          } else {
            setList((prev: any[]) =>
              prev.map((ele) => ({
                ...ele,
                additionalInfo: {
                  ...ele.additionalInfo,
                  layers: [],
                  tags: [],
                },
              }))
            );
          }
        });
      })
    );

    mountCleanup = () => {
      disposers.forEach((dispose) => dispose());
      G.SetSelectedAnnotations = null;
      G.IsEditingAnnotation = false;
      G.SelectedItemIDForAttachments = null;
      if (isEditAddress.value) {
        G[`${id}mode`] = G.PlaylistModeTypes.playlist;
        setList([]);
        G[`${id}currentPlaylist`] = [];
        G.SelectedItemIDForAttachments = null;
      }
      isEditAddress.value = false;
      G.SetEditAnnoData?.(null);
      mounted = false;
    };
  };

  syncProps(initialProps);
  mount();

  return {
    id,
    mediaURL,
    videoSrc,
    currentItem,
    loseProgresss,
    singleMode,
    embedItems,
    tags,
    textHTML,
    isEditAddress,
    editDataDetails,
    showPreview,
    selectedAnnotation,
    showMoreOptions,
    publishAccess,
    loading,
    dataFetching,
    checkListData,
    checkListEmbeded,
    embedding,
    checklistEnabled,
    dragOverSet,
    draggedItemID,
    draggedParent,
    list,
    editData,
    showPlaylistSettings,
    finalHistoryObject,
    isSomethingChecked,
    isSomethingEmbededChecked,
    checkEnabled,
    loseProgressAction,
    showMorePosition,
    showPlaylistPosition,
    setShowPlaylistSettings: (value: boolean) => {
      setShowPlaylistSettingsRef.current(value);
      showPlaylistSettings.value = value;
    },
    setMode: (value: string) => setModeRef.current(value),
    setList,
    setTab: (tab: string) => setTabRef.current?.(tab),
    setLoseProgresss: (value: boolean) => {
      loseProgresss.value = value;
    },
    setShowMoreOptions: (value: boolean) => {
      showMoreOptions.value = value;
    },
    setPublishAccess: (value: string) => {
      publishAccess.value = value;
    },
    setIsEditAddress: (value: any) => {
      isEditAddress.value = value;
    },
    setTextHTML: (value: string | null) => {
      textHTML.value = value;
    },
    setShowPreview: (value: boolean) => {
      showPreview.value = value;
    },
    setSelectedAnnotation,
    setEmbedding: (value: string | boolean | null) => {
      embedding.value = value;
    },
    setChecklistData: (value: Record<string, boolean>) => {
      checkListData.value = value;
    },
    setChecklistEmbeded: (value: Record<string, any>) => {
      checkListEmbeded.value = value;
    },
    onBulkDeleteItems,
    onDisembed,
    onEmbedInside,
    editDataFromPlaylist,
    onCheckEmbeded,
    deleteFromList,
    deleteAttachment,
    onRemoveTag,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    onClickSave,
    syncProps,
    mount,
  };
}
