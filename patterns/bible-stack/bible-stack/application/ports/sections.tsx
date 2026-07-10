import type {
  DraggingEvent as InfrastructureDraggingEvent,
  DropEvent as InfrastructureDropEvent,
} from "../../infrastructure/models/casualos";
import type {
  DraggingEvent as DomainDraggingEvent,
  DropEvent as DomainDropEvent,
  Piece,
  PieceSelectionSource,
  SelectionModality,
} from "../../domain/models/canvas";
import type { SectionBot } from "../../infrastructure/models/stack";
import type { StackSectionData } from "../../domain/entities/StackSectionData";
import type { StackPresenceNavigationPacing } from "../../domain/models/userPresence";

export interface SectionInteractionServicePort {
  handleSectionSelection({
    section,
    interaction,
  }: {
    section: Piece<"StackSection">;
    interaction: SelectionModality;
  }): void;
  handleSectionFocusBegin(section: Piece<"StackSection">): void;
  handleSectionFocusEnd(section: Piece<"StackSection">): void;
}

export interface PieceMapperPort {
  toDomain: (bot: SectionBot) => Piece<"StackSection">;
}

export interface DragServicePort {
  handlePieceDrag: (piece: Piece<"StackSection">) => Promise<void>;
}

export interface DraggingServicePort {
  handlePieceDragging: (
    piece: Piece<"StackSection">,
    draggingEvent: DomainDraggingEvent
  ) => void;
}

export interface SelectionReleaseServicePort {
  handlePieceSelectionRelease: (piece: Piece<"StackSection">) => void;
}

export interface DropServicePort {
  handlePieceDrop: (
    piece: Piece<"StackSection">,
    dropEvent: DomainDropEvent
  ) => void;
}

export interface DraggingEventMapperPort {
  toDomain: (event: InfrastructureDraggingEvent) => DomainDraggingEvent;
}

export interface DropEventMapperPort {
  toDomain: (event: InfrastructureDropEvent) => DomainDropEvent;
}

export interface SectionSelectionServicePort {
  select: (params: {
    data: StackSectionData;
    source: PieceSelectionSource;
    pacing?: StackPresenceNavigationPacing;
  }) => Promise<void>;
  deselect: (data: StackSectionData) => void;
}
