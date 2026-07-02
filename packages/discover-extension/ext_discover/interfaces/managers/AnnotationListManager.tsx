import type { Signal } from "@preact/signals";

export interface AnnotationDeleteModal {
  address: string;
  index: number;
}

export interface AnnotationListManager {
  filters: Signal<any>;
  showFilters: Signal<boolean>;
  deleteModal: Signal<AnnotationDeleteModal>;
  loading: Signal<boolean>;
  deleteOverlay: Signal<string | false>;
  position: Signal<Record<string, any>>;
  filteredAnnotationData: Signal<any[]>;
  setFilterIconRef: (element: HTMLDivElement | null) => void;
  onChangeFilters: (key: string, value: string) => void;
  onClearFilters: (key?: string) => void;
  setShowFilters: (value: boolean) => void;
  setDeleteModal: (value: AnnotationDeleteModal) => void;
  closeModal: () => void;
  closeOverlay: () => void;
  onDelete: (
    address: string,
    index: number,
    currentOpenedBook: any,
    chapter: number | string
  ) => Promise<void>;
  openFilters: (filteredCount: number) => void;
  syncExternal: (external: {
    annotationData: any[];
    setAnnotationData: (updater: any) => void;
  }) => void;
}
