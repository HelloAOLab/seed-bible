import ReferenceModal from "references.manager.NewReferenceModal";
import { GetReferences } from "references.manager.GetReferences";
const { book, chapter, verse } = that;

const getReference = async () => {
  const references = await GetReferences({
    bookId: tags.NameToId[book],
    chapter,
    verse,
  });
  return references;
};

const reference = await getReference();
if (globalThis?.closePopupSettings) {
  globalThis.closePopupSettings();
}

if (globalThis?.openPopupSettings) {
  await os.sleep(100);
  globalThis.openPopupSettings(
    <ReferenceModal reference={reference} />,
    null,
    true
  );
}
