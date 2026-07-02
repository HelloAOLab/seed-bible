import { signal } from "@preact/signals";
import type {
  DragDropDragContext,
  DragDropEndContext,
  DragDropWithGroupingManager,
} from "ext_discover.interfaces.managers.DragDropWithGroupingManager";
import type { DragOverSet } from "ext_discover.models.playlistList";

const G = globalThis as Record<string, any>;

const managersByScope = new Map<string, DragDropWithGroupingManager>();

export function getDragDropWithGroupingManager(
  scope: string
): DragDropWithGroupingManager {
  const existing = managersByScope.get(scope);
  if (existing) return existing;

  const manager = createDragDropWithGroupingManager();
  managersByScope.set(scope, manager);
  return manager;
}

export function createDragDropWithGroupingManager(): DragDropWithGroupingManager {
  const opendedList = signal<string | false>("");
  const dragOverSet = signal<DragOverSet>({
    position: "top",
    itemId: "null",
  });
  const draggedItemID = signal<string | null>(null);
  const draggedParent = signal<string | null>(null);

  let toBeSetItems: any[] | null = null;

  const setOpenedList = (
    value: string | false | ((prev: string | false) => string | false)
  ) => {
    opendedList.value =
      typeof value === "function" ? value(opendedList.value) : value;
  };

  const setDragoverSet = (newState: DragOverSet) => {
    if (
      newState.itemId !== dragOverSet.value.itemId ||
      newState.position !== dragOverSet.value.position
    ) {
      if (G[`${newState.itemId}OpenToggle`]) {
        G[`${newState.itemId}OpenToggle`](true);
      }
      dragOverSet.value = newState;
    }
  };

  const handleDragStart = (
    index: number,
    pId: string | undefined,
    ctx: DragDropDragContext
  ) => {
    const { transformedHistory } = ctx;
    toBeSetItems = transformedHistory;
    if (pId) {
      draggedParent.value = pId;
      const pIndex = transformedHistory.findIndex((ele: any) => ele.id === pId);
      const itemId =
        transformedHistory[pIndex].additionalInfo.layers[index]?.id;
      draggedItemID.value = itemId;
    } else {
      const id = transformedHistory[index].id;
      draggedItemID.value = id;
    }
  };

  const handleDragOver = (
    index: number,
    pseudoIndex: number | null = 1,
    pseudoID: string | null | undefined,
    event: any,
    ctx: DragDropDragContext
  ) => {
    const { transformedHistory, list } = ctx;
    event?.preventDefault?.();

    const rect = event.currentTarget.getBoundingClientRect();
    const mouseY = event.clientY;

    const middleVertical = rect.top + rect.height / 2;
    const distanceThreshold = 10;
    const isNearCenter = Math.abs(mouseY - middleVertical) < distanceThreshold;

    if (!draggedItemID.value) return;

    const originalRespectiveIndex = index;

    let draggedItemIndex = transformedHistory.findIndex(
      (hist: any) => hist.id === draggedItemID.value
    );
    let parentIdx = transformedHistory.findIndex(
      (ele: any) => ele.id === draggedParent.value
    );

    let dragItem: any = [transformedHistory[draggedItemIndex]];

    if (draggedItemIndex === -1 && parentIdx > -1) {
      draggedItemIndex = transformedHistory[
        parentIdx
      ].additionalInfo.layers?.findIndex(
        (hist: any) => hist.id === draggedItemID.value
      );
      dragItem = [
        transformedHistory[parentIdx].additionalInfo.layers[draggedItemIndex],
      ];
    }

    let draggedOverItem = transformedHistory[index];

    if (pseudoID) {
      const parentIndexDragOver = transformedHistory.findIndex(
        (ele: any) => ele.id === pseudoID
      );
      draggedOverItem =
        transformedHistory[parentIndexDragOver].additionalInfo.layers[index];
    }

    const newIndex = originalRespectiveIndex;

    let newItems: any[] = [];

    const filterAbleItems: Record<string, boolean> = {
      [draggedItemID.value]: true,
    };

    if (dragItem.id === draggedOverItem.id) {
      toBeSetItems = list;
      setDragoverSet({
        itemId: null as unknown as string,
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

    newItems = [
      ...transformedHistory.filter((hist: any) => !filterAbleItems[hist.id]),
    ];
    newItems = JSON.parse(JSON.stringify(newItems));
    if (parentIdx > -1) {
      newItems[parentIdx].additionalInfo.layers = [
        ...newItems[parentIdx].additionalInfo.layers.filter(
          (hist: any) => !filterAbleItems[hist.id]
        ),
      ];
    }
    if (pseudoID && pseudoIndex !== null) {
      newItems[pseudoIndex].additionalInfo.layers.splice(
        newIndex,
        0,
        ...dragItem
      );
    } else if (isNearCenter) {
      const indexForNew = newItems.findIndex(
        (ele: any) => ele.id === draggedOverItem.id
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

    toBeSetItems = newItems;
  };

  const handleDragEnd = (ctx: DragDropEndContext) => {
    const { transformedHistory, setList } = ctx;
    const currentDragOverSet = dragOverSet.value;
    const currentDraggedItemID = draggedItemID.value;
    const currentDraggedParent = draggedParent.value;

    const dragOverItem = transformedHistory.find(
      (ele: any) => ele.id === currentDragOverSet.itemId
    );

    setDragoverSet({
      itemId: null as unknown as string,
      position: "false",
    });
    draggedItemID.value = null;
    draggedParent.value = null;

    if (currentDragOverSet.position === "Embed") {
      let draggedItemIndex = transformedHistory.findIndex(
        (hist: any) => hist.id === currentDraggedItemID
      );

      let dragItem = transformedHistory[draggedItemIndex];

      let parentIdx = transformedHistory.findIndex(
        (ele: any) => ele.id === currentDraggedParent
      );

      if (draggedItemIndex === -1 && parentIdx > -1) {
        draggedItemIndex = transformedHistory[
          parentIdx
        ].additionalInfo.layers?.findIndex(
          (hist: any) => hist.id === currentDraggedItemID
        );
        dragItem =
          transformedHistory[parentIdx].additionalInfo.layers[draggedItemIndex];
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

      if (dragItem.additionalInfo.layers?.length) {
        ShowNotification({
          message: t("cannotEmbedEmbeddedItem"),
          severity: "error",
        });
        return;
      }
    }
    if (toBeSetItems) {
      setList(toBeSetItems);
    }
  };

  const autoPlayToggle = (
    index: number,
    pId: string,
    id: string,
    setList: (updater: (prev: any[]) => any[]) => void
  ) => {
    setList((prev: any[]) => {
      const old = [...prev];
      const pIndex = old.findIndex((ele) => ele.id === pId);
      if (pIndex > -1) {
        const attachmentIndex = old[pIndex]?.additionalInfo?.layers?.findIndex(
          (ele: any) => ele.id === id
        );
        if (attachmentIndex === 0) {
          old[pIndex].additionalInfo.layers[0].autoPlay =
            !old[pIndex].additionalInfo.layers[0].autoPlay;
        }
      }
      return old;
    });
  };

  const toggleIsQuoteText = (
    id: string,
    pId: string | undefined,
    setList: (updater: (prev: any[]) => any[]) => void
  ) => {
    setList((prev: any[]) => {
      const old = [...prev];
      const pIndex = old.findIndex((ele) => ele.id === pId);
      if (pIndex > -1) {
        const attachmentIndex = old[pIndex]?.additionalInfo?.layers?.findIndex(
          (ele: any) => ele.id === id
        );
        console.log(
          "attachmentIndex",
          old[pIndex].additionalInfo.layers[attachmentIndex]
        );
        if (attachmentIndex > -1) {
          old[pIndex].additionalInfo.layers[
            attachmentIndex
          ].additionalInfo.isQuotedText =
            !old[pIndex].additionalInfo.layers[attachmentIndex].additionalInfo
              .isQuotedText;
        }
      } else if (id) {
        const itemIndex = old.findIndex((ele: any) => ele.id === id);
        if (itemIndex > -1) {
          old[itemIndex].additionalInfo.isQuotedText =
            !old[itemIndex].additionalInfo.isQuotedText;
        }
      }
      return old;
    });
  };

  return {
    opendedList,
    dragOverSet,
    draggedItemID,
    draggedParent,
    setOpenedList,
    setDragoverSet,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    autoPlayToggle,
    toggleIsQuoteText,
  };
}
