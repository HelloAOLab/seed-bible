import "./OfflineDownloadPrompt.css";
import { BottomSheet } from "../BottomSheet/BottomSheet";
import { Button } from "../Button/Button";
import { Dialog } from "../Dialog/Dialog";

/**
 * The offer to save a translation for offline reading, or to update a saved
 * one: a dialog, or a bottom sheet on a phone. Declining, the backdrop and
 * Escape all call `onDismiss`.
 */
export function OfflinePromptCard(props: {
  isMobile: boolean;
  /** Material Symbols icon name shown beside the title. */
  icon: string;
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
  dismissLabel: string;
  onDismiss: () => void;
  className?: string;
}) {
  const { isMobile, title, onDismiss } = props;
  const className = `sb-offline-prompt${
    props.className ? ` ${props.className}` : ""
  }`;
  const content = (
    <div className="sb-offline-prompt-content">
      <div className="sb-offline-prompt-header">
        <div className="sb-offline-prompt-icon" aria-hidden="true">
          <span className="material-symbols-outlined">{props.icon}</span>
        </div>
        <h2 className="sb-offline-prompt-title">{title}</h2>
      </div>

      <p className="sb-offline-prompt-body">{props.body}</p>

      <Button
        variant="primary"
        size="lg"
        shape="pill"
        className="sb-offline-prompt-btn sb-offline-prompt-btn-primary"
        onClick={props.onAction}
      >
        {props.actionLabel}
      </Button>

      <Button
        variant="ghost"
        size="lg"
        shape="pill"
        className="sb-offline-prompt-btn sb-offline-prompt-btn-secondary"
        onClick={onDismiss}
      >
        {props.dismissLabel}
      </Button>
    </div>
  );

  // "Not now" closes it, so there's no ✕ as well.
  return isMobile ? (
    <BottomSheet
      className={className}
      label={title}
      showClose={false}
      onClose={onDismiss}
    >
      {content}
    </BottomSheet>
  ) : (
    <Dialog
      className={className}
      label={title}
      showClose={false}
      onClose={onDismiss}
    >
      {content}
    </Dialog>
  );
}
