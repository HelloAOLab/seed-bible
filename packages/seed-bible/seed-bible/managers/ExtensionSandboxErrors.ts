import type { SandboxErrorCode } from "../extensions/protocol";

/** A refusal the broker sends back to the frame as-is. */
export class SandboxBrokerError extends Error {
  constructor(
    readonly code: SandboxErrorCode,
    message: string
  ) {
    super(message);
  }
}
