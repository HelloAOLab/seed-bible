const ConfirmationModal = await thisBot.ConfirmationModal();

const ConfirmLinkModal = (props: any) => {
  const { onClose, link } = props;

  return (
    <ConfirmationModal
      title={t("openLinkInNewTab")}
      para={t("openLinkInNewTabConfirm")}
      onClose={onClose}
      colorSwitch={true}
      ctaText={t("openLinkButton")}
      onConfirm={() => {
        os.openURL(link);
        onClose();
      }}
    />
  );
};

return ConfirmLinkModal;
