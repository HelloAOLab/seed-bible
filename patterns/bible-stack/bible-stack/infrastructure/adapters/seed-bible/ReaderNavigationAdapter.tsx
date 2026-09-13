import type { ReaderNavigationPort } from "../../../application/ports/out/ReaderNavigation";
import { SendEmbedMessage } from "../../functions/casualos";

export class ReaderNavigationAdapter implements ReaderNavigationPort {
  open(bookId: string, chapter?: number, verse?: number): void {
    SendEmbedMessage({
      id: "reader-navigation",
      data: {
        bookId,
        chapter,
        verse,
      },
    });
  }
}
