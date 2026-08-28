import type { LoggerPort } from "../../../application/ports/in/Logger";

/**
 * Console-backed implementation of {@link LoggerPort}. Keeps the domain/
 * application layers decoupled from the concrete logging sink (here, the
 * runtime console).
 */
export class LoggerAdapter implements LoggerPort {
  // eslint-disable-next-line
  error(message: string, data?: any): void {
    console.error(message, data);
  }

  // eslint-disable-next-line
  warn(message: string, data?: any): void {
    console.warn(message, data);
  }

  // eslint-disable-next-line
  log(message: string, data?: any): void {
    console.log(message, data);
  }
}
