const appName = 'eidt-rich-text-modal';

os.unregisterApp(appName);
os.registerApp(appName);

const { useState } = os.appHooks
const { Modal, Button, ButtonsCover } = Components;
import { MiniTextEditor } from 'app.components.smallEditor';

const contentId = that.id;
const text = that.text;

const id = "default";

const EditRichText = () => {
    const [name, setName] = useState(text || "");

    const onSave = () => {
        globalThis[`${id}EditPlaylistData`](contentId, name);
        os.unregisterApp(appName);
    }

    return <Modal title="Edit Text" showIcon={false} onClose={() => os.unregisterApp(appName)}>
        <div className="input-conainter-type" >
            <MiniTextEditor
                id='3'
                initialHtml={name}
                onChange={(html) => {
                    setName(html);
                }}
            />
        </div>
        <ButtonsCover>
            <Button secondary onClick={() => { onSave(); }}>
                Save
            </Button>
            <Button secondaryAlt onClick={() => os.unregisterApp(appName)}>
                Close
            </Button>
        </ButtonsCover >
    </Modal >
};

os.compileApp(appName, <EditRichText />)