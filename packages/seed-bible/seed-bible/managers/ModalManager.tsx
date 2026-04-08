import { signal, type ReadonlySignal } from "@preact/signals";
import type { ComponentChildren } from "preact";

export interface ManagedModal {
  id: string;
  title: string;
  content: () => ComponentChildren;
  useCasualOSApp: boolean;
}

export interface ModalRegistration {
  id?: string;
  title: string;
  content: ComponentChildren | (() => ComponentChildren);

  /**
   * Whether to render the modal as a CasualOS app. This can be useful if the modal content needs to render over the grid or map portals.
   * Defaults to true.
   */
  useCasualOSApp?: boolean;
}

export interface ModalManager {
  modals: ReadonlySignal<ManagedModal[]>;
  openModal: (modal: ModalRegistration) => string;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
}

let nextModalId = 0;

function toContentRenderer(
  content: ComponentChildren | (() => ComponentChildren)
) {
  if (typeof content === "function") {
    return content as () => ComponentChildren;
  }

  return () => content;
}

export function createModalManager(): ModalManager {
  const modals = signal<ManagedModal[]>([]);

  const openModal = (modal: ModalRegistration) => {
    const id = modal.id ?? `modal-${++nextModalId}`;
    const existing = modals.value.filter((m) => m.id !== id);

    modals.value = [
      ...existing,
      {
        id,
        title: modal.title,
        content: toContentRenderer(modal.content),
        useCasualOSApp: modal.useCasualOSApp ?? true,
      },
    ];

    return id;
  };

  const closeModal = (id: string) => {
    modals.value = modals.value.filter((m) => m.id !== id);
  };

  const closeAllModals = () => {
    modals.value = [];
  };

  return {
    modals,
    openModal,
    closeModal,
    closeAllModals,
  };
}
