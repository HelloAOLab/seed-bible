import type { LoggerAdapterPort } from "../../../application/ports/out/LoggerAdapter";

export class LoggerAdapter implements LoggerAdapterPort {
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
