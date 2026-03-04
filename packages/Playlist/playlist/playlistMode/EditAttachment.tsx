const G = globalThis;
const { Modal, Button, ButtonsCover } = G.Components;
const AttachLink = await thisBot.AttachLink();

const EditAttachment = (props: any) => {
  const {
    id = "default",
    contentId,
    selectedType,
    name,
    data,
    link,
    mediaType,
    parentID,
    onClose,
  } = props;
  const attachLink = (title: string, link: string, linkState: any) => {
    const dataItem = {
      id: contentId,
      content: title,
      additionalInfo: {
        link,
        ...linkState,
      },
      type: linkState.type === "text" ? "heading" : "attachment-link",
    };
    G[`${id}EditPlaylistData`](contentId, dataItem, parentID, true);
    ShowNotification({
      message: t("updatedSuccessfully"),
      severity: "success",
    });
    onClose();
  };

  return (
    <Modal title={t("editAttachment")} showIcon={false} onClose={onClose}>
      <AttachLink
        editMode
        sSelectedType={selectedType}
        sName={name}
        attachLink={attachLink}
        sData={data}
        sLink={link}
        sMediaType={mediaType}
      />
      <ButtonsCover>
        <Button secondaryAlt onClick={onClose}>
          {t("close")}
        </Button>
        <Button
          secondary
          onClick={() => {
            G.FireEditContent && G.FireEditContent();
          }}
        >
          {t("update")}
        </Button>
      </ButtonsCover>
    </Modal>
  );
};

return EditAttachment;
