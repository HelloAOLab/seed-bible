await os.sleep(200);

const MakeReferenceOptions = async (props: {
  bookId: string;
  chapter: number;
  book: string;
}) => {
  const { bookId, chapter, book } = props;

  console.log("Making reference options for", bookId, chapter);

  const referenceUrl = `https://bible.helloao.org/api/d/open-cross-ref/${bookId}/${chapter}.json`;

  const referenceReq = await web.get(referenceUrl);

  if (referenceReq.status == 200) {
    const referenceOptionsConfig = {};

    const makeReferenceOptions = (props: {
      reference: { book: string; chapter: number; verse: number };
    }) => {
      const { reference } = props;
      return {
        icon: (
          <span class="material-symbols-outlined">quick_reference_all</span>
        ),
        title: `${reference.book} ${reference.chapter}:${reference.verse}`,
        onClick: async (e: MouseEvent) => {
          e.preventDefault();
          shout("toggleReferenceModal", {
            book: reference.book,
            chapter: reference.chapter,
            verse: reference.verse,
            mouseEvent: e,
          });
        },
      };
    };

    const content = [...referenceReq.data.chapter.content];

    console.log(
      "Content received for reference options",
      content,
      referenceReq.data
    );

    for (let i = 0; i < content.length; i++) {
      referenceOptionsConfig[`${book}-${chapter}-${content[i].verse}`] = {
        icon: (
          <span class="material-symbols-outlined">quick_reference_all</span>
        ),
        title: "References",
        items: [
          makeReferenceOptions({
            reference: {
              book: book,
              chapter: chapter,
              verse: content[i].verse,
            },
          }),
        ],
      };
    }

    if (!globalThis?.VerseContextMenuOptions) {
      globalThis.VerseContextMenuOptions = {};
    }
    for (const key of Object.keys(referenceOptionsConfig)) {
      let options = [];
      if (globalThis?.VerseContextMenuOptions?.[key]) {
        options = [
          ...globalThis.VerseContextMenuOptions[key],
          referenceOptionsConfig[key],
        ];
      } else {
        options = [referenceOptionsConfig[key]];
      }
      const uniqueOptions = [...new Set(options)];
      globalThis.VerseContextMenuOptions[key] = uniqueOptions;
    }
  }
};

export default MakeReferenceOptions;
