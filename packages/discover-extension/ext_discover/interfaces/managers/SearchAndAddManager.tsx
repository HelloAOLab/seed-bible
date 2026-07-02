import type { Signal } from "@preact/signals";

export interface SearchAndAddManager {
  sourcesSearch: Signal<string>;
  showSelectBox: Signal<boolean>;
  setContainerRef: (element: HTMLDivElement | null) => void;
  setSourcesSearch: (value: string) => void;
  setShowSelectBox: (value: boolean) => void;
  getFilteredSources: (sources: any[]) => any[];
  getSourcesMap: (
    sources: any[]
  ) => Record<string, { name: string; profilePicture?: string }>;
}
