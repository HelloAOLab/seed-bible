export interface LoggerPort {
  // eslint-disable-next-line
  error: (message: string, data?: any) => void;
  // eslint-disable-next-line
  warn: (message: string, data?: any) => void;
  // eslint-disable-next-line
  log: (message: string, data?: any) => void;
}
