import getUrl from "ext_twitchPub.host.getUrl";

const currentData = { ...that };

let prevData = null;

if (masks?.currentBookData) {
  prevData = JSON.parse(masks.currentBookData);
}

setTagMask(thisBot, "currentBookData", JSON.stringify(currentData), "local");

if (masks?.uiLoaded && globalThis?.sendMessageWithRateLimit) {
  if (prevData) {
    if (
      prevData.bookId !== currentData.bookId ||
      prevData.chapter !== currentData.chapter
    ) {
      const payload = JSON.stringify({
        bookId: currentData.bookId,
        chapter: currentData.chapter,
      });
      globalThis.sendMessageWithRateLimit("bookChanged", payload);
    } else if (
      prevData.translation !== currentData.translation &&
      masks?.translationEnabled
    ) {
      const payload = JSON.stringify({
        translation: currentData.translation,
        baseUrl: currentData?.baseUrl || "https://vmfnri.helloao.org",
      });
      globalThis.sendMessageWithRateLimit("translationChanged", payload);
    }
  } else {
    const payload = JSON.stringify({
      bookId: currentData.bookId,
      chapter: currentData.chapter,
    });
    globalThis.sendMessageWithRateLimit("bookChanged", payload);
  }

  if (globalThis?.currentBookDataRef) {
    globalThis.currentBookDataRef.current = JSON.stringify(currentData);
  }
  if (globalThis?.SetQrValue) {
    globalThis.SetQrValue(
      getUrl({
        clientId: masks.clientId || "",
        broadcasterId: masks.broadcasterId || "",
        channelId: masks.channelId || "",
        book: currentData.bookId,
        chapter: currentData.chapter,
        translation: currentData.translation,
      })
    );
  }
}
