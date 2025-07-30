const { Input, Modal, Button, ButtonsCover } = Components;

const ConfirmationModal = ({ loading, title, para, children, onConfirm, onClose }) => {

    return <Modal title={title} showIcon={false} onClose={() => onClose()}>
        <p>{para}</p>
        {children}
        <ButtonsCover>
            <Button secondary loading={loading} onClick={async () => { await onConfirm(); }}>
                Confirm
            </Button>
            <Button secondaryAlt onClick={() => onClose()}>
                Cancel
            </Button>
        </ButtonsCover>
    </Modal>
}

return ConfirmationModal;