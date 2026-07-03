import type { LoggerPort } from "@packages/seed-bible-utils/domain/ports/logger";

export class ConsoleLoggerAdapter implements LoggerPort {
  error(message: string): void {
    console.error(message);
  }

  warn(message: string): void {
    console.warn(message);
  }
}
