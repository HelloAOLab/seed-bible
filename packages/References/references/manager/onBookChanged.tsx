import type {
  ReferencesInterface,
  ReferenceInterface,
} from "references.manager.interfaces";
import {
  GetReferences,
  GetChapterContent,
} from "references.manager.GetReferences";

import MakeReferenceOptions from "references.manager.makeReferenceOptions";

console.log("Book changed, loading references", that);

const lazyLoadBookReferences = async () => {
  const { bookId, chapter } = that;

  if (masks?.[`reference.${bookId}.${chapter}.loaded`]) {
    console.log("references already loaded for this chapter");
    return;
  }

  const referenceUrl = `https://bible.helloao.org/api/d/open-cross-ref/${bookId}/${chapter}.json`;

  const referenceReq = await web.get(referenceUrl);

  if (referenceReq.status == 200) {
    const loadedReferencesPromises = [];
    const content = [...referenceReq.data.chapter.content];
    for (let i = 0; i < 5; i++) {
      const verse = content[i].verse;
      const referenceObject: ReferencesInterface = {
        book: bookId,
        chapter,
        verse,
        references: [...content[i].references],
      };
      setTagMask(
        thisBot,
        `reference.${bookId}.${chapter}.${verse}`,
        JSON.stringify(referenceObject),
        "local"
      );
      loadedReferencesPromises.push(populateReferenceData(referenceObject));
    }
    await Promise.all(loadedReferencesPromises);
    setTagMask(
      thisBot,
      `reference.${bookId}.${chapter}.loaded`,
      "true",
      "local"
    );
  }
};

const populateReferenceData = async (reference: ReferencesInterface) => {
  const referenceArray: ReferenceInterface[] = reference.references || [];
  const referenceBot = getBot("system", "references.manager");

  const referenceArrayKey = `referenceDataObject-${reference.book}.${reference.chapter}.${reference.verse}`;
  if (referenceBot.masks?.[`${referenceArrayKey}`]) {
    console.log("reference data present in storage");
    return JSON.parse(referenceBot.masks[`${referenceArrayKey}`]);
  } else {
    console.log("retrieving from web");
    const referenceDataPromises = referenceArray.map((reference) => {
      return GetChapterContent({
        bookId: reference.book,
        chapter: reference.chapter,
        reference: reference,
      });
    });
    const referenceReqs = await Promise.all(referenceDataPromises);
    const tempReferenceData: {
      [key: string]: { content: string; references?: ReferenceInterface[] };
    } = {};

    const subReferences: Promise<ReferencesInterface>[] = [];

    referenceReqs.forEach((res, index) => {
      if (!res) {
        return;
      }
      if (referenceArray[index]) {
        const reference: ReferenceInterface = referenceArray[index];
        const referenceKey = `${reference.book}.${reference.chapter}.${reference.verse}`;
        tempReferenceData[referenceKey] = { content: res, references: [] };
        subReferences.push(
          GetReferences({
            bookId: reference.book,
            chapter: reference.chapter,
            verse: reference.verse,
          })
        );
      }
    });

    const subReferencesRes = await Promise.all(subReferences);

    subReferencesRes.forEach((res, index) => {
      if (reference.references[index]) {
        const subReference: ReferenceInterface = reference.references[index];
        const referenceKey = `${subReference.book}.${subReference.chapter}.${subReference.verse}`;
        if (!res) {
          return;
        }
        if (tempReferenceData[referenceKey]) {
          tempReferenceData[referenceKey] = {
            content: tempReferenceData[referenceKey].content || "",
            references: [...res.references.slice(0, 5)],
          };
        }
      }
    });
    setTagMask(
      referenceBot,
      `${referenceArrayKey}`,
      JSON.stringify(tempReferenceData),
      "local"
    );
  }
};

// if (
//   globalThis?.SetCurrentReference &&
//   globalThis?.currentReferenceKey !==
//     `${tags.NameToId[that.bookId]}.${that.chapter}.1`
// ) {
//   const reference = await GetReferences({
//     bookId: that.bookId,
//     chapter: that.chapter,
//     verse: 1,
//   });
//   globalThis.SetCurrentReference(reference);
// }

await lazyLoadBookReferences();

MakeReferenceOptions({
  ...that,
});
