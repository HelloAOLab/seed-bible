import type { ExperienceAdapterPort } from "../../../application/ports/experience";
import type { ExperienceConfigProvider } from "../../config/experience/ExperienceConfigProvider";
import type { EnvironmentAdapter } from "../environment/EnvironmentAdapter";

interface AdapterParams {
  experienceConfigProviderPort: ExperienceConfigProvider;
  environmentAdapterPort: EnvironmentAdapter;
}

export class ExperienceAdapter implements ExperienceAdapterPort {
  #experienceConfigProviderPort: AdapterParams["experienceConfigProviderPort"];
  #environmentAdapterPort: AdapterParams["environmentAdapterPort"];

  constructor({
    experienceConfigProviderPort,
    environmentAdapterPort,
  }: AdapterParams) {
    this.#experienceConfigProviderPort = experienceConfigProviderPort;
    this.#environmentAdapterPort = environmentAdapterPort;
  }

  displayExperience() {
    this.#environmentAdapterPort.changePortalCameraType(
      this.#experienceConfigProviderPort.getTargetPortalCameraType()
    );
    this.#environmentAdapterPort.changePortalZoomableMin(
      this.#experienceConfigProviderPort.getTargetPortalZoomableMin()
    );

    this.#environmentAdapterPort.clearMapPortal();
    this.#environmentAdapterPort.clearMiniGridPortal();
    this.#environmentAdapterPort.clearMiniMapPortal();
  }
}
