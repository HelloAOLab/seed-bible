const { Modal, Button, ButtonsCover, } = Components;
const AttachLink = await thisBot.AttachLink();
const { useSideBarContext } = await import("app.hooks.sideBar");
const EditAttachment = ({
    id = "default",
    contentId,
    selectedType,
    name,
    data,
    link,
    mediaType,
    parentID,
    onClose }) => {
    const { t } = useSideBarContext();

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
        ShowNotification({ message: t('updatedSuccessfully'), severity: "success" });
        onClose();
    };

    return <Modal title={t('editAttachment')} showIcon={false} onClose={onClose}>
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
                {t('update')}
            </Button>
            <Button secondaryAlt onClick={onClose}>
                {t('close')}
            </Button>
        </ButtonsCover>
    </Modal>
}

return EditAttachment;