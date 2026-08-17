import type { TabernacleVisualizerPort } from "../../../domain/ports/visualizer";
import {
  PIECE_VISIBILITY_STATES,
  type PieceVisibilityState,
} from "../../../domain/models/piece";
import type { PieceKey, VerseReference } from "../../../domain/models/piece";
import type { Easing } from "../../../../../pattern-typings/AuxLibraryDefinitions";
import type { PiecesProvider } from "../PiecesProvider";
import type { PieceMapper } from "../../mappers/PieceMapper";
import {
  AnimateStrictTag,
  ApplyStrictMod,
  SetStrictTag,
} from "../../functions/casualos";
import type { VFXBotFactory } from "../vfx/VFXBotFactory";
import type { PieceBotTags, VFXBot, VFXBotTags } from "../../models/casualos";
import type { ColorLerper } from "./ColorLerper";
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
}

export class TabernacleVisualizerAdapter implements TabernacleVisualizerPort {
  #focusedBots: Bot[] = [];
  #lastInteractionId: string | null = null;
  #currentContextMenuBot: Bot | null = null;
  #getDimension: AdapterParams["getDimension"];
  #piecesProvider: AdapterParams["piecesProvider"];
  #pieceMapper: AdapterParams["pieceMapper"];
  #vfxBotFactory: AdapterParams["vfxBotFactory"];
  #colorLerper: AdapterParams["colorLerper"];

  constructor({
    getDimension,
    piecesProvider,
    pieceMapper,
    vfxBotFactory,
    colorLerper,
  }: AdapterParams) {
    this.#getDimension = getDimension;
    this.#piecesProvider = piecesProvider;
    this.#pieceMapper = pieceMapper;
    this.#vfxBotFactory = vfxBotFactory;
    this.#colorLerper = colorLerper;
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
      throw new Error(
        `TabernacleVisualizerAdapter: piece not found at applyMeshState.`
      );
    }
    const bot = this.#pieceMapper.toInfrastructure(piece);
    if (!bot) {
      throw new Error(
        `TabernacleVisualizerAdapter: bot not found at applyMeshState.`
      );
    }

    const dimension = this.#getDimension();
    const fromState = (bot.masks.state ??
      PIECE_VISIBILITY_STATES.HIDDEN) as PieceVisibilityState;
    const easing: Easing = { type: "sinusoidal", mode: "inout" };
    const duration = 0.3;
    const restingZ = bot.tags.targetPositionZ ?? 0;
    const zTag = `${dimension}Z` as keyof PieceBotTags;

    const animations: Promise<void>[] = [];

