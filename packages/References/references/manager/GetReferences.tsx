import type {
  ReferencesInterface,
  ReferenceInterface,
} from "references.manager.interfaces";

export const GetReferences = async (props: {
  bookId: string;
  chapter: number;
  verse: number;
}) => {
  const { bookId, chapter, verse } = props;

  if (masks?.[`reference.${bookId}.${chapter}.${verse}`]) {
    return JSON.parse(masks[`reference.${bookId}.${chapter}.${verse}`]);
  }

  const referenceUrl = `https://bible.helloao.org/api/d/open-cross-ref/${bookId}/${chapter}.json`;

  const referenceReq = await web.get(referenceUrl);

  if (referenceReq.status == 200) {
    const content = [...referenceReq.data.chapter.content];
    for (let i = 0; i < content.length; i++) {
      if (content[i].verse == verse) {
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
        return referenceObject;
      }
    }
  }
  return {
    references: [],
    book: bookId,
    chapter,
    verse,
  };
};

export const GetChapterContent = async (props: {
  bookId: string;
  chapter: number;
  reference: ReferenceInterface;
}) => {
  const { bookId, chapter, reference } = props;
  const savedChapterDataKey = `chapterContent.${bookId}.${chapter}`;

  if (masks?.[savedChapterDataKey]) {
    return masks[savedChapterDataKey];
  }

  const chapterDataUrl = `https://bible.helloao.org/api/BSB/${bookId}/${chapter}.json`;

  const chapterDataReq = await web.get(chapterDataUrl);

  if (chapterDataReq.status == 200) {
    const contentArray = [...chapterDataReq.data.chapter.content];
    let content = "";
    const start = reference.verse;
    const end = reference?.endVerse || reference.verse;
    if (start <= end) {
      for (let i = start; i <= end; i++) {
        for (let j = 0; j < contentArray.length; j++) {
          if (contentArray[j]?.number == i) {
            const contentString = contentArray[j].content
              .map((data: string | { text: string } | null | undefined) => {
                if (typeof data === "string") {
                  return data;
                } else if (data?.text) {
                  return data.text;
                } else {
                  return "";
                }
              })
              .join(" ");
            content += `${contentString} `;
            break;
          }
        }
      }
    }
    setTagMask(
      thisBot,
      `chapterContent.${bookId}.${chapter}`,
      content,
      "local"
    );
    return content;
  }
  return "";
};

export const CalculatePopupPosition = (
  mouseEvent: MouseEvent,
  width?: number,
  height?: number
) => {
  const containerWidth = width || 250;
  const containerHeight = height || 400;
  const offset = 10;
  const viewPortHeight = window.innerHeight;
  const viewPortWidth = window.innerWidth;

  let top = mouseEvent.clientY - offset;
  let left = mouseEvent.clientX + offset;

  if (left + containerWidth > viewPortWidth) {
    left = viewPortWidth - containerWidth - offset;
  }

  if (top > viewPortHeight / 2) {
    top = mouseEvent.clientY - containerHeight - offset;
  } else {
    top = mouseEvent.clientY + offset;
  }
  return { x: left, y: top };
};
