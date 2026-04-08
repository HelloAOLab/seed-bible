import { CasualOSApp } from "seed-bible.components.CasualOSApp";
import type { ModalManager } from "seed-bible.managers.ModalManager";

export function ModalHost(props: { manager: ModalManager }) {
  const { manager } = props;

  return (
    <>
      {manager.modals.value.map((modal) => (
        <CasualOSApp id={`modal-${modal.id}`} key={modal.id}>
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
                <h3 className="sb-footnote-modal-title">{modal.title}</h3>
                <button
                  className="sb-footnote-modal-close"
                  aria-label={`Close ${modal.title}`}
                  onClick={() => {
                    manager.closeModal(modal.id);
                  }}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="sb-footnote-modal-content">{modal.content()}</div>
            </div>
          </div>
        </CasualOSApp>
      ))}
    </>
  );
}
