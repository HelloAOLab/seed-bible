import type { StackUpdatePacing } from "../../../domain/models/stacks";
import type { StackSectionData } from "../../../domain/entities/StackSectionData";

export interface UpdateCommand {
  data: StackSectionData;
  pacing: StackUpdatePacing;
}

export interface SectionStackUpdaterPort {
  update(params: UpdateCommand): Promise<void>;
}

export interface LoggerPort {
  // eslint-disable-next-line
  error: (message: string, data?: any) => void;
  // eslint-disable-next-line
  warn: (message: string, data?: any) => void;
  // eslint-disable-next-line
  log: (message: string, data?: any) => void;
}
