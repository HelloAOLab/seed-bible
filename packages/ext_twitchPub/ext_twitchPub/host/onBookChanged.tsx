const currentData = { ...that };

let prevData = null;

if (masks?.currentBookData) {
  prevData = JSON.parse(masks.currentBookData);
}

setTagMask(thisBot, "currentBookData", JSON.stringify(currentData), "local");

if (prevData && masks?.uiLoaded) {
  if (
    prevData.bookId !== currentData.bookId ||
    prevData.chapter !== currentData.chapter
  ) {
    whisper(thisBot, "sendMessage", {
      message: JSON.stringify({
        type: "bookChanged",
        bookId: currentData.bookId,
        chapter: currentData.chapter,
      }),
    });
  } else if (prevData.translation !== currentData.translation) {
    whisper(thisBot, "sendMessage", {
      message: JSON.stringify({
        type: "translationChanged",
        translation: currentData.translation,
        baseUrl: currentData?.baseUrl || "https://vmfnri.helloao.org",
      }),
    });
  }
} else if (masks?.uiLoaded) {
  whisper(thisBot, "sendMessage", {
    message: JSON.stringify({
      type: "bookChanged",
      bookId: currentData.bookId,
      chapter: currentData.chapter,
    }),
  });
}

if (globalThis?.SetQrValue && masks?.uiLoaded) {
  globalThis.SetQrValue(
    `https://ao.bot/?pattern=SeedBibleDev&book=${currentData.bookId}&chapter=${currentData.chapter}&translation=${currentData.translation}&ext_twitchSub=true&broadcasterId=${masks.broadcasterId}&clientId=${masks.clientId}&token=${masks.userAccessToken}`
  );
}
