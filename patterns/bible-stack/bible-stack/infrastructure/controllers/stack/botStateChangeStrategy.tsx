import type { Piece, PieceState } from "../../../domain/models/canvas";
import type { PieceBot } from "../../models/casualos";
import type { PieceStateService } from "../../../application/services/PieceStateService";

interface StrategyFactoryDeps {
  pieceStateMap: Partial<Record<string, keyof PieceState>>;
  pieceStateService: PieceStateService;
}

/**
 * Builds bot-state-change strategies for the `BotStateController`.
 *
 * Layering: a strategy only translates the native tag-change event into a
 * domain `PieceState` delta (via `pieceStateMap`) and delegates to the
 * application service. All per-type business rules live in
 * `PieceStateService.handlePieceStateChanged`, so every piece type shares the
 * same strategy shape and only supplies its mapper.
 *
 * Two stages: the shared deps (map + service) are captured once; the returned
 * builder takes the piece's mapper and infers the bot type `B` from it.
 */
export const createBotStateChangeStrategyFactory =
  ({ pieceStateMap, pieceStateService }: StrategyFactoryDeps) =>
  <B extends PieceBot>(mapper: { toDomain: (bot: B) => Piece }) =>
  (bot: B, changedTags: Array<keyof B["tags"]>) => {
    if (!bot.tags.isInUse) return;

    const changedProperties: Array<keyof PieceState> = [];
    for (const tag of changedTags) {
      const property = pieceStateMap[tag as string];
      if (property) {
        changedProperties.push(property);
      }
    }

    if (changedProperties.length > 0) {
      pieceStateService.handlePieceStateChanged({
        piece: mapper.toDomain(bot),
        changedProperties,
      });
    }
  };
