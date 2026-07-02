import { effect, signal } from "@preact/signals";
import type { GetLabelManager } from "ext_discover.interfaces.managers.GetLabelManager";

const managersByKey = new Map<string, GetLabelManager>();

export function getGetLabelManager(instanceKey = "default"): GetLabelManager {
  const existing = managersByKey.get(instanceKey);
  if (existing) return existing;

  const manager = createGetLabelManager();
  managersByKey.set(instanceKey, manager);
  return manager;
}

export function createGetLabelManager(): GetLabelManager {
  const isMobile = signal(false);
  const containerEl = signal<HTMLElement | null>(null);
  let widthCompare = 176;
  let needToShowInMobile = false;
  let observer: ResizeObserver | null = null;

  const attachContainer = (
    el: HTMLElement | null,
    nextWidthCompare = 176,
    nextNeedToShowInMobile = false
  ) => {
    widthCompare = nextWidthCompare;
    needToShowInMobile = nextNeedToShowInMobile;
    containerEl.value = el;
  };

  effect(() => {
    observer?.disconnect();
    observer = null;

    const el = containerEl.value;
    if (!el) return;

    const targetElement = el.parentElement?.parentElement;
    if (!targetElement) {
      console.warn("GetLabel: Could not find 3rd parent");
      return;
    }

    observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      if (!needToShowInMobile) {
        isMobile.value = width < widthCompare;
      }
    });
    observer.observe(targetElement);

    return () => {
      observer?.disconnect();
      observer = null;
    };
  });

  return {
    isMobile,
    attachContainer,
  };
}
