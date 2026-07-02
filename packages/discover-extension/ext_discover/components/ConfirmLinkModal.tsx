import { ConfirmationModal } from "ext_discover.components.ConfirmationModal";
import type { ConfirmLinkModalProps } from "ext_discover.interfaces.components.ConfirmLinkModal";

export function ConfirmLinkModal({
  onClose,
  link,
  controlBalInternal,
}: ConfirmLinkModalProps) {
  return (
    <ConfirmationModal
      title={t("openLinkInNewTab")}
      para={t("openLinkInNewTabConfirm")}
      onClose={onClose}
      colorSwitch={true}
      ctaText={t("openLinkButton")}
      controlBalInternal={controlBalInternal}
      sxContainerModalStyles={{
        top: controlBalInternal ? "calc(50% - 50dvh + 80px)" : "50%",
      }}
      onConfirm={() => {
        os.openURL(link);
        onClose();
      }}
    />
  );
}