    // console.log(`[Debug] TabernacleVisualizerAdapter.applyMeshState before`, {
    //   bot: {...bot, tags: {...bot.tags}, masks: {...bot.masks}}
    // })

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
            })
          );
        } else {
          animations.push(
            AnimateStrictTag(bot, zTag, {
              fromValue: restingZ + 1,
              toValue: restingZ,
              duration,
              easing,
            }),
            AnimateStrictTag(bot, "formOpacity", {
              fromValue: 0,
              toValue: bot.tags.baseFormOpacity ?? 1,
              duration,
              easing,
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

    // console.log(`[Debug] TabernacleVisualizerAdapter.applyMeshState after`, {
    //   bot: {...bot, tags: {...bot.tags}, masks: {...bot.masks}}
    // })
  }

  highlightPiece<E extends ExperienceKey>(
    experience: E,
    key: ExperienceKeyMap[E]
  ): void {
    const dimension = this.#getDimension();
    const piece = this.#piecesProvider.getPiece(experience, key);
    if (!piece) {
      throw new Error(
        `TabernacleVisualizerAdapter: piece not found at highlightPiece.`
      );
    }
    const bot = this.#pieceMapper.toInfrastructure(piece);
    if (!bot) {
      throw new Error(
        `TabernacleVisualizerAdapter: bot not found at highlightPiece.`
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
          "TabernacleVisualizerAdapter: cone not found at highlightPiece."
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

    // Show bot if it was hidden or translucent
    if (
      bot.masks.state === PIECE_VISIBILITY_STATES.HIDDEN ||
      bot.masks.state === PIECE_VISIBILITY_STATES.TRANSLUCENT
    ) {
      this.applyMeshState({
        experience,
        key,
        state: PIECE_VISIBILITY_STATES.SHOWN,
      });
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

  toggleContextMenu<E extends ExperienceKey>(
    experience: E,
    key: ExperienceKeyMap[E],
    versesInChapter: VerseReference[],
    versesInOtherChapters: VerseReference[]
  ): void {
    const dimension = this.#getDimension();
    const currMenu = this.#currentContextMenuBot;

    if (currMenu) {
      if (currMenu.tags.key === key) {
        destroy(currMenu);
        this.#currentContextMenuBot = null;
        return;
      } else {
        this.#buildContextMenu(
          currMenu,
          experience,
          key,
          versesInChapter,
          versesInOtherChapters
        );
        return;
      }
    }

    const newMenuBot = create({
      isTabernaclePieceContextMenuTransformer: true,
      space: "tempLocal",
      pointable: false,
      [dimension]: true,
      color: "clear",
      orientationMode: "billboard",
      onDestroy: `@destroy(thisBot.vars.lines); destroy(thisBot.vars.menu)`,
    });
    const menuBot = newMenuBot as Bot;
    this.#currentContextMenuBot = menuBot;
    this.#buildContextMenu(
      menuBot,
      experience,
      key,
      versesInChapter,
      versesInOtherChapters
    );
  }

  hideContextMenu(): void {
    if (this.#currentContextMenuBot) {
      destroy(this.#currentContextMenuBot);
      this.#currentContextMenuBot = null;
    }
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

  #getFixedTitle(key: PieceKey): string {
    return key
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  #buildContextMenu<E extends ExperienceKey>(
    menuBot: Bot,
    experience: E,
    key: ExperienceKeyMap[E],
    versesInChapter: VerseReference[],
    versesInOtherChapters: VerseReference[]
  ): void {
    const dimension = this.#getDimension();
    const pieceData = this.#piecesProvider.getPiece(experience, key);
    if (!pieceData) return;
    const bot = this.#pieceMapper.toInfrastructure(pieceData);
    if (!bot) return;

    const piecePosition = getBotPosition(bot, dimension);
    const menuPadding = 0.25;
    const menuGap = 0.25;
    const menuMarginBottom = 3;
    const menuLineScaleX = 5;
    const menuLineScaleY = 1;
    const menuScaleX = menuLineScaleX + menuPadding * 2;
    const menuLinesPositionZ = -0.95;

    const baseLineTags = {
      space: "tempLocal",
      draggable: false,
      isTabernacleContextMenuLine: true,
      [dimension]: true,
      [`${dimension}X`]: 0,
      [`${dimension}Z`]: menuLinesPositionZ,
      scaleX: menuLineScaleX,
      scaleY: menuLineScaleY,
      scaleZ: 0,
    };
    const baseOptionTags = {
      ...baseLineTags,
      labelColor: "#1C1917",
      onPointerEnter: `@setTag(thisBot, "color", "#cacaca")`,
      onPointerExit: `@setTag(thisBot, "color", "white")`,
    };

    const lines: Bot[] = [];
    lines.push(
      create({ ...baseLineTags, label: this.#getFixedTitle(key) }) as Bot
    );

    for (const { bookId, chapter, verse } of versesInChapter) {
      const optionBot = create({
        ...baseOptionTags,
        label: `${bookId} ${chapter}:${verse}`,
        bookId,
        chapter,
        verse,
      }) as Bot;
      os.addBotListener(optionBot, "onClick", () => {
        // TODO: wire this verse-menu option to the controller (was an inline code-string handler).
        //   @import { tabernacleController } from "tabernacle.infrastructure.di.bootstrap";
        // tabernacleController?.handleVerseMenuClick(thisBot.tags.bookId, Number(thisBot.tags.chapter), Number(thisBot.tags.verse));
      });
      lines.push(optionBot);
    }

    if (versesInChapter.length > 0 && versesInOtherChapters.length > 0) {
      lines.push(
        create({
          space: "tempLocal",
          draggable: false,
          [dimension]: true,
          [`${dimension}X`]: 0,
          [`${dimension}Z`]: menuLinesPositionZ,
          scaleX: menuLineScaleX - menuPadding * 2,
          scaleY: 0.05,
          scaleZ: 0,
          color: "#1C1917",
        }) as Bot
      );
    }

    for (const { bookId, chapter, verse } of versesInOtherChapters) {
      const optionBot = create({
        ...baseOptionTags,
        label: `${bookId} ${chapter}:${verse}`,
        bookId,
        chapter,
        verse,
      }) as Bot;
      os.addBotListener(optionBot, "onClick", () => {
        // TODO: wire this verse-menu option to the controller (was an inline code-string handler).
        //   @import { tabernacleController } from "tabernacle.infrastructure.di.bootstrap";
        // tabernacleController?.handleVerseMenuClick(thisBot.tags.bookId, Number(thisBot.tags.chapter), Number(thisBot.tags.verse));
      });
      lines.push(optionBot);
    }

    destroy(menuBot.vars.lines);
    menuBot.vars.lines = lines;

    const menu = (menuBot.vars.menu ??= create({
      space: "tempLocal",
      pointable: false,
      [dimension]: true,
      [`${dimension}X`]: 0,
      [`${dimension}Z`]: -1,
      transformer: menuBot.id,
      scaleX: menuScaleX,
      scaleZ: 0,
    }));

    const linesScaleY = lines.reduce(
      (acc: number, line: Bot) => acc + line.tags.scaleY,
      0
    );
    const menuScaleY = linesScaleY + (lines.length + 1) * menuGap;

    applyMod(menu, {
      scaleY: menuScaleY,
      [`${dimension}Y`]: 0,
    });

    let currY = menuScaleY / 2;
    for (const line of lines) {
      currY -= line.tags.scaleY / 2 + menuGap;
      applyMod(line, {
        transformer: menuBot.id,
        [`${dimension}Y`]: currY,
      });
      currY -= line.tags.scaleY / 2;
    }

    applyMod(menuBot, {
      [`${dimension}X`]: piecePosition.x,
      [`${dimension}Y`]: piecePosition.y,
      [`${dimension}Z`]:
        piecePosition.z +
        (bot.tags.scale ?? 1) / 2 +
        menuMarginBottom +
        menuScaleY / 2,
      key,
    });
  }
}
