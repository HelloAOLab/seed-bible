import { effect, signal } from "@preact/signals";
import type { SearchAndAddManager } from "ext_discover.interfaces.managers.SearchAndAddManager";

const managersByScope = new Map<string, SearchAndAddManager>();

export function getSearchAndAddManager(scope: string): SearchAndAddManager {
  const existing = managersByScope.get(scope);
  if (existing) return existing;

  const manager = createSearchAndAddManager();
  managersByScope.set(scope, manager);
  return manager;
}

export function createSearchAndAddManager(): SearchAndAddManager {
  const sourcesSearch = signal("");
  const showSelectBox = signal(false);
  const containerElement = signal<HTMLDivElement | null>(null);

  const setContainerRef = (element: HTMLDivElement | null) => {
    containerElement.value = element;
  };

  effect(() => {
    const container = containerElement.value;
    if (!container) {
      return;
    }

    const handler = (e: MouseEvent) => {
      if (!container.contains(e.target as Node)) {
        showSelectBox.value = false;
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  });

  const getFilteredSources = (sources: any[]) => {
    const query = sourcesSearch.value.toLowerCase();
    return sources.filter((source: any) =>
      source.label.toLowerCase().includes(query)
    );
  };

  const getSourcesMap = (sources: any[]) => {
    const map: Record<string, { name: string; profilePicture?: string }> = {};
    sources?.forEach((source: any) => {
      map[source.value] = {
        name: source.label,
        profilePicture: source.profilePicture,
      };
    });
    return map;
  };

  return {
    sourcesSearch,
    showSelectBox,
    setContainerRef,
    setSourcesSearch: (value: string) => {
      sourcesSearch.value = value;
    },
    setShowSelectBox: (value: boolean) => {
      showSelectBox.value = value;
    },
    getFilteredSources,
    getSourcesMap,
  };
}
