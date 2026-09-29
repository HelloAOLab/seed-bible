import type { PieceUnhighlightSchedulerPort } from "../../../application/ports/out/PieceUnhighlightScheduler";

export class PieceUnhighlightSchedulerAdapter implements PieceUnhighlightSchedulerPort {
  schedule(delay: number, callback: () => Promise<void>): string {
    return String(setTimeout(callback, delay));
  }

  clear(id: string): void {
    clearTimeout(Number(id));
  }
}
