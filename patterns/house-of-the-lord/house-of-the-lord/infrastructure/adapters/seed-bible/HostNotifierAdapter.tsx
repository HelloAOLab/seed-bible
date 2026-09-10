import type { HostNotifierPort } from "../../../application/ports/out/HostNotifier";
import { SendEmbedMessage } from "../../functions/casualos";

export class HostNotifierAdapter implements HostNotifierPort {
  notifyReady(): void {
    SendEmbedMessage({ id: "ready" });
  }
}
