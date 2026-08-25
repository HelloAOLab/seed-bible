import type { ParentDataChain, StackParentDataIds } from "../pieces";

export interface PieceHierarchyServicePort {
  getParentDataChain: (parentDataIds: StackParentDataIds) => ParentDataChain;
}
