import type {
  ParentDataIds,
  ParentDataChain,
} from "../../../domain/models/canvas";

export interface PieceHierarchyServicePort {
  getParentDataChain: (parentDataIds: ParentDataIds) => ParentDataChain;
}
