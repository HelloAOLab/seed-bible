export interface LoggerAdapterPort {
  log(message: string): void;
  warn(message: string): void;
  error(message: string, error?: unknown): void;
}
