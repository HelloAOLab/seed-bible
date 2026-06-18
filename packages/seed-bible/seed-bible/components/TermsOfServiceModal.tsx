import { useI18n } from "../i18n/I18nManager";

/**
 * Modal that displays the Terms of Service.
 *
 * The policy body lives in the `terms-of-service_policy` translation key as a
 * block of HTML, so it is rendered with `dangerouslySetInnerHTML`. The modal is
 * a controlled component: the parent owns the open state and passes `onClose`,
 * mirroring how {@link BibleSelector} is wired up.
 */
export function TermsOfServiceModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();

  if (!isOpen) {
    return null;
  }

  const title = t("terms-of-service", { defaultValue: "Terms of service" });

  return (
    <div
      className="sb-footnote-modal-overlay"
      onClick={onClose}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div
        className="sb-footnote-modal sb-tos-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event: MouseEvent) => event.stopPropagation()}
      >
        <div className="sb-footnote-modal-header">
          <h3 className="sb-footnote-modal-title">{title}</h3>
          <button
            type="button"
            className="sb-footnote-modal-close"
            aria-label={t("close", { defaultValue: "Close" })}
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div
          className="sb-footnote-modal-content sb-tos-content"
          dangerouslySetInnerHTML={{
            __html: t("terms-of-service_policy", { defaultValue: "" }),
          }}
        />
      </div>
    </div>
  );
}
