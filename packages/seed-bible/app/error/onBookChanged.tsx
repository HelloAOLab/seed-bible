import { debounce } from "es-toolkit";

console.warn("[app.onBookChanged] ", that);

thisBot.vars.postChapterReadEvent ??= debounce((that) => {
  posthog.capture("user_chapter_read", {
    translationId: that.translation,
    bookId: that.bookId,
    chapter: that.chapter,
  });
}, 5000);

thisBot.vars.postChapterReadEvent(that);
