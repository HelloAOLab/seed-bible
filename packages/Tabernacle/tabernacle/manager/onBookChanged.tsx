const { book, chapter } = that;

thisBot.vars.currentBook = book;
thisBot.vars.currentChapter = chapter;

// thisBot.UpdateHighlightedWords(that);
thisBot.UpdateVerseOptions(that);

if (thisBot.vars.appId) thisBot.UpdateTabernacleVisuals();
