import "./ExtensionReview.css";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type {
  ExtensionReviewsManager,
  ExtensionVerification,
} from "../../managers/ExtensionReviewsManager";
import type { ModalManager } from "../../managers/ModalManager";
import { Tooltip, type TooltipAnchor } from "../Tooltip/Tooltip";

/**
 * Extensions built into the app are reviewed with the app's own code, so
 * they're always verified, whatever the reviews record says.
 */
const BUILT_IN_VERIFICATION: ExtensionVerification = { verified: true };

/**
 * Whether an extension is verified: always for one built into the app, and
 * otherwise what the reviews record says, once it's been read.
 */
export function useExtensionReview(
  reviews: ExtensionReviewsManager | undefined,
  extensionId: string,
  builtIn = false
): ExtensionVerification | null {
  useEffect(() => {
    if (!builtIn) {
      void reviews?.load(extensionId);
    }
  }, [reviews, extensionId, builtIn]);
  if (builtIn) {
    return BUILT_IN_VERIFICATION;
  }
  return reviews?.reviews.value[extensionId] ?? null;
}

function formatDate(ms: number, language: string): string {
  return new Date(ms).toLocaleDateString(language, { dateStyle: "medium" });
}

/** `ms` as a `datetime-local` input's value, in local time. */
function toDateTimeInputValue(ms: number): string {
  const date = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * The Verified mark, for a verified extension. Hovering over it shows when
 * it was verified and the reviewer's public notes.
 */
export function ExtensionReviewBadges(props: {
  review: ExtensionVerification | null;
  builtIn?: boolean;
}) {
  const { t, language } = useI18n();
  const anchor = useSignal<TooltipAnchor | null>(null);
  const { review } = props;
  if (!review?.verified) {
    return null;
  }

  const show = (event: { currentTarget: EventTarget | null }) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    anchor.value = {
      x: rect.left + rect.width / 2,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    };
  };
  const hide = () => (anchor.value = null);

  return (
    <span
      className="sb-extension-review-badge sb-extension-review-badge-verified"
      onPointerEnter={show}
      onPointerLeave={hide}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        verified
      </span>
      {t("extension-review-verified")}
      {anchor.value && (
        <Tooltip anchor={anchor.value} offsetY={6}>
          <span className="sb-extension-review-tooltip">
            <span className="sb-extension-review-tooltip-date">
              {props.builtIn
                ? t("extension-review-verified-built-in")
                : review.verifiedAtMs !== undefined
                  ? t("extension-review-verified-on", {
                      date: formatDate(review.verifiedAtMs, language),
                    })
                  : t("extension-review-verified-undated")}
            </span>
            {review.publicNotes && (
              <span className="sb-extension-review-tooltip-notes">
                {review.publicNotes}
              </span>
            )}
          </span>
        </Tooltip>
      )}
    </span>
  );
}

/**
 * Tells someone about to run a third-party extension whether Seed Bible has
 * verified it.
 */
export function ExtensionReviewNotice(props: {
  review: ExtensionVerification | null;
}) {
  const { t } = useI18n();
  const verified = props.review?.verified === true;
  return (
    <p className="sb-extension-consent-notice">
      <span
        className="material-symbols-outlined sb-extension-consent-notice-icon"
        aria-hidden="true"
      >
        {verified ? "verified" : "info"}
      </span>
      {verified
        ? t("extension-consent-verified")
        : t("extension-consent-unreviewed")}
    </p>
  );
}

