import { useComputed, useSignal } from "@preact/signals";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { useI18n } from "../../i18n";
import { ProfileAvatarButton, ProfileContactLine } from "./ProfilePane";
import "./ProfilePane.css";

export const EDIT_PROFILE_PANE_ID = "edit-profile-screen-pane";

export interface EditProfileScreenProps {
  state: SeedBibleState;
  /** Opens the picture cropper straight away, without an intermediate screen. */
  onEditPicture: () => void;
}

/** Pane header title. A component so it can call `useI18n`. */
export function EditProfilePaneTitle() {
  const { t } = useI18n();
  return <>{t("edit-profile", { defaultValue: "Edit profile" })}</>;
}

/**
 * The "Edit profile" screen: the same identity card as the Profile screen —
 * editable avatar and the email line — followed by the three fields the user
 * owns. The content rows and reading-plans card are deliberately absent; this
 * screen is only for editing who you are.
 *
 * Edits are held locally until Save, so a half-typed name never reaches the
 * account. `updateProfile` refuses to write before the profile has loaded (it
 * would otherwise merge onto an empty base and wipe what is stored), so Save
 * stays disabled until then rather than silently doing nothing.
 */
export function EditProfilePane(props: EditProfileScreenProps) {
  const { state, onEditPicture } = props;
  const { login } = state;
  const { t } = useI18n();

  const profile = useComputed(() => login.profile.value);
  const isProfileLoaded = useComputed(() => login.profile.value !== null);
  const isSaving = useComputed(() => login.isSavingProfile.value);

  const newName = useSignal<string | null>(null);
  const name = useComputed(() => newName.value ?? profile.value?.name ?? "");
  const newLocation = useSignal<string | null>(null);
  const location = useComputed(
    () => newLocation.value ?? profile.value?.location ?? ""
  );
  const newDescription = useSignal<string | null>(null);
  const description = useComputed(
    () => newDescription.value ?? profile.value?.description ?? ""
  );

  if (!login.userId.value) {
    return (
      <div className="sb-profile-screen">
        <div className="sb-profile-content">
          <p className="sb-profile-signin-hint">
            {t("profile-signed-out-message", {
              defaultValue:
                "Sign in to keep your highlights, notes and plans on every device.",
            })}
          </p>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    if (!isProfileLoaded.value) {
      return;
    }
    login.updateProfile({
      name: name.value,
      location: location.value || null,
      description: description.value || null,
    });
    newName.value = null;
    newLocation.value = null;
    newDescription.value = null;
  };

  return (
    <div className="sb-profile-screen">
      <div className="sb-profile-content">
        <div className="sb-profile-identity">
          <ProfileAvatarButton state={state} onEdit={onEditPicture} />
          <ProfileContactLine state={state} />
        </div>

        <div className="sb-profile-field">
          <label
            className="sb-profile-field-label"
            htmlFor="sb-edit-profile-name"
          >
            {t("profile-name", { defaultValue: "Profile name" })}
          </label>
          <input
            id="sb-edit-profile-name"
            className="sb-profile-field-input"
            type="text"
            maxLength={100}
            value={name.value}
            onInput={(event: Event) => {
              newName.value = (event.currentTarget as HTMLInputElement).value;
            }}
            placeholder={t("profile-name-placeholder", {
              defaultValue: "e.g Craig family",
            })}
          />
        </div>

        <div className="sb-profile-field">
          <label
            className="sb-profile-field-label"
            htmlFor="sb-edit-profile-location"
          >
            {t("location", { defaultValue: "Location" })}{" "}
            <span className="sb-profile-field-optional">
              {t("optional", { defaultValue: "(Optional)" })}
            </span>
          </label>
          <input
            id="sb-edit-profile-location"
            className="sb-profile-field-input"
            type="text"
            maxLength={100}
            value={location.value}
            onInput={(event: Event) => {
              newLocation.value = (
                event.currentTarget as HTMLInputElement
              ).value;
            }}
            placeholder={t("location-placeholder", {
              defaultValue: "e.g Austin,TX",
            })}
          />
        </div>

        <div className="sb-profile-field">
          <label
            className="sb-profile-field-label"
            htmlFor="sb-edit-profile-description"
          >
            {t("description", { defaultValue: "Description" })}{" "}
            <span className="sb-profile-field-optional">
              {t("optional", { defaultValue: "(Optional)" })}
            </span>
          </label>
          <textarea
            id="sb-edit-profile-description"
            className="sb-profile-field-input sb-profile-field-textarea"
            maxLength={300}
            value={description.value}
            onInput={(event: Event) => {
              newDescription.value = (
                event.currentTarget as HTMLTextAreaElement
              ).value;
            }}
            placeholder={t("description-placeholder", {
              defaultValue: "Enter your profile description...",
            })}
          />
        </div>

        <button
          type="button"
          className="sb-profile-save"
          onClick={handleSave}
          disabled={!isProfileLoaded.value || isSaving.value}
          aria-busy={isSaving.value}
        >
          {!isProfileLoaded.value
            ? t("loading-profile", { defaultValue: "Loading your profile…" })
            : isSaving.value
              ? t("saving", { defaultValue: "Saving…" })
              : t("save-changes", { defaultValue: "Save changes" })}
        </button>
      </div>
    </div>
  );
}
