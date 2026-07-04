import type { ExperienceAdapterPort } from "bibleStack.application.ports.experience";
import type {
  ExperienceConfigProviderPort,
  EnvironmentAdapterPort,
} from "bibleStack.infrastructure.ports.experience";
import { globalAPI } from "app.controller.controllerBuilder";
import { App } from "bibleStack.infrastructure.components.App";

interface AdapterParams {
  experienceConfigProviderPort: ExperienceConfigProviderPort;
  environmentAdapterPort: EnvironmentAdapterPort;
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

  closeExperience(id: string): void {
    globalThis.RemoveFloatingApp(id);
  }
  displayExperience(): string {
    const targetDimension =
      this.#experienceConfigProviderPort.getTargetDimension();
    globalAPI.defaultPortalName = targetDimension;
    this.#environmentAdapterPort.changePortalCameraType(
      this.#experienceConfigProviderPort.getTargetPortalCameraType()
    );
    this.#environmentAdapterPort.changePortalZoomableMin(
      this.#experienceConfigProviderPort.getTargetPortalZoomableMin()
    );
    const title = this.#experienceConfigProviderPort.getAppTitle();
    const position = this.#experienceConfigProviderPort.getAppPosition();
    const size = this.#experienceConfigProviderPort.getAppSize();
    const type = this.#experienceConfigProviderPort.getAppType();

    const id = globalThis.AddFloatingApp({
      App: <App />,
      title,
      position,
      size,
      type,
      // mode, TODO: Figure how to get the mode with the new architecture
    });

    this.#environmentAdapterPort.setGridPortal(targetDimension);
    this.#environmentAdapterPort.clearMapPortal();
    this.#environmentAdapterPort.clearMiniGridPortal();
    this.#environmentAdapterPort.clearMiniMapPortal();

    return id;
  }
}
