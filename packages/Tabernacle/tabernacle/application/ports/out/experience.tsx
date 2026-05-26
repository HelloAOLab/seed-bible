export interface PanelDisplayerPort {
  displayPanel(): void;
}

export interface LoggerPort {
  log(message: string): void;
  warn(message: string): void;
  error(message: string, error?: unknown): void;
}