function VerifyExtensionModalContent(props: {
  reviews: ExtensionReviewsManager;
  extensionId: string;
  name: string;
  review: ExtensionVerification | null;
  onClose: () => void;
}) {
  const { reviews, extensionId, review, onClose } = props;
  const { t } = useI18n();
  const verifiedAt = useSignal(
    toDateTimeInputValue(
      review?.verified && review.verifiedAtMs !== undefined
        ? review.verifiedAtMs
        : Date.now()
    )
  );
  const publicNotes = useSignal(
    review?.verified ? (review.publicNotes ?? "") : ""
  );
  const internalNotes = useSignal("");
  // Null while loading, false when they couldn't be read.
  const internalNotesLoaded = useSignal<boolean | null>(null);
  const saving = useSignal(false);
  const error = useSignal<string | null>(null);

  useEffect(() => {
    let current = true;
    void reviews.loadInternalNotes(extensionId).then((notes) => {
      if (!current) {
        return;
      }
      internalNotesLoaded.value = notes !== null;
      if (notes !== null) {
        internalNotes.value = notes;
      }
    });
    return () => {
      current = false;
    };
  }, [reviews, extensionId]);

  const save = async () => {
    const verifiedAtMs = new Date(verifiedAt.value).getTime();
    if (!verifiedAt.value || Number.isNaN(verifiedAtMs)) {
      error.value = t("extension-review-modal-invalid-date");
      return;
    }
    saving.value = true;
    error.value = null;
    const saved = await reviews.verify(extensionId, {
      verifiedAtMs,
      publicNotes: publicNotes.value,
      internalNotes: internalNotes.value,
    });
    saving.value = false;
    if (saved) {
      onClose();
    } else {
      error.value = t("extension-review-admin-save-failed");
    }
  };

  return (
    <form
      className="sb-extension-review-modal"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <p className="sb-extension-review-modal-intro">
        {t("extension-review-modal-intro", { name: props.name })}
      </p>
      <label className="sb-extension-review-field">
        <span className="sb-extension-review-field-label">
          {t("extension-review-modal-verified-at")}
        </span>
        <input
          type="datetime-local"
          name="verifiedAt"
          value={verifiedAt.value}
          onInput={(event) => (verifiedAt.value = event.currentTarget.value)}
        />
      </label>
      <label className="sb-extension-review-field">
        <span className="sb-extension-review-field-label">
          {t("extension-review-modal-public-notes")}
        </span>
        <span className="sb-extension-review-field-hint">
          {t("extension-review-modal-public-notes-hint")}
        </span>
        <textarea
          name="publicNotes"
          rows={3}
          value={publicNotes.value}
          onInput={(event) => (publicNotes.value = event.currentTarget.value)}
        />
      </label>
      <label className="sb-extension-review-field">
        <span className="sb-extension-review-field-label">
          {t("extension-review-modal-internal-notes")}
        </span>
        <span className="sb-extension-review-field-hint">
          {t("extension-review-modal-internal-notes-hint")}
        </span>
        <textarea
          name="internalNotes"
          rows={4}
          value={internalNotes.value}
          disabled={internalNotesLoaded.value !== true}
          onInput={(event) => (internalNotes.value = event.currentTarget.value)}
        />
      </label>
      {internalNotesLoaded.value === false && (
        <p className="sb-extension-review-error" role="alert">
          {t("extension-review-modal-internal-notes-failed")}
        </p>
      )}
      {error.value && (
        <p className="sb-extension-review-error" role="alert">
          {error.value}
        </p>
      )}
      <div className="sb-extension-review-modal-actions">
        <button
          type="button"
          className="sb-session-settings-cancel"
          onClick={onClose}
          disabled={saving.value}
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="sb-extension-review-button sb-extension-review-button-primary"
          disabled={saving.value || internalNotesLoaded.value !== true}
        >
          {review?.verified
            ? t("extension-review-modal-save")
            : t("extension-review-mark-verified")}
        </button>
      </div>
    </form>
  );
}

/**
 * Asks a reviewer when an extension was verified and for their notes on it,
 * then marks it verified.
 */
export function openVerifyExtensionModal(
  modals: ModalManager,
  options: {
    reviews: ExtensionReviewsManager;
    extensionId: string;
    name: string;
    review: ExtensionVerification | null;
  }
) {
  const id = `verify-extension-${options.extensionId}`;
  modals.openModal({
    id,
    title: options.review?.verified
      ? { key: "extension-review-edit", defaultValue: "Edit verification" }
      : {
          key: "extension-review-mark-verified",
          defaultValue: "Mark as verified",
        },
    content: () => (
      <VerifyExtensionModalContent
        {...options}
        onClose={() => modals.closeModal(id)}
      />
    ),
  });
}

/**
 * Lets an admin of the reviews record mark an extension verified, change
 * the details, or take the mark away. Renders nothing for anyone else.
 */
export function ExtensionReviewControls(props: {
  reviews: ExtensionReviewsManager;
  modals: ModalManager;
  extensionId: string;
  name: string;
  review: ExtensionVerification | null;
}) {
  const { reviews, modals, extensionId, name, review } = props;
  const { t, language } = useI18n();
  const removing = useSignal(false);
  const failed = useSignal(false);
  if (!reviews.canManage.value) {
    return null;
  }

  const openModal = () =>
    openVerifyExtensionModal(modals, { reviews, extensionId, name, review });

  const unverify = async () => {
    removing.value = true;
    failed.value = false;
    failed.value = !(await reviews.unverify(extensionId));
    removing.value = false;
  };

  return (
    <section className="sb-extension-info-section sb-extension-review-controls">
      <h2 className="sb-extension-info-heading">
        {t("extension-review-admin-title")}
      </h2>
      <p className="sb-extension-review-controls-note">
        {review?.verified
          ? review.verifiedAtMs !== undefined
            ? t("extension-review-admin-verified-on", {
                date: formatDate(review.verifiedAtMs, language),
              })
            : t("extension-review-verified-undated")
          : t("extension-review-admin-not-verified")}
      </p>
      <div className="sb-extension-review-controls-actions">
        <button
          type="button"
          className="sb-extension-review-button sb-extension-review-button-primary"
          onClick={openModal}
          disabled={removing.value}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {review?.verified ? "edit" : "verified"}
          </span>
          {review?.verified
            ? t("extension-review-edit")
            : t("extension-review-mark-verified")}
        </button>
        {review?.verified && (
          <button
            type="button"
            className="sb-extension-review-button"
            onClick={() => void unverify()}
            disabled={removing.value}
          >
            {t("extension-review-unverify")}
          </button>
        )}
      </div>
      {failed.value && (
        <p className="sb-extension-review-error" role="alert">
          {t("extension-review-admin-save-failed")}
        </p>
      )}
    </section>
  );
}
