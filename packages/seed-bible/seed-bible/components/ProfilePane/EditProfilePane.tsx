import { useComputed, useSignal } from "@preact/signals";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { useI18n } from "../../i18n";
import { ProfileAvatarButton, ProfileContactLine } from "./ProfilePane";
import "./ProfilePane.css";
import { Button } from "../Button/Button";
import { TextField } from "../TextField/TextField";

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

        <TextField
          id="sb-edit-profile-name"
          label={t("profile-name", { defaultValue: "Profile name" })}
          maxLength={100}
          value={name.value}
          onValueInput={(value) => {
            newName.value = value;
          }}
          placeholder={t("profile-name-placeholder", {
            defaultValue: "e.g Craig family",
          })}
        />

        <TextField
          id="sb-edit-profile-location"
          label={t("location", { defaultValue: "Location" })}
          optional
          maxLength={100}
          value={location.value}
          onValueInput={(value) => {
            newLocation.value = value;
          }}
          placeholder={t("location-placeholder", {
            defaultValue: "e.g Austin,TX",
          })}
        />

        <TextField
          id="sb-edit-profile-description"
          label={t("description", { defaultValue: "Description" })}
          optional
          multiline
          rows={4}
          maxLength={300}
          showCount
          value={description.value}
          onValueInput={(value) => {
            newDescription.value = value;
          }}
          placeholder={t("description-placeholder", {
            defaultValue: "Enter your profile description...",
          })}
        />

        <Button
          variant="primary"
          size="lg"
          className="sb-profile-save"
          onClick={handleSave}
          disabled={!isProfileLoaded.value}
          loading={isSaving.value}
        >
          {!isProfileLoaded.value
            ? t("loading-profile", { defaultValue: "Loading your profile…" })
            : isSaving.value
              ? t("saving", { defaultValue: "Saving…" })
              : t("save-changes", { defaultValue: "Save changes" })}
        </Button>
      </div>
    </div>
  );
}
