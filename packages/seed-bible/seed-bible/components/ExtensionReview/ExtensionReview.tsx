import "./ExtensionReview.css";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type {
  ExtensionReview,
  ExtensionReviewsManager,
} from "../../managers/ExtensionReviewsManager";

/** What the reviews record says about an extension, once it's been read. */
export function useExtensionReview(
  reviews: ExtensionReviewsManager | undefined,
  extensionId: string
): ExtensionReview | null {
  useEffect(() => {
    void reviews?.load(extensionId);
  }, [reviews, extensionId]);
  return reviews?.reviews.value[extensionId] ?? null;
}

/** "Verified" and "Reviewed" marks, for whichever of them apply. */
export function ExtensionReviewBadges(props: {
  review: ExtensionReview | null;
}) {
  const { t } = useI18n();
  const { review } = props;
  if (!review?.verified && !review?.reviewed) {
    return null;
  }
  return (
    <>
      {review.verified && (
        <span
          className="sb-extension-review-badge sb-extension-review-badge-verified"
          title={t("extension-review-verified-description")}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            verified
          </span>
          {t("extension-review-verified")}
        </span>
      )}
      {review.reviewed && (
        <span
          className="sb-extension-review-badge"
          title={t("extension-review-reviewed-description")}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            fact_check
          </span>
          {t("extension-review-reviewed")}
        </span>
      )}
    </>
  );
}

/**
 * Tells someone about to run a third-party extension whether Seed Bible has
 * gone through its code.
 */
export function ExtensionReviewNotice(props: {
  review: ExtensionReview | null;
}) {
  const { t } = useI18n();
  const reviewed = props.review?.reviewed === true;
  return (
    <p className="sb-extension-consent-notice">
      <span
        className="material-symbols-outlined sb-extension-consent-notice-icon"
        aria-hidden="true"
      >
        {reviewed ? "fact_check" : "info"}
      </span>
      {reviewed
        ? t("extension-consent-reviewed")
        : t("extension-consent-unreviewed")}
    </p>
  );
}

/**
 * Lets an admin of the reviews record mark an extension verified or
 * reviewed. Renders nothing for anyone else.
 */
export function ExtensionReviewControls(props: {
  reviews: ExtensionReviewsManager;
  extensionId: string;
  review: ExtensionReview | null;
}) {
  const { reviews, extensionId, review } = props;
  const { t } = useI18n();
  const saving = useSignal(false);
  const failed = useSignal(false);
  if (!reviews.canManage.value) {
    return null;
  }

  const save = async (change: Partial<ExtensionReview>) => {
    saving.value = true;
    failed.value = false;
    const saved = await reviews.setReview(extensionId, {
      verified: review?.verified ?? false,
      reviewed: review?.reviewed ?? false,
      ...change,
    });
    saving.value = false;
    failed.value = !saved;
  };

  return (
    <section className="sb-extension-info-section sb-extension-review-controls">
      <h2 className="sb-extension-info-heading">
        {t("extension-review-admin-title")}
      </h2>
      <p className="sb-extension-review-controls-note">
        {t("extension-review-admin-description")}
      </p>
      <label className="sb-extension-review-control">
        <input
          type="checkbox"
          checked={review?.verified ?? false}
          disabled={saving.value}
          onChange={(event) =>
            void save({ verified: event.currentTarget.checked })
          }
        />
        {t("extension-review-verified")}
      </label>
      <label className="sb-extension-review-control">
        <input
          type="checkbox"
          checked={review?.reviewed ?? false}
          disabled={saving.value}
          onChange={(event) =>
            void save({ reviewed: event.currentTarget.checked })
          }
        />
        {t("extension-review-reviewed")}
      </label>
      {failed.value && (
        <p className="sb-extension-review-controls-error" role="alert">
          {t("extension-review-admin-save-failed")}
        </p>
      )}
    </section>
  );
}
