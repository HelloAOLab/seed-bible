import type { PieceStatePort } from "../../../application/ports/out/PieceState";
import {
  PIECE_VISIBILITY_STATES,
  type PieceVisibilityState,
} from "../../../domain/models/piece";
import type { Easing } from "../../../../../pattern-typings/AuxLibraryDefinitions";
import type { PiecesProvider } from "./PiecesProvider";
import type { PieceMapper } from "../../mappers/PieceMapper";
import { AnimateStrictTag, SetStrictTag } from "../../functions/casualos";
import type { PieceBotTags } from "../../models/casualos";
import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";

interface AdapterParams {
  getDimension: () => string;
  piecesProvider: PiecesProvider;
  pieceMapper: PieceMapper;
}

export class PieceStateAdapter implements PieceStatePort {
  #getDimension: AdapterParams["getDimension"];
  #piecesProvider: AdapterParams["piecesProvider"];
  #pieceMapper: AdapterParams["pieceMapper"];

  constructor({ getDimension, piecesProvider, pieceMapper }: AdapterParams) {
    this.#getDimension = getDimension;
    this.#piecesProvider = piecesProvider;
    this.#pieceMapper = pieceMapper;
  }

  async applyMeshState<E extends ExperienceKey>({
    experience,
    key,
    state,
  }: {
    experience: E;
    key: ExperienceKeyMap[E];
    state: PieceVisibilityState;
  }): Promise<void> {
    const piece = this.#piecesProvider.getPiece(experience, key);
    if (!piece) {
      throw new Error(`PieceStateAdapter: piece not found at applyMeshState.`);
    }
    const bot = this.#pieceMapper.toInfrastructure(piece);
    if (!bot) {
      throw new Error(`PieceStateAdapter: bot not found at applyMeshState.`);
    }

    const dimension = this.#getDimension();
    const fromState = (bot.masks.state ??
      PIECE_VISIBILITY_STATES.HIDDEN) as PieceVisibilityState;
    const easing: Easing = { type: "sinusoidal", mode: "inout" };
    const duration = 0.3;
    const restingZ = bot.tags.targetPositionZ ?? 0;
    const zTag = `${dimension}Z` as keyof PieceBotTags;
    SetStrictTag(
      bot,
      "formDepthWrite",
      state === PIECE_VISIBILITY_STATES.SHOWN
    );

    const animations: Promise<void>[] = [];

    if (state === PIECE_VISIBILITY_STATES.HIDDEN) {
      SetStrictTag(bot, "pointable", false);
      if (fromState !== PIECE_VISIBILITY_STATES.HIDDEN) {
        animations.push(
          AnimateStrictTag(bot, "formOpacity", {
            toValue: 0,
            duration,
            easing,
            tagMaskSpace: false,
          }).then(() =>
            SetStrictTag(bot, dimension as keyof PieceBotTags, false)
          )
        );
      }
    } else if (state === PIECE_VISIBILITY_STATES.SHOWN) {
      SetStrictTag(bot, "pointable", bot.tags.pointableDefault ?? true);
      SetStrictTag(bot, dimension as keyof PieceBotTags, true);
      if (fromState !== PIECE_VISIBILITY_STATES.SHOWN) {
        if (fromState === PIECE_VISIBILITY_STATES.TRANSLUCENT) {
          animations.push(
            AnimateStrictTag(bot, "formOpacity", {
              toValue: bot.tags.baseFormOpacity ?? 1,
              duration,
              easing,
              tagMaskSpace: false,
            })
          );
        } else {
          animations.push(
            AnimateStrictTag(bot, zTag, {
              fromValue: restingZ + 1,
              toValue: restingZ,
              duration,
              easing,
              tagMaskSpace: false,
            }),
            AnimateStrictTag(bot, "formOpacity", {
              fromValue: 0,
              toValue: bot.tags.baseFormOpacity ?? 1,
              duration,
              easing,
              tagMaskSpace: false,
            })
          );
        }
      }
    } else {
      SetStrictTag(bot, dimension as keyof PieceBotTags, true);
      SetStrictTag(bot, "pointable", false);
      if (fromState !== PIECE_VISIBILITY_STATES.TRANSLUCENT) {
        const targetOpacity = 0.025;
        if (fromState === PIECE_VISIBILITY_STATES.SHOWN) {
          animations.push(
            AnimateStrictTag(bot, "formOpacity", {
              toValue: targetOpacity,
              duration,
              easing,
              tagMaskSpace: false,
            })
          );
        } else {
          animations.push(
            AnimateStrictTag(bot, zTag, {
              fromValue: restingZ + 1,
              toValue: restingZ,
              duration,
              easing,
              tagMaskSpace: false,
            }),
            AnimateStrictTag(bot, "formOpacity", {
              fromValue: 0,
              toValue: targetOpacity,
              duration,
              easing,
              tagMaskSpace: false,
            })
          );
        }
      }
    }

    setTagMask(bot, "state", state);
    await Promise.allSettled(animations);
  }
}
