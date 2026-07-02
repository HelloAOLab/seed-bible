import { RecordingUI } from "ext_discover.components.RecordVoice";
import { VideoRecordUI } from "ext_discover.components.VideoRecordUI";
import { buildCustomAnnotationToolbarMap } from "ext_discover.components.buildCustomAnnotationToolbarMap";
import { getCustomAnnotationTextEditorCss } from "ext_discover.css.customAnnotationTextEditorCss";
import { getCustomAnnotationTextEditorManager } from "ext_discover.managers.CustomAnnotationTextEditorManager";
import { DEFAULT_TOOLBAR_PRIORITY } from "ext_discover.models.customAnnotationTextEditor";
import type { CustomAnnotationTextEditorProps } from "ext_discover.interfaces.components.CustomAnnotationTextEditor";
import { SelectionOptions } from "ext_discover.components.SelectionOptions";
import { Button } from "ext_discover.features.components.Button";
import { Input } from "ext_discover.features.components.Input";

const G = globalThis as Record<string, any>;

export function CustomAnnotationTextEditor(
  props: CustomAnnotationTextEditorProps
) {
  const key = props.instanceId || props.id || "default-editor";
  const m = props.manager ?? getCustomAnnotationTextEditorManager(key, props);
  m.syncProps(props);
  m.mount();

  const toolbarMap = buildCustomAnnotationToolbarMap({
    Cmds: m.Cmds,
    textColor: m.textColor.value,
    setTextColor: m.setTextColor,
    bgColor: m.bgColor.value,
    setBgColor: m.setBgColor,
    fontPx: m.fontPx.value,
    setFontPx: m.setFontPx,
    lineSpacing: m.lineSpacing.value,
    setLineSpacing: m.setLineSpacing,
    padY: m.padY.value,
    setPadY: m.setPadY,
    padX: m.padX.value,
    setPadX: m.setPadX,
    onPickImage: m.onPickImage,
    onPickJSON: m.onPickJSON,
    onAddLink: m.onAddLink,
    chain: m.chain,
    chainArg: m.chainArg,
    chainWith: m.chainWith,
    setDraftOrder: m.setDraftOrder,
    setShowTuning: m.setShowTuning,
    orderedIds: m.orderedIds,
  });

  return (
    <>
      {m.isCommandBox.value && (
        <div
          className="command-box-backdrop"
          onClick={m.toggleCommandBox}
          style={{
            display: m.isCommandBox.value ? "block" : "none",
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 98,
          }}
        ></div>
      )}
      <div
        ref={m.setDragRootRef}
        className={`sre-root ${m.isVideo.value ? "sre-video-root" : ""} ${m.className.value || ""}`}
        style={{ ...m.style.value }}
      >
        {m.isCommandBox.value && (
          <div
            className="relative-float command-box"
            style={{
              backgroundColor: "var(--pageBackground)",
              backdropFilter: "none",
            }}
          >
            {m.filteredCommandBoxOptions.value.length === 0 && (
              <div className="command-box-option">
                <p>{t("noOptionsFound")}</p>
              </div>
            )}
            {m.filteredCommandBoxOptions.value.map((option) => (
              <div
                className="command-box-option"
                key={option.label}
                onClick={option.onClick}
              >
                <img
                  className="img-icon"
                  src={option.icon}
                  alt={option.label}
                />
                <p>{option.label}</p>
              </div>
            ))}
          </div>
        )}

        {m.isTagSuggestionsOpen.value && (
          <SelectionOptions
            handleClose={() => m.setIsTagSuggestionsOpen(false)}
            options={m.tagOptions.value}
            onClickOption={m.onClickTags}
          />
        )}
        {m.isPlaylistSuggestionOpen.value && (
          <SelectionOptions
            loading={m.savingPlaylist.value || m.loadingPlaylistOptions.value}
            isPlaylist
            dontCloseOnClick
            handleClose={() => m.setIsPlaylistSuggestionOpen(false)}
            options={m.playlistOptions.value}
            onClickOption={m.onClickPlaylist}
          />
        )}

        {(m.isMic.value || m.isLink.value || m.isVideo.value) && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "-4%",
              right: 0,
              bottom: 0,
              backgroundColor: "var(--pageBackground)",
              zIndex: 10000,
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              width: "107%",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(2px)",
              "m.minHeight.value": "max-content",
              height: "calc(100% + 90px)",
              padding: "1rem 0",
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexDirection: "column",
              }}
            >
              {m.isLink.value ? (
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
                    value={m.name.value}
                    onChangeListener={m.setName}
                    placeholder={t("typeToAddCustomTitle")}
                  />
                  <div style={{ width: "100%", display: "flex", gap: "1rem" }}>
                    <Input
                      style={{ marginBottom: "0", flexGrow: "1" }}
                      value={m.link.value}
                      onChangeListener={m.setLink}
                      placeholder={`${t("exampleeg")} https://www.youtube.com/watch?v=ALsluAKBZ-czs3`}
                    />
                  </div>
                </div>
              ) : m.isVideo.value ? (
                <VideoRecordUI data={m.data.value} setData={m.setData} />
              ) : (
                <RecordingUI data={m.data.value} setData={m.setData} />
              )}

              <div style={{ display: "flex", gap: "10px" }}>
                <Button
                  onClick={m.onSaveAndAdd}
                  secondary
                  loading={m.loading.value}
                >
                  {t("saveAndAdd")}
                </Button>
                <Button
                  onClick={() => {
                    m.setRecording(null);
                    m.setData(null);
                    G.hasRecording = false;
                    G.isRecording = false;
                  }}
                  secondaryAlt
                >
                  {t("cancel")}
                </Button>
              </div>
            </div>
          </div>
        )}
        {(m.dragState.value.isDragOver || m.loading.value) &&
          !m.isMic.value &&
          !m.isVideo.value && (
            <div
              className="relative-float"
              style={{
                top: "3rem",
              }}
            >
              <div
                style={{
                  display: "grid",
                  width: "100%",
                  backgroundColor: "white",
                  padding: "4px",
                  borderRadius: "12px",
                  border: "3px dashed var(--spaceSelection)",
                  textAlign: "center",
                  minWidth: "280px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                  zIndex: 99999,
                }}
              >
                {m.loading.value ? (
                  <div
                    style={{
                      color: "#333",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                    }}
                  >
                    <div className="sre-loading-spinner"></div>
                    <p>{t("uploadingFiles")}</p>
                    <p>{t("pleaseWaitWhileUploadingFiles")}</p>
                    <p>{t("uploadMayTakeAFewSeconds")}</p>
                    <p>{t("thankYouForYourPatience")}</p>
                  </div>
                ) : (
                  <div>
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
                      Drop files here
                    </h3>
                    <p
                      style={{
                        margin: "0",
                        color: "#666",
                        fontSize: "12px",
                      }}
                    >
                      Release to upload files
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
        <style>{getCustomAnnotationTextEditorCss(m.minHeight.value)}</style>

        <input
          ref={m.setFileImgInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={m.onImageSelected}
        />
        <input
          ref={m.setFileJsonInputRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={m.onJSONSelected}
        />

        <div className="sre-toolbar" ref={m.setToolbarRef}>
          <div className="sre-measurer" ref={m.setMeasurerRef}>
            {m.orderedIds().map((id) => (
              <div
                key={`m-${id}`}
                ref={(el) => m.setItemRef(id, el)}
                className="sre-item-measurer"
              >
                {toolbarMap[id]}
              </div>
            ))}
          </div>

          {m.visibleIds.value.map((id) => (
            <div key={`v-${id}`} className="sre-item">
              {toolbarMap[id]}
            </div>
          ))}

          {m.showMoreOptions.value && (
            <div className="sre-item">
              <button
                className="sre-overflow-btn"
                onClick={() => m.setShowOverflow((v) => !v)}
                title="More"
              >
                <span className="material-symbols-outlined">more_vert</span>
              </button>
            </div>
          )}
        </div>

        {m.showOverflow.value && (
          <div className="sre-overflow-tray">
            {m.overflowIds.value.length === 0 && (
              <div className="sre-overflow-empty">No more items</div>
            )}
            {m.overflowIds.value.map((id) => (
              <div key={`o-${id}`} className="sre-overflow-item">
                {toolbarMap[id]}
              </div>
            ))}
          </div>
        )}

        <div
          id={`sre-editor-${m.getInstanceKey()}`}
          ref={m.setEditorRef}
          className="sre-editor"
        />
        {false && (
          <p className="sre-hashtag-hint">
            You can add tags by typing # followed by the hashtag. For example,
            #love #faith #hope.
          </p>
        )}
        {m.showTuning.value && (
          <div
            className="sre-tune-backdrop"
            onClick={() => m.setShowTuning(false)}
          >
            <div
              className="sre-tune-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sre-tune-header">
                <div>Customize toolbar order</div>
                <button
                  className="sre-tune-close"
                  onClick={() => m.setShowTuning(false)}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="sre-tune-body">
                {m.draftOrder.value.map((id, idx) => (
                  <div key={`dr-${id}`} className="sre-tune-row">
                    <div className="sre-tune-id">{id}</div>
                    <div className="sre-tune-arrows">
                      <button onClick={() => m.moveDraft(idx, -1)} title="Up">
                        <span className="material-symbols-outlined">
                          keyboard_arrow_up
                        </span>
                      </button>
                      <button onClick={() => m.moveDraft(idx, 1)} title="Down">
                        <span className="material-symbols-outlined">
                          keyboard_arrow_down
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="sre-tune-footer">
                <button
                  className="sre-btn-secondary"
                  onClick={() => m.setDraftOrder([...DEFAULT_TOOLBAR_PRIORITY])}
                >
                  Reset
                </button>
                <div style={{ flex: 1 }} />
                <button className="sre-btn-primary" onClick={m.saveDraft}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
