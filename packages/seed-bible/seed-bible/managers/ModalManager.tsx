import { signal, type ReadonlySignal } from "@preact/signals";
import type { ComponentChildren } from "preact";
import type { TranslatableTitle } from "../managers/BibleToolsManager";

export interface ManagedModal {
  id: string;
  title: TranslatableTitle;
  content: (props: ModalContentProps) => ComponentChildren;
  footer: ((props: ModalContentProps) => ComponentChildren) | null;
  showCloseButton: boolean;
  useCasualOSApp: boolean;
}

export interface ModalContentProps {
  t: (key: string, options?: Record<string, unknown>) => string;
}

export interface ModalRegistration {
  id?: string;
  title: TranslatableTitle;
  content:
    | ComponentChildren
    | ((props: ModalContentProps) => ComponentChildren);

  /** Rendered below the content, outside its scroll area. */
  footer?:
    | ComponentChildren
    | ((props: ModalContentProps) => ComponentChildren);

  /**
   * Whether the header shows an X button. Defaults to true. Clicking the
   * backdrop still closes the modal either way.
   */
  showCloseButton?: boolean;

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
  content: ComponentChildren | ((props: ModalContentProps) => ComponentChildren)
) {
  if (typeof content === "function") {
    return content as (props: ModalContentProps) => ComponentChildren;
  }

  return () => content;
}

export function createModalManager(): ModalManager {
  const modals = signal<ManagedModal[]>([]);

  const openModal = (modal: ModalRegistration) => {
    const id = modal.id ?? `modal-${++nextModalId}`;
    const existing = modals.peek().filter((m) => m.id !== id);

    modals.value = [
      ...existing,
      {
        id,
        title: modal.title,
        content: toContentRenderer(modal.content),
        footer:
          modal.footer === undefined ? null : toContentRenderer(modal.footer),
        showCloseButton: modal.showCloseButton ?? true,
        useCasualOSApp: modal.useCasualOSApp ?? true,
      },
    ];

    return id;
  };

  const closeModal = (id: string) => {
    modals.value = modals.peek().filter((m) => m.id !== id);
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
