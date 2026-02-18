export const GetReferences = async (props: {
  bookId: string;
  chapter: number;
  verse: number;
}) => {
  const { bookId, chapter, verse } = props;

  const referenceUrl = `https://bible.helloao.org/api/d/open-cross-ref/${bookId}/${chapter}.json`;

  const referenceReq = await web.get(referenceUrl);

  if (referenceReq.status == 200) {
    const content = [...referenceReq.data.chapter.content];
    for (let i = 0; i < content.length; i++) {
      if (content[i].verse == verse) {
        return {
          references: [...content[i].references],
          book: bookId,
          chapter,
          verse,
        };
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
