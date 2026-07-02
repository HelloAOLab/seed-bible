import { computed, effect, signal } from "@preact/signals";
import type { DiscoverManager } from "ext_discover.interfaces.managers.DiscoverManager";
import type {
  DiscoverChipSelection,
  DiscoverScrollPosition,
} from "ext_discover.models.discover";

const G = globalThis as Record<string, any>;

let discoverManagerSingleton: DiscoverManager | undefined;

export function getDiscoverManager(): DiscoverManager {
  if (!discoverManagerSingleton) {
    discoverManagerSingleton = createDiscoverManager();
  }
  return discoverManagerSingleton;
}

export function createDiscoverManager(): DiscoverManager {
  const selectedChip = signal<DiscoverChipSelection>({ All: true });
  const query = signal("");
  const renamingPlaylist = signal(!!G.OpenModalEditName);
  const scrollPosition = signal<DiscoverScrollPosition>("left");
  const scrollElement = signal<HTMLElement | null>(null);

  const showRightArrow = computed(
    () =>
      scrollPosition.value !== "right" && scrollPosition.value !== "noscroll"
  );
  const showLeftArrow = computed(
    () => scrollPosition.value !== "left" && scrollPosition.value !== "noscroll"
  );

  const checkPosition = () => {
    const el = scrollElement.value;
    if (!el) return;

    if (el.scrollWidth <= el.clientWidth) {
      scrollPosition.value = "noscroll";
      return;
    }

    const scrollLeft = el.scrollLeft;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    if (scrollLeft >= maxScrollLeft - 20) {
      scrollPosition.value = "right";
    } else if (scrollLeft <= 20) {
      scrollPosition.value = "left";
    } else {
      scrollPosition.value = "mid";
    }
  };

  const scrollLeftByWidth = () => {
    const el = scrollElement.value;
    if (!el) return;
    el.scrollBy({
      left: -(el.clientWidth - 50),
      behavior: "smooth",
    });
  };

  const scrollRightByWidth = () => {
    const el = scrollElement.value;
    if (!el) return;
    el.scrollBy({
      left: el.clientWidth - 50,
      behavior: "smooth",
    });
  };

  const selectChip = (val: string) => {
    if (val === "All") {
      selectedChip.value = { All: true };
      return;
    }

    const nextSelection = { ...selectedChip.value };

    if (nextSelection[val]) {
      delete nextSelection[val];
    } else {
      nextSelection[val] = true;
    }

    if (
      Object.keys(nextSelection).length === 0 ||
      (Object.keys(nextSelection)[0] === "All" &&
        Object.keys(nextSelection).length === 1)
    ) {
      nextSelection.All = true;
    } else {
      delete nextSelection.All;
    }

    selectedChip.value = nextSelection;
  };

  const setQuery = (value: string) => {
    query.value = value;
  };

  const setRenamingPlaylist = (value: boolean) => {
    renamingPlaylist.value = value;
  };

  const setScrollElement = (element: HTMLElement | null) => {
    scrollElement.value = element;
  };

  effect(() => {
    G.SetRenamingPlaylist = setRenamingPlaylist;
    return () => {
      G.SetRenamingPlaylist = null;
    };
  });

  effect(() => {
    if (!scrollElement.value) return;

    const interval = setInterval(checkPosition, 100);
    return () => {
      clearInterval(interval);
    };
  });

  return {
    selectedChip,
    query,
    renamingPlaylist,
    scrollPosition,
    showRightArrow,
    showLeftArrow,
    selectChip,
    setQuery,
    setRenamingPlaylist,
    setScrollElement,
    scrollLeftByWidth,
    scrollRightByWidth,
  };
}
