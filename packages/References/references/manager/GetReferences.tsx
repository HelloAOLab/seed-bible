import type {
  ReferencesInterface,
  ReferenceInterface,
} from "references.manager.interfaces";

export const GetReferences = async (props: {
  bookId: string;
  chapter: number;
  verse: number;
  baseUrl: string;
  translation: string;
  bookName?: string;
}) => {
  const { bookId, chapter, verse, baseUrl, translation, bookName } = props;

  if (masks?.[`reference.${translation}.${bookId}.${chapter}.${verse}`]) {
    return JSON.parse(
      masks[`reference.${translation}.${bookId}.${chapter}.${verse}`]
    );
  }

  const referenceUrl = `https://bible.helloao.org/api/d/open-cross-ref/${bookId}/${chapter}.json`;

  const referenceReq = await web.get(referenceUrl);

  if (referenceReq.status == 200) {
    const content = [...referenceReq.data.chapter.content];
    if (!content || content.length == 0) {
      console.log("No content found for this chapter");
    }
    for (let i = 0; i < content.length; i++) {
      if (content[i].verse == verse) {
        const referenceObject: ReferencesInterface = {
          book: bookId,
          chapter,
          verse,
          references: [...content[i].references],
          baseUrl: baseUrl,
          translation: translation,
          bookName: bookName,
        };
        setTagMask(
          thisBot,
          `reference.${translation}.${bookId}.${chapter}.${verse}`,
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
    baseUrl: baseUrl,
    translation: translation,
    bookName: bookName,
  };
};

export const GetChapterContent = async (props: {
  bookId: string;
  chapter: number;
  reference: ReferenceInterface;
  baseUrl: string;
  translation: string;
}) => {
  const { bookId, chapter, reference, baseUrl, translation } = props;
  const savedChapterDataKey = `chapterContent.${translation}.${bookId}.${chapter}`;

  if (masks?.[savedChapterDataKey]) {
    return JSON.parse(masks[savedChapterDataKey]);
  }

  try {
    const chapterDataUrl = `${baseUrl}/api/${translation}/${bookId}/${chapter}.json`;

    const chapterDataReq = await web.get(chapterDataUrl);

    if (chapterDataReq.status == 200) {
      if (
        !chapterDataReq.data ||
        !chapterDataReq.data.chapter ||
        !chapterDataReq.data.chapter.content
      ) {
        console.log("No chapter content found in response");
        return null;
      }
      console.log("Chapter content retrieved successfully");
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
        `chapterContent.${translation}.${bookId}.${chapter}`,
        JSON.stringify({
          content,
          bookData: {
            ...chapterDataReq.data.book,
          },
        }),
        "local"
      );
      return {
        content,
        bookData: {
          ...chapterDataReq.data.book,
        },
      };
    } else {
      const fallBackContent: string = await GetChapterContent({
        bookId,
        chapter,
        reference,
        baseUrl: "https://bible.helloao.org",
        translation: "BSB",
      });
      return fallBackContent;
    }
  } catch (error) {
    console.error("Error fetching chapter content", error);
    return null;
  }
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
