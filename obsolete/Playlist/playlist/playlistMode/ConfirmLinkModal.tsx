const ConfirmationModal = await thisBot.ConfirmationModal();

const ConfirmLinkModal = (props: any) => {
  const { onClose, link, controlBalInternal } = props;

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
};

return ConfirmLinkModal;
