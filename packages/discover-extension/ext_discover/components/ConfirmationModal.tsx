import { RenderHTMLContent } from "ext_discover.components.RenderHTMLContent";
import type { ConfirmationModalProps } from "ext_discover.interfaces.components.ConfirmationModal";
import { Modal } from "ext_discover.features.components.Modal";
import { Button } from "ext_discover.features.components.Button";
import { ButtonsCover } from "ext_discover.features.components.ButtonsCover";

const noPadding = {
  padding: "3.5rem",
};

const emptyObject = {};

export function ConfirmationModal({
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
  sxContainerModalStyles,
  modalStyles,
  controlBalInternal,
}: ConfirmationModalProps) {
  return (
    <Modal
      title={title}
      showIcon={false}
      onClose={() => onClose?.()}
      backDropStyle={{
        top: controlBalInternal ? "calc(100% + 80px - 100dvh)" : "0",
        left: controlBalInternal ? "-8px" : "0",
      }}
      floatingButton
      controlBalInternal={controlBalInternal}
      sxContainer={sxContainerModalStyles}
      styles={{ ...(noContPadding ? noPadding : emptyObject), ...modalStyles }}
    >
      <p
        style={{
          textAlign: "center",
          color: "var(--verseTextColor)",
          margin: "0",
          padding: "0",
          marginTop: "1rem",
        }}
      >
        {isParaHTML ? <RenderHTMLContent htmlContent={para || ""} /> : para}
      </p>
      {children}
      <ButtonsCover style={{ gap: "1rem", marginTop: "1rem" }}>
        {!noOnClose && (
          <Button
            style={{ width: "calc(50% - 0.5rem)", margin: "0" }}
            secondaryAlt={colorSwitch ? false : true}
            secondary={colorSwitch ? true : false}
            onClick={() => onClose?.()}
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
              await onConfirm?.();
            }}
          >
            {ctaText ? ctaText : t("confirm")}
          </Button>
        )}
      </ButtonsCover>
    </Modal>
  );
}
