import type { PieceUnhighlightSchedulerAdapterPort } from "bibleStack.application.ports.pieces";

export class PieceUnhighlightSchedulerAdapter implements PieceUnhighlightSchedulerAdapterPort {
  schedule(delay: number, callback: () => Promise<void>): string {
    return String(setTimeout(callback, delay));
  }

  clear(id: string): void {
    clearTimeout(Number(id));
  }
}
