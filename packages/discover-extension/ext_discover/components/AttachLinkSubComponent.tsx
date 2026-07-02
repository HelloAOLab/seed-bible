import { MiniTextEditor } from "seed-bible.components.smallEditor";
import { BIBLE_ICON, EditorId } from "ext_discover.models.attachLink";
import { RECORD_STOREKEY as RECORD_STOREKEY_MODEL } from "ext_discover.models.addNewPlaylist";
import {
  getAttachLinkOptions,
  getAttachLinkTextTypeOptions,
} from "ext_discover.hooks.getAttachLinkOptions";
import type { AttachLinkSubComponentProps } from "ext_discover.interfaces.components.AttachLink";

import { RecordingUI } from "ext_discover.components.RecordVoice";
import { VideoRecordUI } from "ext_discover.components.VideoRecordUI";
import { Input } from "ext_discover.features.components.Input";
import { Button } from "ext_discover.features.components.Button";
import { ButtonsCover } from "ext_discover.features.components.ButtonsCover";
import { Select } from "ext_discover.features.components.Select";

const G = globalThis as Record<string, any>;

export function AttachLinkSubComponent({
  manager,
  subManager,
  showChangeOptions = true,
}: AttachLinkSubComponentProps) {
  const editMode = manager.editMode.value;
  const dragState = manager.dragState.value;
  const recordingType = manager.recordingType.value;
  const name = manager.name.value;
  const link = manager.link.value;
  const mediaType = manager.mediaType.value;
  const data = manager.data.value;
  const type = manager.selectedType.value;
  const textType = manager.textType.value;
  const isQuotedText = manager.isQuotedText.value;
  const playlistListOptions = manager.playlistListOptions.value;
  const isWarningModalShow = subManager.isWarningModalShow.value;

  if (isWarningModalShow) {
    return (
      <div>
        <h2 style={{ fontSize: "1rem" }}>{t("thisWillLoseYourRecording")}</h2>
        <p>{t("switchWillLoseYourRecording")}</p>
        <ButtonsCover>
          <Button
            secondary
            onClick={() => subManager.setIsWarningModalShow(false)}
          >
            {t("no")}
          </Button>
          <Button
            secondaryAlt
            onClick={() => {
              subManager.setIsWarningModalShow(false);
              G.AfterConfirmCallBackRecording &&
                G.AfterConfirmCallBackRecording();
              G.AfterConfirmCallBackRecording = null;
            }}
            variant="black"
          >
            {t("confirm")}
          </Button>
        </ButtonsCover>
      </div>
    );
  }

  switch (type) {
    case "TAG":
      return (
        <div className="input-conainter-type">
          <Input
            value={name}
            onChangeListener={manager.setName}
            placeholder={t("tagName")}
          />
        </div>
      );
    case "SCRIPTURE":
      return (
        <div className="input-conainter-type" style={{ poistion: "relative" }}>
          {dragState.isDragOver && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                zIndex: 10000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(2px)",
              }}
            >
              <div
                style={{
                  backgroundColor: "white",
                  padding: "4px",
                  borderRadius: "12px",
                  border: "3px dashed var(--spaceSelection)",
                  textAlign: "center",
                  minWidth: "280px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                }}
              >
                <div
                  style={{
                    fontSize: "1rem",
                    color: "var(--spaceSelection)",
                  }}
                >
                  📁
                </div>
                <h3
                  style={{
                    margin: "0 0 8px 0",
                    color: "#333",
                    fontSize: "14px",
                  }}
                >
                  {t("dropFilesHere")}
                </h3>
                <p
                  style={{
                    margin: "0",
                    color: "#666",
                    fontSize: "12px",
                  }}
                >
                  {t("releaseToUploadFiles")}
                </p>
              </div>
            </div>
          )}
          <div className="align-center" style={{ gap: "0.5rem" }}>
            <div
              onClick={() => {
                G.SET_SHOW_CHECK?.(true);
                G.setOpenSidebar && G.setOpenSidebar(true);
                setTimeout(() => {
                  G.SetDontOpenPlaylist && G.SetDontOpenPlaylist(true);
                }, 200);
              }}
              style={{
                backgroundColor: "#E9E9E9",
                display: "grid",
                cursor: "pointer",
                padding: "13px 8px",
                borderRadius: "4px",
              }}
            >
              <img
                style={{ width: "24px", height: "14px" }}
                alt="bible"
                src={BIBLE_ICON}
              />
            </div>
            <div style={{ flexGrow: "1" }}>
              <Input
                style={{ marginBottom: "0" }}
                value={name}
                onChangeListener={manager.setName}
                placeholder={t("typeToAddScripture")}
              />
            </div>
          </div>
          {false && (
            <>
              <p className="or" style={{ textAlign: "center" }} />
              <Button
                secondary
                style={{
                  width: "100%",
                }}
                onClick={async () => {
                  const files = await os.showUploadFiles();
                  await manager.onAddFiles(files);
                }}
              >
                {t("importJSON")}
              </Button>
            </>
          )}
        </div>
      );
    case "RECORDING":
      return (
        <div className="input-conainter-type">
          <div className="switch-tabs">
            <div
              onClick={() => {
                subManager.recordingSwitchCallback(() => {
                  manager.setRecordingType("audio");
                  manager.setName("");
                });
              }}
              className={`${recordingType === "audio" ? "active" : ""}`}
            >
              <span
                class={`material-symbols-outlined ${recordingType !== "audio" && "img-icon"}`}
              >
                mic
              </span>
              <p>Audio</p>
            </div>
            <div
              onClick={() => {
                subManager.recordingSwitchCallback(() => {
                  manager.setRecordingType("video");
                  manager.setName("");
                });
              }}
              className={`${recordingType === "video" ? "active" : ""}`}
            >
              <span
                class={`material-symbols-outlined ${recordingType !== "video" && "img-icon"}`}
              >
                videocam
              </span>
              <p>{t("video")}</p>
            </div>
          </div>
          {recordingType === "audio" ? (
            <RecordingUI
              name={name}
              setName={manager.setName}
              data={data}
              setData={manager.setData}
            />
          ) : recordingType === "video" ? (
            <VideoRecordUI
              key="video"
              name={name}
              setName={manager.setName}
              data={data}
              setData={manager.setData}
            />
          ) : (
            <VideoRecordUI
              key="screen"
              isScreen={true}
              name={name}
              setName={manager.setName}
              data={data}
              setData={manager.setData}
            />
          )}
          <Input
            value={name}
            onChangeListener={manager.setName}
            placeholder={t("typeToAddCustomTitle")}
          />
        </div>
      );
    case "TEXT":
      return (
        <div className="input-conainter-type">
          {false && (
            <Select
              sxSelect={{ width: "7rem", marginBottom: "1rem" }}
              secondary
              value={textType}
              onChangeListener={(val: string) => {
                manager.setTextType(val);
              }}
              name={`${t("role")}:`}
              options={getAttachLinkTextTypeOptions(t)}
            />
          )}
          <MiniTextEditor
            id={EditorId}
            minHeight={60}
            headingControls
            showMoreOptions={false}
            placeholderHTML={name}
            initialHTML={name}
            onChange={(html: string) => {
              manager.setName(html);
            }}
          />
          <div
            className="quoted-text-icon"
            onClick={() => manager.setIsQuotedText(!isQuotedText)}
          >
            <span>Show in popup</span>
            <div
              className={`settings-toggle ${isQuotedText ? "active" : ""} small`}
            >
              <div className="settings-toggle-knob" />
            </div>
          </div>
          {isQuotedText && (
            <p className="info-type">{t("quotedTextModalDisplayOn")}</p>
          )}
          {isQuotedText && (
            <p className="info-type">
              {t("quotedTextModalDisplayDescription")}
            </p>
          )}
        </div>
      );
    case "LINK":
      return (
        <div
          className="input-conainter-type"
          style={{
            padding: "1px 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Input
            style={{ width: "100%" }}
            value={name}
            onChangeListener={manager.setName}
            placeholder={t("typeToAddCustomTitle")}
          />
          <div style={{ width: "100%", display: "flex", gap: "1rem" }}>
            <Select
              sxSelect={{ width: "7rem" }}
              secondary
              value={mediaType}
              onChangeListener={(val: string) => {
                manager.setLinkState({ isValid: false, type: val });
                manager.setMediaType(val);
              }}
              name={`${t("type")}:`}
              options={getAttachLinkOptions(t)}
            />
            <Input
              style={{ marginBottom: "0", flexGrow: "1" }}
              value={link}
              onChangeListener={manager.setLink}
              placeholder={`${t("exampleeg")} https://www.youtube.com/watch?v=ALsluAKBZ-czs3`}
            />
          </div>
        </div>
      );
    case "PLAYLIST":
      return (
        <div className="input-conainter-type" style={{ padding: "1px 0" }}>
          <Select
            sxSelect={{ width: "100%" }}
            secondary
            value={data}
            onChangeListener={(val: string) => {
              manager.setData(val);
            }}
            name={`${t("playlist")}:`}
            options={playlistListOptions}
          />
        </div>
      );
    case "FILE_UPLOAD":
      return (
        <div className="FILE_UPLOAD">
          <div
            onClick={async () => {
              manager.setLoading(true);
              const files: any = await os.showUploadFiles();
              const file = files?.[0];

              if (!file) {
                manager.setLoading(false);
                return ShowNotification({
                  message: t("noFileUploaded"),
                  severity: "error",
                });
              }

              const filesPromises: any = [];

              files.forEach((uploadFile: any) => {
                filesPromises.push(
                  os.recordFile(
                    G.RECORD_STOREKEY || RECORD_STOREKEY_MODEL,
                    uploadFile.data,
                    {
                      name: uploadFile.name,
                      mimeType: uploadFile.mimeType,
                    }
                  )
                );
              });

              try {
                let failCount = 0;
                const fileSave = await Promise.all(filesPromises);
                const filesResult: any = [];

                fileSave.forEach(
                  (
                    { success, url, existingFileUrl, errorCode },
                    index: number
                  ) => {
                    if (!success && errorCode !== "file_already_exists") {
                      failCount++;
                      return;
                    }
                    filesResult.push({
                      content: files[index].name,
                      id: G.createUUID(),
                      additionalInfo: {
                        link: url || existingFileUrl,
                        mimeType: files[index].mimeType,
                        type: "file",
                        isValid: true,
                      },
                      type: "attachment-link",
                    });
                  }
                );

                if (filesResult.length > 0) manager.setData(filesResult);

                manager.setLoading(false);

                if (failCount > 0) {
                  return ShowNotification({
                    message: t("failedToUploadSomeFiles"),
                    severity: "error",
                  });
                }
              } catch (error) {
                console.log(error);
                manager.setLoading(false);
                ShowNotification({
                  message: t("fileUploadFailed"),
                  severity: "error",
                });
              }
            }}
          >
            <img
              src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/6c8e5fa8be9c6bd0786104e4819b401b4b345a7734a7ebffb5d5e606ee182b45.png"
              style={{ height: "46px" }}
            />
            <p className="link">{t("dragDropOrClickToBrowse")}</p>
            <p className="info-type">{t("infoType")}</p>
          </div>
        </div>
      );
    default:
      return <p>{t("unknownDataType")}</p>;
  }
}
