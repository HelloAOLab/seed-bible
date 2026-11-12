import "./SharedPageModal.css";
import { useI18n } from "../../i18n/I18nManager";
import { Button } from "../Button/Button";

/** A button in the shared-page modal, beside its Close button. */
export interface SharedPageModalAction {
  label: string;
  onClick: () => void;
  /** The main action, drawn filled. */
  primary?: boolean;
  disabled?: boolean;
}

/**
 * What a shared playlist or reading plan link opens on: its cover, author,
 * description and length, with the ways to begin it and a Close that goes
 * home. The title is the modal's own header.
 */
export function SharedPageModalContent(props: {
  heroImageUrl: string | null | undefined;
  authorName: string | null;
  description: string | null;
  /** How long it is, e.g. "3 items" or "12 sessions · About 8 min per session". */
  lengthLabel: string;
  /** Where the visitor already is in it, e.g. "You're on day 5". */
  status?: string | null;
  actions: SharedPageModalAction[];
  onClose: () => void;
}) {
  const { heroImageUrl, authorName, description, lengthLabel, status } = props;
  const { t } = useI18n();

  return (
    <div className="sb-shared-page-modal" dir="auto">
      {heroImageUrl ? (
        <img className="sb-shared-page-modal-hero" src={heroImageUrl} alt="" />
      ) : null}
      {authorName ? (
        <p className="sb-shared-page-modal-author">
          {t("shared-page-by-author", {
            author: authorName,
            defaultValue: "By {{author}}",
          })}
        </p>
      ) : null}
      {description ? (
        <p className="sb-shared-page-modal-description">{description}</p>
      ) : null}
      <p className="sb-shared-page-modal-count">{lengthLabel}</p>
      {status ? <p className="sb-shared-page-modal-status">{status}</p> : null}
      <div className="sb-shared-page-modal-actions">
        <Button variant="secondary" onClick={props.onClose}>
          {t("close", { defaultValue: "Close" })}
        </Button>
        {props.actions.map((action) => (
          <Button
            key={action.label}
            variant={action.primary ? "primary" : "secondary"}
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * What a link to a playlist or reading plan that doesn't exist (deleted, or
 * a mistyped link) opens on, in place of its modal. Closing it goes home.
 */
export function SharedPageNotFoundModalContent(props: {
  message: string;
  onClose: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="sb-shared-page-modal sb-shared-page-modal--not-found">
      <p className="sb-shared-page-modal-description">{props.message}</p>
      <div className="sb-shared-page-modal-actions">
        <Button variant="primary" onClick={props.onClose}>
          {t("close", { defaultValue: "Close" })}
        </Button>
      </div>
    </div>
  );
}

/**
 * What a playlist or reading plan link opens on when it couldn't be loaded
 * (a network or server error, not a missing record): a retry, or home.
 */
export function SharedPageLoadFailedModalContent(props: {
  message: string;
  retrying: boolean;
  onRetry: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="sb-shared-page-modal sb-shared-page-modal--load-failed">
      <p className="sb-shared-page-modal-description">{props.message}</p>
      <div className="sb-shared-page-modal-actions">
        <Button variant="secondary" onClick={props.onClose}>
          {t("close", { defaultValue: "Close" })}
        </Button>
        <Button
          variant="primary"
          onClick={props.onRetry}
          loading={props.retrying}
        >
          {t("try-again", { defaultValue: "Try again" })}
        </Button>
      </div>
    </div>
  );
}
