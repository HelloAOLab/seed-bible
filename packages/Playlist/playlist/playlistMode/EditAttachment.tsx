const { Modal, Button, ButtonsCover } = Components;
const AttachLink = await thisBot.AttachLink();

const EditAttachment = ({
  id = "default",
  contentId,
  selectedType,
  name,
  data,
  link,
  mediaType,
  parentID,
  onClose,
}) => {
  const attachLink = (title, link, linkState) => {
    const dataItem = {
      id: contentId,
      content: title,
      additionalInfo: {
        link,
        ...linkState,
      },
      type: linkState.type === "text" ? "heading" : "attachment-link",
    };
    globalThis[`${id}EditPlaylistData`](contentId, dataItem, parentID, true);
    ShowNotification({ message: `Updated successfully!`, severity: "success" });
    onClose();
  };

  return (
    <Modal title="Edit Attachment" showIcon={false} onClose={onClose}>
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
        <Button
          secondary
          onClick={() => {
            globalThis.FireEditContent && globalThis.FireEditContent();
          }}
        >
          Update
        </Button>
        <Button secondaryAlt onClick={onClose}>
          Cancel
        </Button>
      </ButtonsCover>
    </Modal>
  );
};

return EditAttachment;
