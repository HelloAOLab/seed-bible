import ReferenceModal from "references.manager.NewReferenceModal";
import {
  GetReferences,
  CalculatePopupPosition,
} from "references.manager.GetReferences";
const { book, chapter, verse, mouseEvent } = that;

const ToggleReferenceModal = async () => {
  const getReference = async () => {
    const references = await GetReferences({
      bookId: tags.NameToId[book],
      chapter,
      verse,
    });
    return references;
  };

  const reference = await getReference();

  if (!reference || !reference.references || reference.references.length == 0) {
    return;
  }
  if (globalThis?.closePopupSettings) {
    globalThis.closePopupSettings();
  }

  if (globalThis?.openPopupSettings) {
    await os.sleep(100);
    const position = CalculatePopupPosition(mouseEvent);
    globalThis.openPopupSettings(
      <ReferenceModal reference={reference} />,
      null,
      true,
      position
    );
  }
};

await ToggleReferenceModal();
