import { effect, signal } from "@preact/signals";
import type { AnnotationInnerDivManager } from "ext_discover.interfaces.managers.AnnotationInnerDivManager";

const G = globalThis as Record<string, any>;

const managersByDataId = new Map<string, AnnotationInnerDivManager>();

export function getAnnotationInnerDivManager(
  dataId: string
): AnnotationInnerDivManager {
  const existing = managersByDataId.get(dataId);
  if (existing) return existing;

  const manager = createAnnotationInnerDivManager(dataId);
  managersByDataId.set(dataId, manager);
  return manager;
}

function createAnnotationInnerDivManager(
  dataId: string
): AnnotationInnerDivManager {
  const expand = signal(false);

  effect(() => {
    G[`${dataId}OpenToggle`] = (
      value?: boolean | ((prev: boolean) => boolean)
    ) => {
      if (typeof value === "function") {
        expand.value = value(expand.value);
      } else if (value !== undefined) {
        expand.value = value;
      } else {
        expand.value = !expand.value;
      }
    };
    return () => {
      G[`${dataId}OpenToggle`] = null;
    };
  });

  return { expand };
}

export function syncAnnotationInnerDivSelection(
  manager: AnnotationInnerDivManager,
  dataId: string,
  selectedAnnotation: string | null
): void {
  if (selectedAnnotation === dataId) {
    manager.expand.value = true;
  }
}
