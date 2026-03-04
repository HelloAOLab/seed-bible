// const appName = 'eidt-rich-text-modal';

// os.unregisterApp(appName);
// os.registerApp(appName);

const { useState } = os.appHooks;
const G = globalThis;
const { Modal, Button, ButtonsCover } = G.Components;
import { MiniTextEditor } from "app.components.smallEditor";

const id = "default";

const EditRichText = (props: any) => {
  const { onClose, contentId, parentID, text } = props;

  const [name, setName] = useState(text || "");

  const onSave = () => {
    G[`${id}EditPlaylistData`](contentId, name, parentID);
    onClose();
  };

  return (
    <Modal title={t("editText")} showIcon={false} onClose={onClose}>
      <div className="input-conainter-type">
        <MiniTextEditor
          id="edit"
          minHeight={60}
          initialHTML={name}
          placeholderHTML={name}
          onChange={(html: string) => {
            setName(html);
          }}
        />
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
  );
};

return EditRichText;
