import type { ScriptureNavigationAdapterPort } from "../../../application/ports/out/ScriptureNavigationAdapter";
import type { VerseRange } from "../../../domain/models/scripture";
import { SendEmbedMessage } from "../../functions/casualos";

export class ScriptureNavigationAdapter implements ScriptureNavigationAdapterPort {
  navigate(range: VerseRange): void {
    SendEmbedMessage({
      id: "reader-navigation",
      data: {
        bookId: range.bookId,
        chapter: range.chapter,
        verse: range.start,
        endVerse: range.end,
      },
    });
  }
}
