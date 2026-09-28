import type { EnvironmentSetUpPort } from "../ports/in/environmentSetUp";
import type { EnvironmentAdapterPort } from "../ports/out/environmentSetUp";
import type { ExperienceKey } from "../../domain/models/experience";

interface ServiceParams {
  environmentAdapterPort: EnvironmentAdapterPort;
}

export class EnvironmentSetUpService implements EnvironmentSetUpPort {
  #environmentAdapterPort: ServiceParams["environmentAdapterPort"];

  constructor({ environmentAdapterPort }: ServiceParams) {
    this.#environmentAdapterPort = environmentAdapterPort;
  }

  setUp(experience: ExperienceKey): void {
    this.#environmentAdapterPort.setUp(experience);
  }
}
