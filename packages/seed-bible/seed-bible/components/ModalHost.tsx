import { CasualOSApp } from "seed-bible.components.CasualOSApp";
import type { ModalManager } from "seed-bible.managers.ModalManager";
import { useI18n } from "seed-bible.i18n.I18nManager";
import { translateTitle } from "seed-bible.components.Utils";

export function ModalHost(props: { manager: ModalManager }) {
  const { manager } = props;

  const { t } = useI18n();

  return (
    <>
      {manager.modals.value.map((modal) => {
        const content = (
          <div
            className="sb-footnote-modal-overlay"
            onClick={() => {
              manager.closeModal(modal.id);
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
