const appName = 'on-date-add';

const { Input, Modal, Button, ButtonsCover } = Components;

const { onAttach } = that;

const { useState } = os.appHooks;

os.unregisterApp(appName);
os.registerApp(appName);

const onClose = () => {
    os.unregisterApp(appName);
}

const AddDateModal = () => {

    const [date, setDate] = useState(FORMAT_YYYY_MM_DD(new Date()));

    return <Modal title="Insert Date" showIcon={false} onClose={() => onClose()}>
        <h3>Add Date</h3>
        <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
                margin: "10px 0",
                padding: "8px",
                width: "100%",
                boxSizing: "border-box",
            }}
        />
        <ButtonsCover>
            <Button secondary onClick={() => { onAttach(date); onClose(); }}>
                Save
            </Button>
            <Button secondaryAlt onClick={() => onClose()}>
                Close
            </Button>
        </ButtonsCover>
    </Modal >
}

os.compileApp(appName, <AddDateModal />);