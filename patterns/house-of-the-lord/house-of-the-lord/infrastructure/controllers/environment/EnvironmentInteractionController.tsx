import type { EnvironmentInteractionService } from "../../../application/services/EnvironmentInteractionService";

interface EnvironmentInteractionControllerParams {
  environmentInteractionService: EnvironmentInteractionService;
}

export class EnvironmentInteractionController {
  #environmentInteractionService: EnvironmentInteractionService;

  constructor({
    environmentInteractionService,
  }: EnvironmentInteractionControllerParams) {
    this.#environmentInteractionService = environmentInteractionService;
  }

  handleGridClick(): void {
    this.#environmentInteractionService.handleBlur();
  }
}
