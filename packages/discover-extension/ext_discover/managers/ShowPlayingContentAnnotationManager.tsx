import { computed, effect, signal } from "@preact/signals";
import type { ShowPlayingContentAnnotationManager } from "ext_discover.interfaces.managers.ShowPlayingContentAnnotationManager";

const G = globalThis as Record<string, any>;

let managerSingleton: ShowPlayingContentAnnotationManager | undefined;

export function getShowPlayingContentAnnotationManager(): ShowPlayingContentAnnotationManager {
  if (!managerSingleton) {
    managerSingleton = createShowPlayingContentAnnotationManager();
  }
  return managerSingleton;
}

export function createShowPlayingContentAnnotationManager(): ShowPlayingContentAnnotationManager {
  const mediaURL = signal("");
  const fileName = signal<string | null>(null);
  const videoSrc = signal<boolean | string>(false);
  const currentItem = signal<Record<string, unknown>>({});

  const hasMedia = computed(() => !!videoSrc.value || !!mediaURL.value);

  const setVideoSrc = (val: boolean | string) => {
    mediaURL.value = "";
    videoSrc.value = val;
  };

  const setMediaURL = (val: string) => {
    videoSrc.value = false;
    mediaURL.value = val;
  };

  const setCurrentItem = (item: Record<string, unknown>) => {
    currentItem.value = item;
  };

  effect(() => {
    G.SetVideoSrc = setVideoSrc;
    G.SetMediaURL = setMediaURL;
    G.SetCurrentItem = setCurrentItem;
    return () => {
      G.SetVideoSrc = null;
      G.SetMediaURL = null;
      G.SetCurrentItem = null;
    };
  });

  return {
    mediaURL,
    fileName,
    videoSrc,
    currentItem,
    setVideoSrc,
    setMediaURL,
    setCurrentItem,
    hasMedia,
  };
}
