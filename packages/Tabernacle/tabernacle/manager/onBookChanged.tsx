const { book, chapter } = that;

thisBot.vars.currentBook = book;
thisBot.vars.currentChapter = chapter;

thisBot.UpdateHighlightedWords();

if(thisBot.vars.appId) thisBot.UpdateTabernacleVisuals()