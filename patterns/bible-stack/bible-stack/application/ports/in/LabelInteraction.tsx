import type { Piece } from "../../../domain/models/canvas";

export interface LabelInteractionPort {
  handleLabelSelected(transformer: Piece<"InfoLabelTransformer">): void;
}
