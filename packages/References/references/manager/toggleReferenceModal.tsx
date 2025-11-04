import ReferenceModal from "references.manager.NewReferenceModal";
const { book, chapter, verse } = that;

const getReference = async () => {
    const references = await thisBot.GetReferences({bookId: tags.NameToId[book], chapter, verse});
    return references;
}

const reference = await getReference();
closePopupSettings();
await os.sleep(100);
openPopupSettings(
    <ReferenceModal reference={reference} />,
    null,
    true
)