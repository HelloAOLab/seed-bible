import { useI18n } from "../../i18n";
import { Spinner } from "../Spinner/Spinner";
import "./joinSessionModal.css";
export function JoiningSessionModal() {
  const { t } = useI18n();
  return (
    <div
      className="sb-joining-session-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="joining-session-title"
      tabIndex={-1}
      ref={(element) => {
        if (element) {
          element.focus();
        }
      }}
    >
      <div className="sb-joining-session-modal">
        <Spinner />
        <h3 id="sb-joining-session-title">
          {t("joining-session", {
            defaultValue: "Joining session…",
          })}
        </h3>

        <p id="joining-session-title" role="status" aria-live="polite">
          {t("joining-session-description", {
            defaultValue:
              "Please wait while we connect you to the shared session.",
          })}
        </p>
      </div>
    </div>
  );
}
