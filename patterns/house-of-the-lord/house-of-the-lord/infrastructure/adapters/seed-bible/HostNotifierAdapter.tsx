import type { HostNotifierPort } from "../../../application/ports/out/HostNotifier";
import type { ExperienceKey } from "../../../domain/models/experience";
import { SendEmbedMessage } from "../../functions/casualos";

export class HostNotifierAdapter implements HostNotifierPort {
  notifyReady(): void {
    SendEmbedMessage({ id: "ready" });
  }

  notifyExperienceChanged(experience: ExperienceKey | null): void {
    SendEmbedMessage({ id: "experience-changed", data: { experience } });
  }
}
