import "./SharedPageModal.css";
import { useI18n } from "../../i18n/I18nManager";

/**
 * What a shared playlist or reading plan link opens on: its cover, author,
 * description and length, with a choice to start it or go home. The title is
 * the modal's own header.
 */
export function SharedPageModalContent(props: {
  heroImageUrl: string | null | undefined;
  authorName: string | null;
  description: string | null;
  /** How long it is, e.g. "3 items" or "12 sessions". */
  lengthLabel: string;
  startLabel: string;
  canStart: boolean;
  onStart: () => void;
  onClose: () => void;
}) {
  const { heroImageUrl, authorName, description, lengthLabel } = props;
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
      <div className="sb-shared-page-modal-actions">
        <button type="button" onClick={props.onClose}>
          {t("close", { defaultValue: "Close" })}
        </button>
        <button
          type="button"
          className="sb-shared-page-modal-start"
          onClick={props.onStart}
          disabled={!props.canStart}
        >
          {props.startLabel}
        </button>
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
        <button
          type="button"
          className="sb-shared-page-modal-start"
          onClick={props.onClose}
        >
          {t("close", { defaultValue: "Close" })}
        </button>
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
        <button type="button" onClick={props.onClose}>
          {t("close", { defaultValue: "Close" })}
        </button>
        <button
          type="button"
          className="sb-shared-page-modal-start"
          onClick={props.onRetry}
          disabled={props.retrying}
        >
          {t("try-again", { defaultValue: "Try again" })}
        </button>
      </div>
    </div>
  );
}
