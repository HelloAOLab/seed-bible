import type { SectionShadow } from "../../../domain/models/canvas";

export interface SectionShadowInteractionServicePort {
  handleSectionShadowSelected(shadow: SectionShadow): void;
}
