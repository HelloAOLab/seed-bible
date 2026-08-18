import type { PieceHighlightPort } from "../../../domain/ports/pieceHighlight";
import type { PieceStatePort } from "../../../domain/ports/pieceState";
import type { LayerProviderPort } from "../../../application/ports/out/tabernacle";
import { PIECE_VISIBILITY_STATES } from "../../../domain/models/piece";
import type { Easing } from "../../../../../pattern-typings/AuxLibraryDefinitions";
import type { PiecesProvider } from "../PiecesProvider";
import type { PieceMapper } from "../../mappers/PieceMapper";
import { AnimateStrictTag, ApplyStrictMod } from "../../functions/casualos";
import type { VFXBotFactory } from "../vfx/VFXBotFactory";
import type { VFXBot, VFXBotTags } from "../../models/casualos";
import type { ColorLerper } from "../casualos/ColorLerper";
import { HexToRgb } from "../../../domain/functions/colors";
import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";

const BLINK_DURATION = 1;

interface AdapterParams {
  getDimension: () => string;
  piecesProvider: PiecesProvider;
  pieceMapper: PieceMapper;
  vfxBotFactory: VFXBotFactory;
  colorLerper: ColorLerper;
  pieceState: PieceStatePort;
  layerProvider: LayerProviderPort;
}

export class PieceHighlightAdapter implements PieceHighlightPort {
  #focusedBots: Bot[] = [];
  #lastInteractionId: string | null = null;
  #getDimension: AdapterParams["getDimension"];
  #piecesProvider: AdapterParams["piecesProvider"];
  #pieceMapper: AdapterParams["pieceMapper"];
  #vfxBotFactory: AdapterParams["vfxBotFactory"];
  #colorLerper: AdapterParams["colorLerper"];
  #pieceState: AdapterParams["pieceState"];
  #layerProvider: AdapterParams["layerProvider"];

  constructor({
    getDimension,
    piecesProvider,
    pieceMapper,
    vfxBotFactory,
    colorLerper,
    pieceState,
    layerProvider,
  }: AdapterParams) {
    this.#getDimension = getDimension;
    this.#piecesProvider = piecesProvider;
    this.#pieceMapper = pieceMapper;
    this.#vfxBotFactory = vfxBotFactory;
    this.#colorLerper = colorLerper;
    this.#pieceState = pieceState;
    this.#layerProvider = layerProvider;
  }

  highlightPiece<E extends ExperienceKey>(
    experience: E,
    key: ExperienceKeyMap[E]
  ): void {
    const dimension = this.#getDimension();
    const piece = this.#piecesProvider.getPiece(experience, key);
    if (!piece) {
      throw new Error(
        `PieceHighlightAdapter: piece not found at highlightPiece.`
      );
    }
    const bot = this.#pieceMapper.toInfrastructure(piece);
    if (!bot) {
      throw new Error(
        `PieceHighlightAdapter: bot not found at highlightPiece.`
      );
    }

    const interactionId = uuid();
    this.#lastInteractionId = interactionId;

    if (this.#focusedBots.length > 0) {
      this.#clearFocus();
    }

    this.#focusedBots = [bot];

    let cone: VFXBot<"cone"> | undefined;
    const botPosition = getBotPosition(bot, dimension);
    const easing: Easing = { type: "sinusoidal", mode: "inout" };

    if (bot.tags.showHighlightCone) {
      cone = this.#vfxBotFactory.create("cone");
      if (!cone) {
        throw new Error(
          "PieceHighlightAdapter: cone not found at highlightPiece."
        );
      }
      const coneMod: Partial<VFXBotTags<"cone">> = {
        parentId: bot.id,
        pointable: false,
        [dimension as keyof VFXBotTags<"cone">]: true,
        [`${dimension}X` as keyof VFXBotTags<"cone">]:
          botPosition.x + (bot.tags.coneOffset?.x ?? 0),
        [`${dimension}Y` as keyof VFXBotTags<"cone">]:
          botPosition.y + (bot.tags.coneOffset?.y ?? 0),
        [`${dimension}Z` as keyof VFXBotTags<"cone">]:
          botPosition.z +
          (bot.tags.coneOffset?.z ?? 0) +
          (bot.tags.scaleZ ?? 1) * (bot.tags.scale ?? 1) +
          (cone.tags.scaleZ ?? 1) * (cone.tags.targetScale ?? 1),
        [`${dimension}RotationX` as keyof VFXBotTags<"cone">]: 3.141593,
        system: null,
        scale: cone.tags.targetScale,
      };
      ApplyStrictMod(cone, coneMod);
    }

    // Occlusion by layer: the highlighted piece's layer and everything below it
    // stay shown; the layer right above becomes translucent; everything further
    // above is hidden, leaving the piece visually unobstructed.
    const layer = this.#layerProvider.getLayerNumber(experience, key);
    const layers = this.#layerProvider.getAllLayers(experience);
    for (let i = 0; i < layers.length; i++) {
      const state =
        i <= layer
          ? PIECE_VISIBILITY_STATES.SHOWN
          : i === layer + 1
            ? PIECE_VISIBILITY_STATES.TRANSLUCENT
            : PIECE_VISIBILITY_STATES.HIDDEN;
      for (const relatedKey of layers[i] ?? []) {
        this.#pieceState.applyMeshState({ experience, key: relatedKey, state });
      }
    }

    // Camera focus
    os.focusOn(bot, {
      duration: 1,
      easing,
      rotation: { x: 1.01229, y: 0.5 },
      zoom: 40,
    });

    // Color blink: white → cyan → white
    this.#colorLerper
      .lerp({
        end: HexToRgb({ hexColor: "#8df5f3" }),
        durationSec: BLINK_DURATION / 2,
        bot,
        tag: "color",
      })
      .then(() => {
        return this.#colorLerper.lerp({
          end: HexToRgb({ hexColor: "#ffffff" }),
          durationSec: BLINK_DURATION / 2,
          bot,
          tag: "color",
        });
      })
      .finally(() => {
        if (this.#lastInteractionId === interactionId) {
          this.#focusedBots = [];
          this.#lastInteractionId = null;
        }
      });

    // Cone animation
    if (cone) {
      AnimateStrictTag(cone, "formOpacity", {
        toValue: 0.75,
        duration: BLINK_DURATION / 2,
        easing,
        tagMaskSpace: false,
      })
        .then(() =>
          AnimateStrictTag(cone, "formOpacity", {
            toValue: 0,
            duration: BLINK_DURATION / 2,
            easing,
            tagMaskSpace: false,
          })
        )
        .finally(() => destroy([cone]));
    }
  }

  stopHighlight(): void {
    this.#clearFocus();
  }

  #clearFocus(): void {
    for (const bot of this.#focusedBots) {
      AnimateStrictTag(bot, "color", {
        toValue: "#ffffff",
        duration: 0.3,
        tagMaskSpace: false,
      });
    }
    this.#focusedBots = [];
    this.#lastInteractionId = null;
  }
}
