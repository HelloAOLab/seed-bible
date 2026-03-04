const G = globalThis;
const { Input, Modal, Button, ButtonsCover } = G.Components;

const ConfirmationModal = (props: any) => {
  const { loading, title, para, children, onConfirm, onClose } = props;

  return (
    <Modal title={title} showIcon={false} onClose={() => onClose()}>
      <p style={{ textAlign: "center", color: "var(--verseTextColor)" }}>
        {para}
      </p>
      {children}
      <ButtonsCover style={{ gap: "1rem", marginTop: "1rem" }}>
        <Button
          style={{ width: "calc(50% - 0.5rem)", margin: "0" }}
          secondaryAlt
          onClick={() => onClose()}
        >
          {t("cancel")}
        </Button>
        <Button
          style={{ width: "calc(50% - 0.5rem)", margin: "0" }}
          secondary
          loading={loading}
          onClick={async () => {
            await onConfirm();
          }}
        >
          {t("confirm")}
        </Button>
      </ButtonsCover>
    </Modal>
  );
};

return ConfirmationModal;
