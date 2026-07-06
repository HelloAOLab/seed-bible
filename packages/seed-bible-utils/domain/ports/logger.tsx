export interface LoggerPort {
  error: (message: string) => void;
  warn: (message: string) => void;
}
