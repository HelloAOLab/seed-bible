import { AttachLink } from "ext_discover.components.AttachLink";
import type { EditAttachmentProps } from "ext_discover.interfaces.components.EditAttachment";
import { Modal } from "ext_discover.features.components.Modal";
import { Button } from "ext_discover.features.components.Button";
import { ButtonsCover } from "ext_discover.features.components.ButtonsCover";

const G = globalThis as Record<string, any>;

export function EditAttachment({
  id = "default",
  contentId,
  selectedType,
  name,
  isQuotedText,
  data,
  link,
  mediaType,
  parentID,
  onClose,
}: EditAttachmentProps) {
  const attachLink = (
    title: string,
    linkUrl: string,
    linkState: Record<string, unknown>
  ) => {
    const dataItem = {
      id: contentId,
      content: title,
      additionalInfo: {
        link: linkUrl,
        ...linkState,
      },
      type: linkState.type === "text" ? "heading" : "attachment-link",
    };
    G[`${id}EditPlaylistData`]?.(contentId, dataItem, parentID, true);
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
        sIsQuotedText={isQuotedText}
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
}
