import { BiblePieces, type Piece } from "../../../domain/models/canvas";
import type { HighlightPacing } from "../../../domain/models/pieces";
import type { PieceHighlightAdapterPort } from "../../../application/ports/pieces";
import type { PieceHighlightPieceDataRepositoryPort } from "../../../application/ports/pieces";
import type { StackTestamentMapper } from "../../mappers/StackTestamentMapper";
import type { StackSectionMapper } from "../../mappers/StackSectionMapper";
import type { StackSectionBookMapper } from "../../mappers/StackSectionBookMapper";
import type { StackBookMapper } from "../../mappers/StackBookMapper";
import type { StackChapterMapper } from "../../mappers/StackChapterMapper";
import type { TestamentBot, SectionBot, BookBot } from "../../models/stack";
import {
  AnimateStrictTag,
  GetBotScales,
  SetStrictTag,
} from "../../functions/casualos";
import type { HighlightConfigProvider } from "../../config/highlight/HighlightConfigProvider";
import type { VisualStateRegistry } from "./VisualStateRegistry";

type StackPieceUnion =
  | Piece<"StackTestament">
  | Piece<"StackSection">
  | Piece<"StackSectionBook">
  | Piece<"StackBook">
  | Piece<"StackChapter">;

export interface AdapterParams {
  testamentMapperPort: StackTestamentMapper;
  sectionMapperPort: StackSectionMapper;
  sectionBookMapperPort: StackSectionBookMapper;
  bookMapperPort: StackBookMapper;
  chapterMapperPort: StackChapterMapper;
  visualStatePort: VisualStateRegistry;
  animationConfigProviderPort: HighlightConfigProvider;
  pieceDataRepositoryPort: PieceHighlightPieceDataRepositoryPort;
}

export class PieceHighlightAdapter implements PieceHighlightAdapterPort {
  #testamentMapperPort: StackTestamentMapper;
  #sectionMapperPort: StackSectionMapper;
  #sectionBookMapperPort: StackSectionBookMapper;
  #bookMapperPort: StackBookMapper;
  #chapterMapperPort: StackChapterMapper;
  #visualStatePort: VisualStateRegistry;
  #animationConfigProviderPort: HighlightConfigProvider;
  #pieceDataRepositoryPort: PieceHighlightPieceDataRepositoryPort;

  constructor({
    testamentMapperPort,
    sectionMapperPort,
    sectionBookMapperPort,
    bookMapperPort,
    chapterMapperPort,
    visualStatePort,
    animationConfigProviderPort,
    pieceDataRepositoryPort,
  }: AdapterParams) {
    this.#testamentMapperPort = testamentMapperPort;
    this.#sectionMapperPort = sectionMapperPort;
    this.#sectionBookMapperPort = sectionBookMapperPort;
    this.#bookMapperPort = bookMapperPort;
    this.#chapterMapperPort = chapterMapperPort;
    this.#visualStatePort = visualStatePort;
    this.#animationConfigProviderPort = animationConfigProviderPort;
    this.#pieceDataRepositoryPort = pieceDataRepositoryPort;
  }

  interruptSequence(piece: StackPieceUnion): void {
    if (piece.type === BiblePieces.StackChapter) {
      const bot = this.#chapterMapperPort.toInfrastructure(piece);
      if (!bot) return;
      // TODO: Clear color lerp as well.
      clearAnimations(bot, "scaleZ");
      return;
    }

    switch (piece.type) {
      case BiblePieces.StackTestament: {
        const bot = this.#testamentMapperPort.toInfrastructure(piece);
        if (!bot) return;
        clearAnimations(bot, "scaleX");
        clearAnimations(bot, "scaleY");
        break;
      }
      case BiblePieces.StackSection: {
        const bot = this.#sectionMapperPort.toInfrastructure(piece);
        if (!bot) return;
        clearAnimations(bot, "formOpacity");
        clearAnimations(bot, "scaleX");
        clearAnimations(bot, "scaleY");
        break;
      }
      case BiblePieces.StackSectionBook: {
        const bot = this.#sectionBookMapperPort.toInfrastructure(piece);
        if (!bot) return;
        clearAnimations(bot, "formOpacity");
        clearAnimations(bot, "scaleX");
        clearAnimations(bot, "scaleY");
        break;
      }
      case BiblePieces.StackBook: {
        const bot = this.#bookMapperPort.toInfrastructure(piece);
        if (!bot) return;
        clearAnimations(bot, "formOpacity");
        clearAnimations(bot, "scaleX");
        clearAnimations(bot, "scaleY");
        break;
      }
    }
  }

