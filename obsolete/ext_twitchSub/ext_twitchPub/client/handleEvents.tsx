const config = that.config;

switch (config.type) {
  case "bookChanged": {
    const { bookId, chapter, translation } = config;
    console.log("Opening book", bookId, chapter, translation);
    Open(bookId, chapter, translation);
    break;
  }
  case "translationChanged": {
    const { translation, baseUrl } = config;
    console.log(
      "Changing translation to",
      translation,
      "with base URL",
      baseUrl
    );
    web
      .get(`https://vmfnri.helloao.org/api/${translation}/books.json`)
      .then((e) => {
        ChangeTranslation(
          translation,
          e.data.books,
          "https://vmfnri.helloao.org"
        );
      })
      .catch((e) => {
        console.log(e);
      });
    break;
  }
}
