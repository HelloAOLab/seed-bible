import { signal, type ReadonlySignal } from "@preact/signals";
import type { ComponentChildren } from "preact";
import type { TranslatableTitle } from "../managers/BibleToolsManager";

export interface ManagedModal {
  id: string;
  title: TranslatableTitle;
  content: (props: ModalContentProps) => ComponentChildren;
  useCasualOSApp: boolean;
  onClose?: () => void;
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

  /**
   * Whether to render the modal as a CasualOS app. This can be useful if the modal content needs to render over the grid or map portals.
   * Defaults to true.
   */
  useCasualOSApp?: boolean;

  /**
   * Called once when the modal is closed, however that happens — the header's
   * close button, a click on the backdrop, `closeModal`, or `closeAllModals`.
   *
   * Needed by modals whose visibility is driven by state outside the manager:
   * without it, dismissing via the backdrop would remove the dialog while
   * leaving that state saying it is still open. Mirrors `onClose` on
   * `PanesManager`'s pane registrations.
   */
  onClose?: () => void;
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
        useCasualOSApp: modal.useCasualOSApp ?? true,
        onClose: modal.onClose,
      },
    ];

    return id;
  };

  // Both closers drop the modal from the list *before* invoking `onClose`, so a
  // handler that reacts by calling back in (clearing the state that opened the
  // dialog, which re-runs a sync effect that calls `closeModal` again) finds
  // nothing left to remove and stops instead of recursing.
  const closeModal = (id: string) => {
    const closing = modals.peek().find((m) => m.id === id);
    if (!closing) {
      return;
    }

    modals.value = modals.peek().filter((m) => m.id !== id);
    closing.onClose?.();
  };

  const closeAllModals = () => {
    const closing = modals.peek();
    if (closing.length === 0) {
      return;
    }

    modals.value = [];
    closing.forEach((modal) => modal.onClose?.());
  };

  return {
    modals,
    openModal,
    closeModal,
    closeAllModals,
  };
}
