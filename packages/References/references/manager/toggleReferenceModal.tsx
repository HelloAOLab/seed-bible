import ReferenceModal from "references.manager.ReferenceModal";
const { book, chapter, verse } = that;
const verseNumber = verse.verseNumber;

const references = () => {
    let referenceManager = getBot('system', 'references.manager');
    const key = `${tags.NameToId[book]}.${chapter}.${verseNumber}`;
    console.log(key, "key")
    const referencesArray = referenceManager.tags.references[key];
    return {
        key,
        referencesArray: referencesArray.map(item => item.split(",")[0])
    }
}
closePopupSettings();
await os.sleep(100);
openPopupSettings(
    <ReferenceModal references={references()} book={book} chapter={chapter} verse={verse} />,
    null,
    true
)