// const appName = 'eidt-rich-text-modal';

// os.unregisterApp(appName);
// os.registerApp(appName);

const { useState } = os.appHooks
const { Modal, Button, ButtonsCover } = Components;
import { MiniTextEditor } from 'app.components.smallEditor';
import { useSideBarContext } from "app.hooks.sideBar";
const id = "default";

const EditRichText = ({
    onClose,
    contentId,
    parentID,
    text
}) => {
    const { t } = useSideBarContext();
    const [name, setName] = useState(text || "");

    const onSave = () => {
        globalThis[`${id}EditPlaylistData`](contentId, name, parentID);
        onClose();
    }

    return <Modal title={t('editText')} showIcon={false} onClose={onClose}>
        <div className="input-conainter-type" >
            <MiniTextEditor
                id='edit'
                minHeight={60}
                initialHtml={name}
                placeholderHTML={name}
                onChange={(html) => {
                    setName(html);
                }}
            />
        </div>
        <ButtonsCover>
            <Button secondary onClick={() => { onSave(); }}>
                {t('save')}
            </Button>
            <Button secondaryAlt onClick={onClose}>
                {t('close')}
            </Button>
        </ButtonsCover>
    </Modal>
};

return EditRichText;