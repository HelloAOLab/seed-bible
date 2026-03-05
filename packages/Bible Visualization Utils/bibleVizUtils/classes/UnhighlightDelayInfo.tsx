export class UnhighlightDelayInfo {
  timeoutId: any;
  piece: any;

  constructor({ piece, timeoutId }) {
    this.piece = piece;
    this.timeoutId = timeoutId;
  }
}
