const { book, bookId, chapter } = that;

thisBot.vars.currentBook = book;
thisBot.vars.currentChapter = chapter;
thisBot.vars.currentBookId = bookId;

thisBot.UpdateVerseOptions(that);

if (thisBot.vars.appId) thisBot.UpdateTabernacleVisuals();

thisBot.TryUpdatePieceContextMenu();
