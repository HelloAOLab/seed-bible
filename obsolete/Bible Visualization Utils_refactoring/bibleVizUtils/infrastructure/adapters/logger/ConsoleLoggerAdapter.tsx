import type { LoggerPort } from "bibleVizUtils.domain.ports.logger";

export class ConsoleLoggerAdapter implements LoggerPort {
  error(message: string): void {
    console.error(message);
  }

  warn(message: string): void {
    console.warn(message);
  }
}
