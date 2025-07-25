const items = that;

const validTypes = ["verse", "heading", "attachment-link", "chapter"];

const validSubTypes = ["iframe", "youtube", "recording"];

const filterdArray = [];

if (Array.isArray(items)) {
    items.forEach(ele => {
        const typeOfElement = ele.type;
        const isAttachmentLink = ele.type === "attachment-link";
        const subType = isAttachmentLink ? ele.additionalInfo.type : null;

        if (isAttachmentLink && !subType) return;

        if (isAttachmentLink && validSubTypes.findIndex(ele => subType) < 0) {
            return;
        }

        if (validTypes.findIndex(ele => ele === typeOfElement) < 0) {
            return;
        }

        filterdArray.push({
            ...ele,
            id: createUUID()
        });
    });
}

return filterdArray;