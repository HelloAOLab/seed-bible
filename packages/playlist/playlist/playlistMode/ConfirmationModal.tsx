const { Input, Modal, Button, ButtonsCover } = Components;

const ConfirmationModal = ({ loading, title, para, children, onConfirm, onClose }) => {

    return <Modal title={title} showIcon={false} onClose={() => onClose()}>
        <p style={{ textAlign: 'center', color: 'black' }}>{para}</p>
        {children}
        <ButtonsCover style={{ gap: '1rem', marginTop: '1rem' }}>
            <Button style={{ width: 'calc(50% - 0.5rem)', margin: '0' }} secondaryAlt onClick={() => onClose()}>
                Cancel
            </Button>
            <Button style={{ width: 'calc(50% - 0.5rem)', margin: '0' }} secondary loading={loading} onClick={async () => { await onConfirm(); }}>
                Confirm
            </Button>
        </ButtonsCover>
    </Modal>
}

return ConfirmationModal;