import { CasualOSApp } from "../CasualOSApp/CasualOSApp";
import type { ManagedModal, ModalManager } from "../../managers/ModalManager";
import { useI18n } from "../../i18n/I18nManager";
import { translateTitle } from "../../app/utils";
import { useOverlayDismiss } from "../useOverlayDismiss";

export function ModalHost(props: { manager: ModalManager }) {
  const { manager } = props;

  return (
    <>
      {manager.modals.value.map((modal) =>
        modal.useCasualOSApp ? (
          <CasualOSApp id={`modal-${modal.id}`} key={modal.id}>
            <HostedModal manager={manager} modal={modal} />
          </CasualOSApp>
        ) : (
          <HostedModal key={modal.id} manager={manager} modal={modal} />
        )
      )}
    </>
  );
}

function HostedModal(props: { manager: ModalManager; modal: ManagedModal }) {
  const { manager, modal } = props;

  const { t } = useI18n();
  const close = () => {
    manager.closeModal(modal.id);
  };
  const overlayDismiss = useOverlayDismiss(close);

  return (
    <div className="sb-footnote-modal-overlay" {...overlayDismiss}>
      <div
        className="sb-footnote-modal"
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
        }}
      >
        <div className="sb-footnote-modal-header">
          <h3 className="sb-footnote-modal-title">
            {translateTitle(t, modal.title)}
          </h3>
          {modal.showCloseButton ? (
            <button
              className="sb-footnote-modal-close"
              aria-label={t("close", { defaultValue: "Close" })}
              onClick={close}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          ) : null}
        </div>

        <div className="sb-footnote-modal-content">{modal.content({ t })}</div>
        {modal.footer ? (
          <div className="sb-footnote-modal-footer">{modal.footer({ t })}</div>
        ) : null}
      </div>
    </div>
  );
}
