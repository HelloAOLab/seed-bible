import type { LoggerPort } from "../../../application/ports/out/experience";

export class LoggerAdapter implements LoggerPort {
  log(message: string): void {
    console.log(`[house-of-the-lord] ${message}`);
  }

  warn(message: string): void {
    console.warn(`[house-of-the-lord] ${message}`);
  }

  error(message: string, error?: unknown): void {
    console.error(`[house-of-the-lord] ${message}`, error);
  }
}
