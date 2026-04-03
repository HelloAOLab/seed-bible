const currentData = { ...that };

let prevData = null;

if (masks?.currentBookData) {
  prevData = JSON.parse(masks.currentBookData);
}

setTagMask(thisBot, "currentBookData", JSON.stringify(currentData), "local");
if (masks?.uiLoaded) {
  const uid = uuid().slice(0, 5);

  if (prevData) {
    if (
      prevData.bookId !== currentData.bookId ||
      prevData.chapter !== currentData.chapter
    ) {
      const payload = JSON.stringify({
        bookId: currentData.bookId,
        chapter: currentData.chapter,
      });
      whisper(thisBot, "sendMessage", {
        message: JSON.stringify({
          type: "bookChanged",
          parts: 0,
          currentPart: 0,
          payload,
          uid,
        }),
      });
    } else if (
      prevData.translation !== currentData.translation &&
      masks?.translationEnabled
    ) {
      const payload = JSON.stringify({
        translation: currentData.translation,
        baseUrl: currentData?.baseUrl || "https://vmfnri.helloao.org",
      });
      whisper(thisBot, "sendMessage", {
        message: JSON.stringify({
          type: "translationChanged",
          parts: 0,
          currentPart: 0,
          payload,
          uid,
        }),
      });
    }
  } else {
    const payload = JSON.stringify({
      bookId: currentData.bookId,
      chapter: currentData.chapter,
    });
    whisper(thisBot, "sendMessage", {
      message: JSON.stringify({
        type: "bookChanged",
        parts: 0,
        currentPart: 0,
        payload,
        uid,
      }),
    });
  }

  if (globalThis?.SetQrValue) {
    globalThis.SetQrValue(
      `https://ao.bot/?pattern=SeedBibleDev&book=${currentData.bookId}&chapter=${currentData.chapter}&translation=${currentData.translation}&ext_twitchSub=true&broadcasterId=${masks.broadcasterId}&clientId=${masks.clientId}&token=${masks.userAccessToken}`
    );
  }
}
