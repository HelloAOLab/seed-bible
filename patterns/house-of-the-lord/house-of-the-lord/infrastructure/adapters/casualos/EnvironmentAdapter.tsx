import type { ExperienceKey } from "../../../domain/models/experience";
import type { EnvironmentAdapterPort } from "../../../application/ports/out/environmentSetUp";
import type { EnvironmentConfigProvider } from "../../config/environment/EnvironmentConfigProvider";

interface AdapterParams {
  environmentConfigProvider: EnvironmentConfigProvider;
}

export class EnvironmentAdapter implements EnvironmentAdapterPort {
  #environmentConfigProvider: AdapterParams["environmentConfigProvider"];

  constructor({ environmentConfigProvider }: AdapterParams) {
    this.#environmentConfigProvider = environmentConfigProvider;
  }

  #setBackground(experience: ExperienceKey): void {
    const address = this.#environmentConfigProvider.getBackground(experience);
    setTag(gridPortalBot, "portalBackgroundAddress", address);
  }

  setUp(experience: ExperienceKey): void {
    this.#setBackground(experience);
  }
}
