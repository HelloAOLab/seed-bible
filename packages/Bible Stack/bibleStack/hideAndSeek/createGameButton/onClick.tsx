const goalBookName = globalThis.selectedBook?.name;

if(!goalBookName) return os.toast("Select a Book to create Game!");

thisBot.hintsFetchUI();