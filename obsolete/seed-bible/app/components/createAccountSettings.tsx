import { getStyleOf } from "app.styles.styler";
import {
  MenuIcon,
  AiIcon,
  T,
  MenuDown,
  FormatLine,
  ColorSelect,
  ToolbarIcon,
  Panal,
  Playlist,
  AiChatIcon,
} from "app.components.icons";
import { useSideBarContext } from "app.hooks.sideBar";
const { useState, useEffect } = os.appHooks;
// await os.eraseData(tags.key, authBot.id)
const CreateAccountSettings = () => {
  const { sidebarMode, setSideBarMode, themeColors } = useSideBarContext();
  const [img, setImg] = useState<string | undefined>();
  const [profileName, setProfileName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [uid, setUid] = useState(authBot?.id);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const colors = themeColors;
  useEffect(() => {
    if (!authBot?.id) {
      setIsSignedIn(false);
      setUid("");
      setProfileName("");
      setDescription("");
      setLocation("");
      setImg(undefined);
    }
  }, [authBot]);

  async function init() {
    const authBot = await os.requestAuthBotInBackground();
    if (!authBot?.id) {
      setIsSignedIn(false);
      return;
    }
    shout("historySaver", { force: true });
    setIsSignedIn(true);
    setUid(authBot.id);
    const data = await os.getData(tags.key, authBot.id);
    if (data.success) {
      const payload = data.data;
      setImg(payload.photoLink);
      setTagMask(thisBot, `${configBot.id}-photo`, payload.photoLink, "shared");
      setProfileName(payload.profileName);
      setDescription(payload.description);
      setLocation(payload.location || "");
    }
  }
  useEffect(() => {
    init();
  }, []);

  globalThis.SetIsSignedIn = setIsSignedIn;
  globalThis.SetUid = setUid;
  globalThis.Init = init;

  async function uploadImage() {
    const authBot = await os.requestAuthBot();
    if (!authBot?.id) {
      os.toast(t("pleaseSignInFirst"));
      return;
    }
    const files = await os.showUploadFiles();
    if (files.length === 0) {
      os.toast(t("noFileUploaded2"));
      return;
    }
    const file = files[0];
    const result = await os.recordFile(authBot.id, file);

    if (result.success) {
      tags.uploadUrl = result.url;
      const data = await os.getData(tags.key, authBot.id);
      if (data.success) {
        await os.recordData(authBot.id, authBot.id, {
          ...data.data,
          photoLink: result.url,
        });
        setImg(result.url);
      } else {
        await os.recordData(authBot.id, authBot.id, {
          photoLink: result.url,
        });
        setImg(result.url);
      }
    } else {
      os.log(result);
      const img = (result as any).existingFileUrl;
      const data = await os.getData(tags.key, authBot.id);
      await os.recordData(authBot.id, authBot.id, {
        ...(data as any).data,
        photoLink: img,
      });
      setImg((result as any).existingFileUrl);
    }
  }
  async function saveProfileData() {
    const authBot = await os.requestAuthBot();
    if (!authBot?.id) {
      os.toast(t("pleaseSignInFirst"));
      return;
    }
    setIsSignedIn(true);
    setUid(authBot.id);
    const payload = {
      profileName,
      description,
      location,
    };
    const data = await os.getData(tags.key, authBot.id);
    const existingData = data.success ? data.data : {};
    const result = await os.recordData(authBot.id, authBot.id, {
      ...existingData,
      ...payload,
    });

    if (result?.success) {
      setSideBarMode("settings");
      os.toast(t("profileSavedSuccessfully"));
    } else {
      os.toast(t("errorSavingProfile") + result?.errorMessage);
    }
  }

  return (
    <div className="createAccount-settings">
      {/* Header */}
      <div className="profile-header">
        <h2 className="profile-title">{t("profile")}</h2>
        <div
          className="profile-close-btn"
          onClick={() => {
            if ((globalThis as any).AccountSettingsEnteredFrom === "settings") {
              setSideBarMode("settings");
              setTimeout(
                () => (globalThis as any).SetActiveSettingsTab("general"),
                0
              );
            } else if (
              (globalThis as any).AccountSettingsEnteredFrom === "default"
            ) {
              setSideBarMode("default");
            }
          }}
        >
          <MenuIcon name="close" />
        </div>
      </div>
      <p className="subtitle">{t("manageProfileInfo")}</p>

      {!isSignedIn && (
        <div className="sign-in-prompt">
          <div className="sign-in-prompt-text">
            {t("signInToCreateProfile")}
          </div>
          <button
            onClick={async () => {
              try {
                const authBot = await os.requestAuthBot();
                if (!tags.usersAuthIds) {
                  tags.usersAuthIds = [];
                }
                const authId = authBot?.id || null;
                const existingEntry = tags.usersAuthIds.find(
                  (entry: { authId: string | null; configId: string }) =>
                    entry.configId === configBot.id
                );
                if (!existingEntry) {
                  tags.usersAuthIds.push({ authId, configId: configBot.id });
                } else if (existingEntry.authId !== authId && authId !== null) {
                  existingEntry.authId = authId;
                }
                if (authBot?.id) {
                  shout("userLogin", { authId, configId: configBot.id });
                  setIsSignedIn(true);
                  setUid(authBot.id);
                  init();
                }
              } catch (e) {
                os.toast(t("signInFailed") + (e as Error).message);
              }
            }}
            className="save-btn"
          >
            {t("signIn")}
          </button>
        </div>
      )}

      {isSignedIn && (
        <>
          {/* Profile photo */}
          <div className="profile-photo-section">
            <div className="profile-photo">{img && <img src={img} />}</div>
            <button className="add-photo-btn" onClick={() => uploadImage()}>
              {t("updatePicture")}
            </button>
          </div>

          {/* Profile name */}
          <div className="form-group">
            <label className="form-label">{t("profileName")}</label>
            <input
              className="form-input"
              style={{
                background: colors
                  ? colors[1].pageTextColor + "20"
                  : "#1A1A1A20",
              }}
              placeholder={t("profileNamePlaceholder")}
              value={profileName}
              onChange={(e) =>
                setProfileName((e.target as HTMLInputElement).value)
              }
            />
            <p className="helper-text">{t("youCanChangeLater")}</p>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">
              {t("description")}{" "}
              <span className="optional-label">({t("optional")})</span>
            </label>
            <textarea
              className="form-input profile-textarea"
              style={{
                background: colors
                  ? colors[1].pageTextColor + "20"
                  : "#1A1A1A20",
              }}
              placeholder={t("profileDescPlaceholder")}
              value={description}
              onChange={(e) =>
                setDescription((e.target as HTMLTextAreaElement).value)
              }
            ></textarea>
          </div>

          {/* Location */}
          <div className="form-group">
            <label className="form-label">
              {t("locationLabel")}{" "}
              <span className="optional-label">({t("optional")})</span>
            </label>
            <input
              className="form-input"
              placeholder="e.g Austin,TX"
              style={{
                background: colors
                  ? colors[1].pageTextColor + "20"
                  : "#1A1A1A20",
              }}
              value={location}
              onChange={(e) =>
                setLocation((e.target as HTMLInputElement).value)
              }
            />
          </div>

          {/* UID */}
          <div className="uid-section">
            <div className="uid-label">{t("yourUidWillBe")}</div>
            <div
              className="uid-display"
              style={{
                background: colors
                  ? colors[1].pageTextColor + "20"
                  : "#1A1A1A20",
              }}
            >
              <span className="uid-text">{uid}</span>
              <span
                className="copy-icon"
                onClick={() => {
                  os.setClipboard(uid);
                  os.toast(t("uidCopied"));
                }}
              >
                <MenuIcon
                  style={{ color: "black !important" }}
                  name="content_copy"
                />
              </span>
            </div>
          </div>

          {/* Save button */}
          <button className="save-btn" onClick={saveProfileData}>
            {t("saveChanges")}
          </button>

          {/* Divider */}
          <div className="profile-divider"></div>

          {/* Sign out */}
          <button
            className="sign-out-btn"
            onClick={async () => {
              if (authBot) {
                await os.signOut();
                destroy(authBot);
              }
              setIsSignedIn(false);
              setUid("");
              setProfileName("");
              setDescription("");
              setLocation("");
              setImg(undefined);
              os.toast(t("signedOutSuccessfully"));
            }}
          >
            <MenuIcon style={{ color: "#B90303 !important" }} name="logout" />
            <span>{t("signOut")}</span>
          </button>
        </>
      )}
      <style>{getStyleOf("createAccountSettings.css")}</style>
    </div>
  );
};

export { CreateAccountSettings };
