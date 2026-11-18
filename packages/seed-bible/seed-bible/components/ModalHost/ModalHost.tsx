import "./ModalHost.css";
import type { ReadonlySignal } from "@preact/signals";
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

  return (
    <>
      {manager.modals.value.map((modal) =>
        modal.useCasualOSApp ? (
          <CasualOSApp id={`modal-${modal.id}`} key={modal.id}>
            <HostedModal manager={manager} modal={modal} isMobile={isMobile} />
          </CasualOSApp>
        ) : (
          <HostedModal
            key={modal.id}
            manager={manager}
            modal={modal}
            isMobile={isMobile}
          />
        )
      )}
    </>
  );
}

function HostedModal(props: {
  manager: ModalManager;
  modal: ManagedModal;
  isMobile: boolean;
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
    >
      {modal.content({ t })}
    </Dialog>
  );
}
