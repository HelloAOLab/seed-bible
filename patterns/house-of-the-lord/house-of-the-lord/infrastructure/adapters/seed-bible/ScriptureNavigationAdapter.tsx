import type { ScriptureNavigationAdapterPort } from "../../../application/ports/out/ScriptureNavigationAdapter";
import type { VerseRange } from "../../../domain/models/scripture";
import type { PatternMessage } from "../../models/casualos";

export class ScriptureNavigationAdapter implements ScriptureNavigationAdapterPort {
  navigate(range: VerseRange): void {
    this.#send({
      id: "reader-navigation",
      data: {
        bookId: range.bookId,
        chapter: range.chapter,
        verse: range.start,
        endVerse: range.end,
      },
    });
  }

  #send(message: PatternMessage): void {
    // @ts-expect-error CasualOS typings declare sendEmbedMessage under os.appHooks; at runtime it lives on os.
    os.sendEmbedMessage(message);
  }
}