  async highlight(
    piece: StackPieceUnion,
    pacing: HighlightPacing = "Regular"
  ): Promise<void> {
    const duration =
      this.#animationConfigProviderPort.getHighlightDuration(pacing);
    const easing = this.#animationConfigProviderPort.getHighlightEasing();

    if (piece.type === BiblePieces.StackChapter) {
      const bot = this.#chapterMapperPort.toInfrastructure(piece);

      if (!bot) return;
      const chapterData = this.#pieceDataRepositoryPort.getPieceData(piece);
      if (!chapterData) return;

      if (
        chapterData.selectionState !== "Selecting" &&
        chapterData.selectionState !== "Deselecting"
      ) {
        if (!chapterData.isSelected || chapterData.isOnTheGround) {
          const color = this.#visualStatePort.getStateProperty({
            piece,
            property: "highlightedColor",
          });
          SetStrictTag(bot, "color", color); // TODO: Implement color lerping
        }
        if (chapterData.isSelected && chapterData.isOnTheGround) {
          const scaleZ = this.#visualStatePort.getStateProperty({
            piece,
            property: "highlightedScaleZ",
          });
          await AnimateStrictTag(bot, "scaleZ", {
            toValue: scaleZ,
            duration,
            easing,
            tagMaskSpace: false,
            ignoreCancellation: true,
          });
        }
      }
      return;
    }

    type AnimatableValues = Record<string, number>;
    let bot: TestamentBot | SectionBot | BookBot | undefined;
    let fromValue: AnimatableValues = {};
    let toValue: AnimatableValues = {};

    switch (piece.type) {
      case BiblePieces.StackTestament: {
        const testamentBot = this.#testamentMapperPort.toInfrastructure(piece);
        if (!testamentBot) return;
        bot = testamentBot;
        const scales = GetBotScales(testamentBot);
        fromValue = { scaleX: scales.x, scaleY: scales.y };
        toValue = {
          scaleX: this.#visualStatePort.getStateProperty({
            piece,
            property: "hoveredScaleX",
          }),
          scaleY: this.#visualStatePort.getStateProperty({
            piece,
            property: "hoveredScaleY",
          }),
        };
        break;
      }
      case BiblePieces.StackSection: {
        const sectionBot = this.#sectionMapperPort.toInfrastructure(piece);
        if (!sectionBot) return;
        bot = sectionBot;
        const scales = GetBotScales(sectionBot);
        fromValue = {
          formOpacity: sectionBot.tags.formOpacity,
          scaleX: scales.x,
          scaleY: scales.y,
        };
        toValue = {
          formOpacity: this.#visualStatePort.getStateProperty({
            piece,
            property: "hoveredFormOpacity",
          }),
          scaleX: this.#visualStatePort.getStateProperty({
            piece,
            property: "hoveredScaleX",
          }),
          scaleY: this.#visualStatePort.getStateProperty({
            piece,
            property: "hoveredScaleY",
          }),
        };
        break;
      }
      case BiblePieces.StackSectionBook: {
        const sectionBookBot =
          this.#sectionBookMapperPort.toInfrastructure(piece);
        if (!sectionBookBot) return;
        bot = sectionBookBot;
        const scales = GetBotScales(sectionBookBot);
        fromValue = {
          formOpacity: sectionBookBot.tags.formOpacity,
          scaleX: scales.x,
          scaleY: scales.y,
        };
        toValue = {
          formOpacity: this.#visualStatePort.getStateProperty({
            piece,
            property: "hoveredFormOpacity",
          }),
          scaleX: this.#visualStatePort.getStateProperty({
            piece,
            property: "hoveredScales",
          }).x,
          scaleY: this.#visualStatePort.getStateProperty({
            piece,
            property: "hoveredScales",
          }).y,
        };

        break;
      }
      case BiblePieces.StackBook:
        {
          const bookBot = this.#bookMapperPort.toInfrastructure(piece);
          if (!bookBot) return;
          bot = bookBot;
          const scales = GetBotScales(bookBot);
          fromValue = {
            formOpacity: bookBot.tags.formOpacity,
            scaleX: scales.x,
            scaleY: scales.y,
          };
          toValue = {
            formOpacity: this.#visualStatePort.getStateProperty({
              piece,
              property: "hoveredFormOpacity",
            }),
            scaleX: this.#visualStatePort.getStateProperty({
              piece,
              property: "hoveredScales",
            }).x,
            scaleY: this.#visualStatePort.getStateProperty({
              piece,
              property: "hoveredScales",
            }).y,
          };

          const strokeColor = this.#visualStatePort.getStateProperty({
            piece: piece,
            property: "increasedIntensityStrokeColor",
          });
          SetStrictTag(bookBot, "strokeColor", strokeColor);
        }
        break;
    }

    if (!bot) return;
    await AnimateStrictTag(bot, {
      fromValue,
      toValue,
      duration,
      easing,
      tagMaskSpace: false,
      ignoreCancellation: true,
    });
  }

  async rehighlight(
    piece: StackPieceUnion,
    pacing?: HighlightPacing
  ): Promise<void> {
    if (piece.type !== BiblePieces.StackBook) {
      return this.highlight(piece, pacing);
    }

    const duration = this.#animationConfigProviderPort.getHighlightDuration(
      pacing ?? "Regular"
    );
    const easing = this.#animationConfigProviderPort.getHighlightEasing();
    const bookBot = this.#bookMapperPort.toInfrastructure(piece);
    if (!bookBot) return;
    const bookData = this.#pieceDataRepositoryPort.getPieceData(piece);
    if (!bookData) return;

    type AnimatableValues = Record<string, number>;
    const scales = GetBotScales(bookBot);
    const fromValue: AnimatableValues = { scaleX: scales.x, scaleY: scales.y };
    const toValue: AnimatableValues = {
      scaleX: this.#visualStatePort.getStateProperty({
        piece,
        property: "hoveredScales",
      }).x,
      scaleY: this.#visualStatePort.getStateProperty({
        piece,
        property: "hoveredScales",
      }).y,
    };
    if (bookData.selectionState !== "Selected") {
      fromValue.formOpacity = bookBot.tags.formOpacity;
      toValue.formOpacity = this.#visualStatePort.getStateProperty({
        piece,
        property: "hoveredFormOpacity",
      });
    }

    const strokeColor = this.#visualStatePort.getStateProperty({
      piece: piece,
      property: "increasedIntensityStrokeColor",
    });
    SetStrictTag(bookBot, "strokeColor", strokeColor);

    await AnimateStrictTag(bookBot, {
      fromValue,
      toValue,
      duration,
      easing,
      tagMaskSpace: false,
      ignoreCancellation: true,
    });
  }

  async unhighlight(
    piece: StackPieceUnion,
    pacing: HighlightPacing = "Regular"
  ): Promise<void> {
    const duration =
      this.#animationConfigProviderPort.getHighlightDuration(pacing);
    const easing = this.#animationConfigProviderPort.getHighlightEasing();

    if (piece.type === BiblePieces.StackChapter) {
      const bot = this.#chapterMapperPort.toInfrastructure(piece);
      if (!bot) return;
      const chapterData = this.#pieceDataRepositoryPort.getPieceData(piece);
      if (!chapterData) return;

      if (
        chapterData.selectionState !== "Selecting" &&
        chapterData.selectionState !== "Deselecting"
      ) {
        if (!chapterData.isSelected || chapterData.isOnTheGround) {
          const color = this.#visualStatePort.getStateProperty({
            piece,
            property: "initialColor",
          });
          SetStrictTag(bot, "color", color); // TODO: Implement color lerping
        }
        if (chapterData.isSelected && chapterData.isOnTheGround) {
          const scaleZ = this.#visualStatePort.getStateProperty({
            piece,
            property: "expandedScaleZ",
          });
          await AnimateStrictTag(bot, "scaleZ", {
            toValue: scaleZ,
            duration,
            easing,
            tagMaskSpace: false,
            ignoreCancellation: true,
          });
        }
      }
      return;
    }

    type AnimatableValues = Record<string, number>;
    let bot: TestamentBot | SectionBot | BookBot | undefined;
    let fromValue: AnimatableValues = {};
    let toValue: AnimatableValues = {};

    switch (piece.type) {
      case BiblePieces.StackTestament: {
        const testamentBot = this.#testamentMapperPort.toInfrastructure(piece);
        if (!testamentBot) return;
        bot = testamentBot;
        const scales = GetBotScales(testamentBot);
        fromValue = { scaleX: scales.x, scaleY: scales.y };
        toValue = {
          scaleX: this.#visualStatePort.getStateProperty({
            piece,
            property: "initialScaleX",
          }),
          scaleY: this.#visualStatePort.getStateProperty({
            piece,
            property: "initialScaleY",
          }),
        };
        break;
      }
      case BiblePieces.StackSection: {
        const sectionBot = this.#sectionMapperPort.toInfrastructure(piece);
        if (!sectionBot) return;
        bot = sectionBot;
        const scales = GetBotScales(sectionBot);
        fromValue = {
          formOpacity: sectionBot.tags.formOpacity,
          scaleX: scales.x,
          scaleY: scales.y,
        };
        toValue = {
          formOpacity: this.#visualStatePort.getStateProperty({
            piece,
            property: "unhoveredFormOpacity",
          }),
          scaleX: this.#visualStatePort.getStateProperty({
            piece,
            property: "initialScaleX",
          }),
          scaleY: this.#visualStatePort.getStateProperty({
            piece,
            property: "initialScaleY",
          }),
        };
        break;
      }
      case BiblePieces.StackSectionBook: {
        const sectionBookBot =
          this.#sectionBookMapperPort.toInfrastructure(piece);
        if (!sectionBookBot) return;
        bot = sectionBookBot;
        const scales = GetBotScales(sectionBookBot);
        fromValue = {
          formOpacity: sectionBookBot.tags.formOpacity,
          scaleX: scales.x,
          scaleY: scales.y,
        };
        toValue = {
          formOpacity: this.#visualStatePort.getStateProperty({
            piece,
            property: "unhoveredFormOpacity",
          }),
          scaleX: this.#visualStatePort.getStateProperty({
            piece,
            property: "unhoveredScales",
          }).x,
          scaleY: this.#visualStatePort.getStateProperty({
            piece,
            property: "unhoveredScales",
          }).y,
        };

        break;
      }
      case BiblePieces.StackBook:
        {
          const bookBot = this.#bookMapperPort.toInfrastructure(piece);
          if (!bookBot) return;
          bot = bookBot;
          const scales = GetBotScales(bookBot);
          fromValue = {
            formOpacity: bookBot.tags.formOpacity,
            scaleX: scales.x,
            scaleY: scales.y,
          };
          toValue = {
            formOpacity: this.#visualStatePort.getStateProperty({
              piece,
              property: "unhoveredFormOpacity",
            }),
            scaleX: this.#visualStatePort.getStateProperty({
              piece,
              property: "explodedScales",
            }).x,
            scaleY: this.#visualStatePort.getStateProperty({
              piece,
              property: "explodedScales",
            }).y,
          };
          SetStrictTag(bookBot, "strokeColor", "clear");
        }
        break;
    }

    if (!bot) return;
    await AnimateStrictTag(bot, {
      fromValue,
      toValue,
      duration,
      easing,
      tagMaskSpace: false,
      ignoreCancellation: true,
    });
  }

  increaseIntensity(piece: StackPieceUnion): void {
    if (piece.type !== BiblePieces.StackBook) return;
    const bot = this.#bookMapperPort.toInfrastructure(piece);
    if (!bot) return;
    const strokeColor = this.#visualStatePort.getStateProperty({
      piece,
      property: "increasedIntensityStrokeColor",
    });
    SetStrictTag(bot, "strokeColor", strokeColor);
  }

  decreaseIntensity(piece: StackPieceUnion): void {
    if (piece.type !== BiblePieces.StackBook) return;
    const bot = this.#bookMapperPort.toInfrastructure(piece);
    if (!bot) return;
    SetStrictTag(bot, "strokeColor", "clear");
  }
}
