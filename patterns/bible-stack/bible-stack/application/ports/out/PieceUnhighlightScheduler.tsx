export interface PieceUnhighlightSchedulerPort {
  schedule(delay: number, callback: () => Promise<void>): string;
  clear(id: string): void;
}
