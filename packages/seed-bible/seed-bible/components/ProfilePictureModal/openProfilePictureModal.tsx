import { lazy, Suspense } from "preact/compat";
import type { ModalManager } from "../../managers/ModalManager";
import type { LoginManager } from "../../managers/LoginManager";
import { Skeleton, SkeletonContainer } from "../Skeleton/Skeleton";

// The picture editor pulls in `react-avatar-editor`, so it is fetched when the
// user actually asks to change their picture rather than at boot.
const ProfilePictureModalContent = lazy(() =>
  import("./ProfilePictureModal").then((m) => ({
    default: m.ProfilePictureModalContent,
  }))
);

export interface OpenProfilePictureModalOptions {
  modals: ModalManager;
  login: LoginManager;
  /** Translation function — the `t` from `useI18n()` or from the i18n manager. */
  t: (key: string, options?: Record<string, unknown>) => string;
  /**
   * Called with `true` while the chosen file is uploading and `false` once it
   * settles, so a caller can disable its own affordance meanwhile.
   */
  onUploadingChange?: (uploading: boolean) => void;
}

/**
 * Opens the "Update picture" modal and persists whatever the user crops.
 *
 * Shared by account settings and the Profile screen's avatar so both land on
 * the same editor with the same upload path.
 */
export function openProfilePictureModal(
  options: OpenProfilePictureModalOptions
): string {
  const { modals, login, t, onUploadingChange } = options;

  const modalId = modals.openModal({
    title: { key: "update-picture", defaultValue: "Update picture" },
    content: () => (
      <Suspense
        fallback={
          <SkeletonContainer
            label={t("loading-picture-editor", {
              defaultValue: "Loading the picture editor…",
            })}
          >
            <Skeleton width="100%" height="16rem" radius="0.625rem" />
          </SkeletonContainer>
        }
      >
        <ProfilePictureModalContent
          onClose={() => modals.closeModal(modalId)}
          onUpload={async (file) => {
            onUploadingChange?.(true);
            try {
              await login.uploadProfilePicture(file);
            } catch (error) {
              console.error("Failed to upload profile picture.", error);
              throw error;
            } finally {
              onUploadingChange?.(false);
            }
          }}
        />
      </Suspense>
    ),
  });

  return modalId;
}
