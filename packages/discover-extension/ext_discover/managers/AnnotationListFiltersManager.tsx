import { effect, signal } from "@preact/signals";
import type { AnnotationListFiltersManager } from "ext_discover.interfaces.managers.AnnotationListFiltersManager";

const managersByScope = new Map<string, AnnotationListFiltersManager>();

export function getAnnotationListFiltersManager(
  scope: string
): AnnotationListFiltersManager {
  const existing = managersByScope.get(scope);
  if (existing) return existing;

  const manager = createAnnotationListFiltersManager();
  managersByScope.set(scope, manager);
  return manager;
}

export function createAnnotationListFiltersManager(): AnnotationListFiltersManager {
  const dateOption = signal("any");
  const fromInput = signal<HTMLInputElement | null>(null);
  const toInput = signal<HTMLInputElement | null>(null);

  const initFlatpickr = (element: HTMLInputElement | null) => {
    if (!element) return;
    (window as any).flatpickr(element, {
      dateFormat: "m/d/Y",
      allowInput: false,
    });
  };

  effect(() => {
    dateOption.value;
    initFlatpickr(fromInput.value);
    initFlatpickr(toInput.value);
  });

  return {
    dateOption,
    setFromInputRef: (element: HTMLInputElement | null) => {
      fromInput.value = element;
    },
    setToInputRef: (element: HTMLInputElement | null) => {
      toInput.value = element;
    },
    syncDateOption: (value: string) => {
      dateOption.value = value;
    },
  };
}
