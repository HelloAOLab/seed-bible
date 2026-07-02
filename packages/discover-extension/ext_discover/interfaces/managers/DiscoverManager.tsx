import type { ReadonlySignal, Signal } from "@preact/signals";
import type {
  DiscoverChipSelection,
  DiscoverScrollPosition,
} from "ext_discover.models.discover";

export interface DiscoverManager {
  selectedChip: Signal<DiscoverChipSelection>;
  query: Signal<string>;
  renamingPlaylist: Signal<boolean>;
  scrollPosition: Signal<DiscoverScrollPosition>;
  showRightArrow: ReadonlySignal<boolean>;
  showLeftArrow: ReadonlySignal<boolean>;
  selectChip: (value: string) => void;
  setQuery: (value: string) => void;
  setRenamingPlaylist: (value: boolean) => void;
  setScrollElement: (element: HTMLElement | null) => void;
  scrollLeftByWidth: () => void;
  scrollRightByWidth: () => void;
}
