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
  const { sidebarMode, setSideBarMode } = useSideBarContext();
  const [img, setImg] = useState();
  const [profileName, setProfileName] = useState("");
  const [description, setDescription] = useState("");
  const [uid, setUid] = useState(authBot?.id);
  const [isSignedIn, setIsSignedIn] = useState(false);
  async function init() {
    const authBot = await os.requestAuthBotInBackground();
    if (!authBot?.id) {
      setIsSignedIn(false);
      return;
    }
    setIsSignedIn(true);
    setUid(authBot.id);
    const data = await os.getData(tags.key, authBot.id);
    if (data.success) {
      const payload = data.data;
      setImg(payload.photoLink);
      setTagMask(thisBot,`${configBot.id}-photo`,payload.photoLink,'shared');
      setProfileName(payload.profileName);
      setDescription(payload.description);
    }
  }
  useEffect(() => {
    init();
  }, []);
  async function uploadImage() {
    const authBot = await os.requestAuthBot();
    if (!authBot?.id) {
      os.toast("Please sign in first");
      return;
    }
    const files = await os.showUploadFiles();
    if (files.length === 0) {
      os.toast("no file uploaded");
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
      const img = result.existingFileUrl;
      const data = await os.getData(tags.key, authBot.id);
      await os.recordData(authBot.id, authBot.id, {
        ...data.data,
        photoLink: img,
      });
      setImg(result.existingFileUrl);
    }
  }
  async function saveProfileData() {
    const authBot = await os.requestAuthBot();
    if (!authBot?.id) {
      os.toast("Please sign in first.");
      return;
    }
    setIsSignedIn(true);
    setUid(authBot.id);
    const payload = {
      profileName,
      description,
    };
    const data = await os.getData(tags.key, authBot.id);
    const existingData = data.success ? data.data : {};
    const result = await os.recordData(authBot.id, authBot.id, {
      ...existingData,
      ...payload,
    });

    if (result?.success) {
      setSideBarMode("settings");
      os.toast("Profile saved successfully!");
    } else {
      os.toast("Error saving profile: " + result?.errorMessage);
    }
  }

  return (
    <div className="createAccount-settings">
      <div>
        <div className="routerOptions">
          <div
            style={{ cursor: "pointer" }}
            onClick={() => {
              if (globalThis.AccountSettingsEnteredFrom === "settings") {
                setSideBarMode("settings");
                setTimeout(() => globalThis.SetActiveSettingsTab("general"), 0);
              } else if (globalThis.AccountSettingsEnteredFrom === "default") {
                setSideBarMode("default");
              }
            }}
            className="blackText"
          >
            <MenuIcon name="arrow_back" />
          </div>
          <div className="softText">Create new profile</div>
        </div>
      </div>
      <div style={{ "margin-top": "-10px" }} className="routerTitle blackText">
        <div>Create profile</div>
      </div>

      <div className="mediumText">Add a new profile to your account</div>
      {!isSignedIn && (
        <div
          style={{
            background: "#FFF3CD",
            border: "1px solid #FFECB5",
            borderRadius: "6px",
            padding: "15px",
            marginBottom: "15px",
          }}
        >
          <div style={{ color: "#856404", marginBottom: "10px" }}>
            Please sign in to create or edit your profile
          </div>
          <button
            onClick={async () => {
              const authBot = await os.requestAuthBot();
              if (authBot?.id) {
                if (!tags.usersAuthIds) {
                  tags.usersAuthIds = [];
                }
                if (!tags.usersAuthIds.includes(authBot.id)) {
                  tags.usersAuthIds.push(authBot.id);
                }
                setIsSignedIn(true);
                setUid(authBot.id);
                init();
              }
            }}
            style={{
              background: "#4459F3",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Sign In
          </button>
        </div>
      )}
      {isSignedIn && (
        <>
          <div
            style={{
              display: "flex",
              "align-items": "center",
              "justify-content": "center",
              width: "100%",
              gap: "25px",
            }}
          >
            <img
              style={{
                "border-radius": "50%",
                height: "50px",
                width: "50px",
                border: "1px solid #4459F3",
              }}
              src={img}
            />
            <button
              onClick={() => uploadImage()}
              style={{
                background: "#4459F31A",
                border: "1px solid #4459F3",
                width: "100px",
                height: "30px",
                color: "#4459F3",
              }}
            >
              Add picture
            </button>
          </div>
          <div style={{ height: "20px" }}></div>
          <div className="blackText">Profile name</div>
          <div style={{ height: "10px" }}></div>
          <input
            style={{ height: "25px" }}
            placeholder="e.g Craig family"
            className="selectInput"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
          />
          <p style={{ "font-size": "10px", color: "#5F5E5C" }}>
            You can change this later
          </p>
          <div style={{ height: "20px" }}></div>
          <div className="blackText">
            Description{" "}
            <span style={{ "font-size": "10px", color: "#5F5E5C" }}>
              (Optional)
            </span>
          </div>
          <div style={{ height: "10px" }}></div>
          <textarea
            style={{ height: "50px" }}
            placeholder="Enter your profile description..."
            className="selectInput"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          ></textarea>
          <div style={{ height: "20px" }}></div>
          <div className="blackText">Your ID is:</div>
          <div style={{ height: "10px" }}></div>
          <input
            style={{ height: "25px" }}
            value={uid}
            className="selectInput"
            readOnly
          />
          <div style={{ height: "20px" }}></div>
          <button
            onClick={saveProfileData}
            style={{
              background: "#4459F3",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Save Profile
          </button>
        </>
      )}
      <style>{getStyleOf("createAccountSettings.css")}</style>
    </div>
  );
};

export { CreateAccountSettings };
