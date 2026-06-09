// const appName = 'eidt-rich-text-modal';

// os.unregisterApp(appName);
// os.registerApp(appName);

const { useState } = os.appHooks;
const G = globalThis as any;
const { Modal, Button, ButtonsCover } = G.Components;
import { MiniTextEditor } from "app.components.smallEditor";

const id = "default";

const EditRichText = (props: any) => {
  const { onClose, contentId, parentID, text, isQuotedText } = props;
  const [name, setName] = useState(text || "");
  const [quotedText, setIsQuotedText] = useState(isQuotedText);

  const onSave = () => {
    G[`${id}EditPlaylistData`](contentId, name, parentID, false, quotedText);
    onClose();
  };

  return (
    <>
      <style>{thisBot.tags["PlaylistContainer.css"]}</style>
      <Modal title={t("editText")} showIcon={false} onClose={onClose}>
        <div
          className="input-conainter-type playlist-cont-parent"
          style={{ position: "relative" }}
        >
          <MiniTextEditor
            id="edit"
            minHeight={60}
            showMoreOptions={false}
            initialHTML={name}
            headingControls
            placeholderHTML={name}
            onChange={(html: string) => {
              setName(html);
            }}
          />
          <div
            className="quoted-text-icon alter align-center"
            onClick={() => setIsQuotedText(!quotedText)}
          >
            <span>Show in popup</span>
            <div
              className={`settings-toggle ${isQuotedText ? "active" : ""} small`}
            >
              <div className="settings-toggle-knob" />
            </div>
          </div>
        </div>
        <ButtonsCover>
          <Button
            secondary
            onClick={() => {
              onSave();
            }}
          >
            {t("save")}
          </Button>
          <Button secondaryAlt onClick={onClose}>
            {t("close")}
          </Button>
        </ButtonsCover>
      </Modal>
    </>
  );
};

return EditRichText;
