import { signal } from "@preact/signals";
import type { AnnotationHeadingManager } from "ext_discover.interfaces.managers.AnnotationHeadingManager";

const managersByScope = new Map<string, AnnotationHeadingManager>();

export function getAnnotationHeadingManager(
  scope: string
): AnnotationHeadingManager {
  const existing = managersByScope.get(scope);
  if (existing) return existing;

  const manager = createAnnotationHeadingManager();
  managersByScope.set(scope, manager);
  return manager;
}

export function createAnnotationHeadingManager(): AnnotationHeadingManager {
  const isOpen = signal(true);

  return {
    isOpen,
    toggleOpen: () => {
      isOpen.value = !isOpen.value;
    },
  };
}
