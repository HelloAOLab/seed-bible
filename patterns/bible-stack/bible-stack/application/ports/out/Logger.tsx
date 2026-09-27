export interface LoggerPort {
  error(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  log(message: string, data?: any): void;
}
