import type { HostNotifierPort } from "../../../application/ports/out/HostNotifier";
import type { PatternMessage } from "../../models/casualos";

export class HostNotifierAdapter implements HostNotifierPort {
  notifyReady(): void {
    this.#send({ id: "ready" });
  }

  #send(message: PatternMessage): void {
    // @ts-expect-error CasualOS typings declare sendEmbedMessage under os.appHooks; at runtime it lives on os.
    os.sendEmbedMessage(message);
  }
}
