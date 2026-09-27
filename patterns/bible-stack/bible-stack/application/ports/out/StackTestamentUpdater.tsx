import type { UpdateCommand } from "./TestamentStackUpdater";

export interface TestamentStackUpdaterPort {
  update(params: UpdateCommand): Promise<void>;
}
