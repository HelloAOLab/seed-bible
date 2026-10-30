import { signal, type ReadonlySignal } from "@preact/signals";
import type { ComponentChildren } from "preact";
import type { TranslatableTitle } from "../managers/BibleToolsManager";

export interface ManagedModal {
  id: string;
  title: TranslatableTitle;
  content: (props: ModalContentProps) => ComponentChildren;
  footer: ((props: ModalContentProps) => ComponentChildren) | null;
  /**
   * Runs after the user dismisses this modal. `closeModal` does not run it,
   * so a caller that removes the modal itself (navigation, stop) is not
   * treated as the user backing out of it.
   */
  onDismiss: (() => void) | null;
  useCasualOSApp: boolean;
  mobileSheet: boolean;
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
   * Called after the user closes the modal with its X button or the backdrop.
   * Not called when code closes it through `closeModal`.
   */
  onDismiss?: () => void;

  /**
   * Whether to render the modal as a CasualOS app. This can be useful if the modal content needs to render over the grid or map portals.
   * Defaults to true.
   */
  useCasualOSApp?: boolean;

  /**
   * Whether to show the modal as a sheet docked to the bottom of the screen,
   * sliding up, on phone-sized screens. Wider screens still center it. Suits
   * pickers and forms; short confirmations read better centered.
   * Defaults to false.
   */
  mobileSheet?: boolean;
}

export interface ModalManager {
  modals: ReadonlySignal<ManagedModal[]>;
  openModal: (modal: ModalRegistration) => string;
  closeModal: (id: string) => void;
  /** Closes the modal and runs its `onDismiss`, if it had one. */
  dismissModal: (id: string) => void;
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
        onDismiss: modal.onDismiss ?? null,
        useCasualOSApp: modal.useCasualOSApp ?? true,
        mobileSheet: modal.mobileSheet ?? false,
      },
    ];

    return id;
  };

  const closeModal = (id: string) => {
    modals.value = modals.peek().filter((m) => m.id !== id);
  };

  const dismissModal = (id: string) => {
    const modal = modals.peek().find((m) => m.id === id);
    closeModal(id);
    modal?.onDismiss?.();
  };

  const closeAllModals = () => {
    modals.value = [];
  };

  return {
    modals,
    openModal,
    closeModal,
    dismissModal,
    closeAllModals,
  };
}
