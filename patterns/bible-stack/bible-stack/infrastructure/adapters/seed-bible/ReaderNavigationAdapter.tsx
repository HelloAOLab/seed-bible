import type { ReaderNavigationPort } from "../../../application/ports/out/ReaderNavigation";
import { SendEmbedMessage } from "../../functions/casualos";

export class ReaderNavigationAdapter implements ReaderNavigationPort {
  open(bookId: string, chapter?: number): void {
    SendEmbedMessage({
      type: "reader-navigation",
      data: {
        bookId,
        chapter,
      },
    });
  }
}
