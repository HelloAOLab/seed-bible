import { useRef } from "preact/hooks";
import { CasualOSApp } from "../CasualOSApp/CasualOSApp";
import type { ModalManager } from "../../managers/ModalManager";
import { useI18n } from "../../i18n/I18nManager";
import { translateTitle } from "../../app/utils";

export function ModalHost(props: { manager: ModalManager }) {
  const { manager } = props;

  const { t } = useI18n();
  // A drag that starts inside the modal (e.g. selecting text in an input) and
  // ends over the overlay still fires `click` on the overlay, so only close
  // when the press also started on the overlay.
  const pressStartedOnOverlay = useRef(false);

  return (
    <>
      {manager.modals.value.map((modal) => {
        const content = (
          <div
            className="sb-footnote-modal-overlay"
            onMouseDown={(event: MouseEvent) => {
              pressStartedOnOverlay.current =
                event.target === event.currentTarget;
            }}
            onClick={(event: MouseEvent) => {
              if (
                pressStartedOnOverlay.current &&
                event.target === event.currentTarget
              ) {
                manager.closeModal(modal.id);
              }
              pressStartedOnOverlay.current = false;
            }}
          >
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
                <button
                  className="sb-footnote-modal-close"
                  aria-label={t("close", { defaultValue: "Close" })}
                  onClick={() => {
                    manager.closeModal(modal.id);
                  }}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="sb-footnote-modal-content">
                {modal.content({ t })}
              </div>
            </div>
          </div>
        );

        return modal.useCasualOSApp ? (
          <CasualOSApp id={`modal-${modal.id}`} key={modal.id}>
            {content}
          </CasualOSApp>
        ) : (
          content
        );
      })}
    </>
  );
}
