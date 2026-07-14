import type { BookChaptersManagementService } from "../../../application/services/BookChaptersManagementService";
import type { PieceLabelService } from "../../../application/services/PieceLabelService";
import type { Piece } from "../../../domain/models/canvas";
import type { PieceDataRepository } from "../../adapters/stacks/PieceDataRepository";
import type { PieceMapper } from "../../mappers/PieceMapper";
import type { PieceBot } from "../../models/casualos";
import type { BookBot } from "../../models/stack";

function hasTransformChanged<B extends PieceBot>({
  dimension,
  changedTags,
}: {
  dimension: string;
  changedTags: Array<keyof B["tags"]>;
}) {
  const transformChanged = (["X", "Y", "Z"] as const).some(
    (axis) =>
      changedTags.includes((dimension + axis) as keyof B["tags"]) ||
      changedTags.includes(("scale" + axis) as keyof B["tags"])
  );
  return transformChanged;
}
/**
 * Builds a bot-state-change strategy that repositions a piece's label when the
 * piece's transform (position/scale) tags change.
 *
 * Layering: this only translates the native tag-change event — deciding which
 * CasualOS tag names count as a transform change, keyed off the current
 * dimension — and then delegates. The business decision "does the piece
 * actually have a label to reposition?" stays in the label service
 * (`updateLabelPosition` -> `getPieceLabel`).
 */
export const labelRelocationStrategy =
  <B extends PieceBot, P extends Piece>(
    mapper: PieceMapper,
    labelPositionUpdater: PieceLabelService<P["type"]>,
    getDimension: () => string
  ) =>
  (bot: B, changedTags: Array<keyof B["tags"]>) => {
    const dimension = getDimension();
    const transformChanged = hasTransformChanged({
      dimension,
      changedTags,
    });

    if (bot.tags.isInUse && transformChanged) {
      labelPositionUpdater.updateLabelPosition(mapper.toDomain(bot));
    }
  };

export const bookStateUpdateStrategy =
  (
    mapper: PieceMapper,
    labelPositionUpdater: PieceLabelService<"StackBook" | "StackSectionBook">,
    getDimension: () => string,
    bookDataProvider: PieceDataRepository,
    chaptersPositionUpdater: BookChaptersManagementService
  ) =>
  (bot: BookBot, changedTags: Array<keyof BookBot["tags"]>) => {
    const dimension = getDimension();
    labelRelocationStrategy<BookBot, Piece<"StackBook" | "StackSectionBook">>(
      mapper,
      labelPositionUpdater,
      getDimension
    );

    const transformChanged = hasTransformChanged<BookBot>({
      dimension,
      changedTags,
    });

    const piece = mapper.toDomain(bot);
    const data = bookDataProvider.getPieceData(piece);

    if (!data) {
      throw new Error(
        "PieceStateUpdateStrategies: data not found at bookStateUpdateStrategy"
      );
    }

    if (
      data.selectionState === "Selected" &&
      data.currentShape === "Selected" &&
      transformChanged &&
      data.isShowingChapters
    ) {
      chaptersPositionUpdater.updateChaptersPosition(data);
    }
  };
