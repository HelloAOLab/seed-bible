import type { LoggerPort } from "../../application/ports/out/experience";

export class LoggerAdapter implements LoggerPort {
  log(message: string): void {
    console.log(`[Tabernacle] ${message}`);
  }

  warn(message: string): void {
    console.warn(`[Tabernacle] ${message}`);
  }

  error(message: string, error?: unknown): void {
    console.error(`[Tabernacle] ${message}`, error);
  }
}
