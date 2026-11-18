import "./ModalHost.css";
import type { ReadonlySignal } from "@preact/signals";
import { useRef } from "preact/hooks";
import { CasualOSApp } from "../CasualOSApp/CasualOSApp";
import type { ManagedModal, ModalManager } from "../../managers/ModalManager";
import { useI18n } from "../../i18n/I18nManager";
import { translateTitle } from "../../app/utils";
import { Dialog } from "../Dialog/Dialog";
import { BottomSheet } from "../BottomSheet/BottomSheet";

export function ModalHost(props: {
  manager: ModalManager;
  /** Phone-sized screen, where `mobileSheet` windows open as bottom sheets. */
  isMobile: ReadonlySignal<boolean>;
}) {
  const { manager } = props;
  const isMobile = props.isMobile.value;
  const modals = manager.modals.value;

  // A window open on the first render was drawn by the server (a shared
  // page's link opens one), so it stays where the server put it for the
  // browser to pick up. Windows opened later go to the end of <body>.
  const inPlace = useRef<Set<string> | null>(null);
  inPlace.current ??= new Set(modals.map((modal) => modal.id));
  for (const id of inPlace.current) {
    if (!modals.some((modal) => modal.id === id)) inPlace.current.delete(id);
  }

  return (
    <>
      {modals.map((modal) => {
        const hosted = (
          <HostedModal
            key={modal.id}
            manager={manager}
            modal={modal}
            isMobile={isMobile}
            portal={!inPlace.current!.has(modal.id)}
          />
        );
        return modal.useCasualOSApp ? (
          <CasualOSApp id={`modal-${modal.id}`} key={modal.id}>
            {hosted}
          </CasualOSApp>
        ) : (
          hosted
        );
      })}
    </>
  );
}

function HostedModal(props: {
  manager: ModalManager;
  modal: ManagedModal;
  isMobile: boolean;
  portal: boolean;
}) {
  const { manager, modal } = props;

  const { t } = useI18n();
  const dismiss = () => {
    manager.dismissModal(modal.id);
  };
  const title = translateTitle(t, modal.title);
  const dismissible = modal.canDismiss();
  const footer = modal.footer ? modal.footer({ t }) : undefined;

  if (modal.mobileSheet && props.isMobile) {
    return (
      <BottomSheet
        label={title}
        title={title}
        dismissible={dismissible}
        onClose={dismiss}
        footer={
          footer === undefined ? undefined : (
            <div className="sb-modal-host-sheet-footer">{footer}</div>
          )
        }
      >
        {modal.content({ t })}
      </BottomSheet>
    );
  }

  return (
    <Dialog
      title={title}
      dismissible={dismissible}
      onClose={dismiss}
      footer={footer}
      portal={props.portal}
    >
      {modal.content({ t })}
    </Dialog>
  );
}
