export interface PanelDisplayerPort {
  displayPanel(): void;
}

export interface LoggerPort {
  log(message: string): void;
  warn(message: string): void;
  error(message: string, error?: unknown): void;
}

export interface PiecesSequencePort {
  displayDropSequence(): Promise<void>;
}

export interface UpdatePiecesPositionPort {
  updatePositions(): void;
}
