import { deleteAnnotation, getAnnotationRecord } from "db.annotations.library";
import { computed, effect, signal } from "@preact/signals";
import { fetchAnnotationsData } from "ext_discover.helper.fetchAnnotationsData";
import { INITIAL_ANNOTATION_FILTERS } from "ext_discover.models.annotationList";
import { filterAnnotationData } from "ext_discover.hooks.filterAnnotationData";
import type {
  AnnotationDeleteModal,
  AnnotationListManager,
} from "ext_discover.interfaces.managers.AnnotationListManager";

const G = globalThis as Record<string, any>;

const managersByScope = new Map<string, AnnotationListManager>();

export function getAnnotationListManager(scope: string): AnnotationListManager {
  const existing = managersByScope.get(scope);
  if (existing) return existing;

  const manager = createAnnotationListManager();
  managersByScope.set(scope, manager);
  return manager;
}

export function createAnnotationListManager(): AnnotationListManager {
  const filters = signal({ ...INITIAL_ANNOTATION_FILTERS });
  const showFilters = signal(false);
  const deleteModal = signal<AnnotationDeleteModal>({ address: "", index: 0 });
  const loading = signal(false);
  const deleteOverlay = signal<string | false>(false);
  const position = signal<Record<string, any>>({});
  const annotationData = signal<any[]>([]);
  const filterIconElement = signal<HTMLDivElement | null>(null);
  let setAnnotationDataFn: (updater: any) => void = () => {};

  const syncExternal = (external: {
    annotationData: any[];
    setAnnotationData: (updater: any) => void;
  }) => {
    annotationData.value = external.annotationData;
    setAnnotationDataFn = external.setAnnotationData;
  };

  const filteredAnnotationData = computed(() =>
    filterAnnotationData(annotationData.value, filters.value, G)
  );

  effect(() => {
    const show = showFilters.value;
    const discoverContainer = document.getElementById("discover-container");
    if (discoverContainer) {
      discoverContainer.style.overflow = show ? "hidden" : "auto";
    }
    return () => {
      if (discoverContainer) {
        discoverContainer.style.overflow = "auto";
      }
    };
  });

  const onChangeFilters = (key: string, value: string) => {
    const oldFilters = { ...filters.value };
    if (key === "sources" || key === "tags" || key === "verse") {
      if (oldFilters[key][value]) {
        delete oldFilters[key][value];
      } else {
        oldFilters[key][value] = true;
      }
    } else if (key === "fromDate" || key === "toDate" || key === "dateOption") {
      oldFilters[key] = value;
    }
    filters.value = oldFilters;
  };

  const onClearFilters = (key?: string) => {
    const oldFilters: any = { ...filters.value };
    if (key) {
      if (key === "sources" || key === "tags" || key === "verse") {
        oldFilters[key] = {};
      } else if (key === "dateOption") {
        oldFilters[key] = "any";
        oldFilters.fromDate = null;
        oldFilters.toDate = null;
      } else {
        oldFilters[key] = null;
      }
      filters.value = oldFilters;
      return;
    }
    filters.value = { ...INITIAL_ANNOTATION_FILTERS };
  };

  const closeModal = () => {
    deleteModal.value = { address: "", index: 0 };
  };

  const closeOverlay = () => {
    deleteOverlay.value = false;
  };

  const onDelete = async (
    address: string,
    index: number,
    currentOpenedBook: any,
    chapter: number | string
  ) => {
    try {
      loading.value = true;
      const userRecord = await getAnnotationRecord();
      const res: any = await deleteAnnotation(userRecord, { id: address });
      if (res.success) {
        setAnnotationDataFn((prev: any) => {
          const newData = [...prev];
          newData[index].data = newData[index].data.filter(
            (ele: any) => ele.address !== address
          );
          if (newData[index].data.length === 0) {
            newData.splice(index, 1);
          }
          return newData;
        });
        closeModal();
        ShowNotification({
          message: t("annotationDeletedSuccessfully"),
          severity: "success",
        });
      } else {
        ShowNotification({
          message: t("failedToDeleteAnnotation"),
          severity: "error",
        });
      }
      loading.value = false;
      delete G.AnnotationsData[`${currentOpenedBook?.bookId}-${chapter}`];
      fetchAnnotationsData({ ...G.CurrentBookData });
    } catch {
      ShowNotification({
        message: t("failedToDeleteAnnotation"),
        severity: "error",
      });
      loading.value = false;
    }
  };

  const openFilters = (filteredCount: number) => {
    if (filteredCount < 2) {
      return ShowNotification({
        message: t("shouldHaveAtLeastTwoAnnotationsToFilter"),
        severity: "error",
      });
    }
    showFilters.value = true;
    const isMobile =
      (window?.innerWidth || gridPortalBot.tags.pixelWidth) <
      G.MOBILE_VIEWPORT_THRESHOLD;
    if (!isMobile) {
      filterIconElement.value?.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
    }
  };

  return {
    filters,
    showFilters,
    deleteModal,
    loading,
    deleteOverlay,
    position,
    filteredAnnotationData,
    setFilterIconRef: (element: HTMLDivElement | null) => {
      filterIconElement.value = element;
    },
    onChangeFilters,
    onClearFilters,
    setShowFilters: (value: boolean) => {
      showFilters.value = value;
    },
    setDeleteModal: (value: AnnotationDeleteModal) => {
      deleteModal.value = value;
    },
    closeModal,
    closeOverlay,
    onDelete,
    openFilters,
    syncExternal,
  };
}
