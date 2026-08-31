import type { SectionShadow } from "../../../domain/models/canvas";

export interface SectionShadowInteractionPort {
  handleSectionShadowSelected(shadow: SectionShadow): void;
}
