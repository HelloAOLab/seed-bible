import type { ReaderNavigationPort } from "../../../application/ports/out/ReaderNavigation";

export class ReaderNavigationAdapter implements ReaderNavigationPort {
  open(bookId: string, chapter?: number, verse?: number): void {
    // @ts-expect-error CasualOS typings misplace sendEmbedMessage under appHooks; it's on os at runtime
    os.sendEmbedMessage({
      id: "reader-navigation",
      data: {
        bookId,
        chapter,
        verse,
      },
    });
  }
}
