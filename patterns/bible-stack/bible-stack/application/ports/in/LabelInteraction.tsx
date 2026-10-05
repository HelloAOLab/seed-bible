import type { Piece } from "../../../domain/models/canvas";

export interface LabelInteractionServicePort {
  handleLabelSelected(transformer: Piece<"InfoLabelTransformer">): void;
}
