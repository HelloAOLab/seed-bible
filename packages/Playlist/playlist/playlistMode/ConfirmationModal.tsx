const G = globalThis as any;
const { Input, Modal, Button, ButtonsCover } = G.Components;
const RenderHTMLContent = await thisBot.RenderHTMLContent();

const noPadding = {
  padding: "0 1rem",
};

const emptyObject = {};

const ConfirmationModal = (props: any) => {
  const {
    loading,
    title,
    para,
    children,
    onConfirm,
    onClose,
    colorSwitch,
    ctaText,
    noOnConfirm,
    noOnClose,
    isParaHTML,
    closeCTA,
    noContPadding,
  } = props;

  return (
    <Modal
      title={title}
      showIcon={false}
      onClose={() => onClose()}
      styles={{ ...(noContPadding ? noPadding : emptyObject) }}
    >
      <p style={{ textAlign: "center", color: "var(--verseTextColor)" }}>
        {isParaHTML ? <RenderHTMLContent htmlContent={para} /> : para}
      </p>
      {children}
      <ButtonsCover style={{ gap: "1rem", marginTop: "1rem" }}>
        {!noOnClose && (
          <Button
            style={{ width: "calc(50% - 0.5rem)", margin: "0" }}
            secondaryAlt={colorSwitch ? false : true}
            secondary={colorSwitch ? true : false}
            onClick={() => onClose()}
          >
            {closeCTA ? closeCTA : t("cancel")}
          </Button>
        )}
        {!noOnConfirm && (
          <Button
            style={{ width: "calc(50% - 0.5rem)", margin: "0" }}
            secondary={colorSwitch ? false : true}
            secondaryAlt={colorSwitch ? true : false}
            loading={loading}
            onClick={async () => {
              await onConfirm();
            }}
          >
            {ctaText ? ctaText : t("confirm")}
          </Button>
        )}
      </ButtonsCover>
    </Modal>
  );
};

return ConfirmationModal;
