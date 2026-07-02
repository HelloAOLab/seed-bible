import { playlistContainerCss } from "ext_discover.css.PlaylistContainerCss";
import { getEditRichTextManager } from "ext_discover.managers.EditRichTextManager";
import type { EditRichTextProps } from "ext_discover.interfaces.components.EditRichText";
import { MiniTextEditor } from "seed-bible.components.smallEditor";
import { Modal } from "ext_discover.features.components.Modal";
import { Button } from "ext_discover.features.components.Button";
import { ButtonsCover } from "ext_discover.features.components.ButtonsCover";

export function EditRichText({
  onClose,
  contentId,
  parentID,
  text,
  isQuotedText,
  playlistId = "default",
  manager = getEditRichTextManager(playlistId),
}: EditRichTextProps) {
  manager.syncProps({ text, isQuotedText, contentId, parentID, playlistId });

  return (
    <>
      <style>{playlistContainerCss}</style>
      <Modal title={t("editText")} showIcon={false} onClose={onClose}>
        <div
          className="input-conainter-type playlist-cont-parent"
          style={{ position: "relative" }}
        >
          <MiniTextEditor
            id="edit"
            minHeight={60}
            showMoreOptions={false}
            initialHTML={manager.name.value}
            headingControls
            placeholderHTML={manager.name.value}
            onChange={(html: string) => {
              manager.name.value = html;
            }}
          />
          <div
            className="quoted-text-icon alter align-center"
            onClick={() => {
              manager.quotedText.value = !manager.quotedText.value;
            }}
          >
            <span>Show in popup</span>
            <div
              className={`settings-toggle ${manager.quotedText.value ? "active" : ""} small`}
            >
              <div className="settings-toggle-knob" />
            </div>
          </div>
        </div>
        <ButtonsCover>
          <Button secondary onClick={() => manager.onSave(onClose)}>
            {t("save")}
          </Button>
          <Button secondaryAlt onClick={onClose}>
            {t("close")}
          </Button>
        </ButtonsCover>
      </Modal>
    </>
  );
}
