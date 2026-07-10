import { BiblePieces, type Piece } from "bibleVizUtils.domain.models.canvas";
import type { HighlightPacing } from "bibleStack.domain.models.pieces";
import type { PieceHighlightAdapterPort } from "bibleStack.application.ports.pieces";
import type {
  PieceHighlightAdapterParams,
  HighlightVisualStatePort,
  HighlightAnimationConfigProviderPort,
} from "bibleStack.infrastructure.ports.highlight";
import type { PieceHighlightPieceDataRepositoryPort } from "bibleStack.application.ports.pieces";
import type {
  StackTestamentMapperPort,
  StackSectionMapperPort,
  StackSectionBookMapperPort,
  StackBookMapperPort,
  StackChapterMapperPort,
} from "bibleStack.infrastructure.ports.stackPieceLifecycle";
import type {
  TestamentBot,
  SectionBot,
  BookBot,
} from "bibleStack.models.stack";
import { GetBotScales } from "bibleVizUtils.infrastructure.functions.casualos";

type StackPieceUnion =
  | Piece<"StackTestament">
  | Piece<"StackSection">
  | Piece<"StackSectionBook">
  | Piece<"StackBook">
  | Piece<"StackChapter">;

export class PieceHighlightAdapter implements PieceHighlightAdapterPort {
  #testamentMapperPort: StackTestamentMapperPort;
  #sectionMapperPort: StackSectionMapperPort;
  #sectionBookMapperPort: StackSectionBookMapperPort;
  #bookMapperPort: StackBookMapperPort;
  #chapterMapperPort: StackChapterMapperPort;
  #visualStatePort: HighlightVisualStatePort;
  #animationConfigProviderPort: HighlightAnimationConfigProviderPort;
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
  }: PieceHighlightAdapterParams) {
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

      if (!chapterData.isSelecting && !chapterData.isDeselecting) {
        if (!chapterData.isSelected || chapterData.isOnTheGround) {
          const color = this.#visualStatePort.getStateProperty({
            piece,
            property: "highlightedColor",
          });
          setTagMask(bot, "color", color); // TODO: Implement color lerping
        }
        if (chapterData.isSelected && chapterData.isOnTheGround) {
          const scaleZ = this.#visualStatePort.getStateProperty({
            piece,
            property: "highlightedScaleZ",
          });
          await animateTag(bot, "scaleZ", {
            toValue: scaleZ,
            duration,
            easing,
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
            property: "hoveredScaleX",
          }),
          scaleY: this.#visualStatePort.getStateProperty({
            piece,
            property: "hoveredScaleY",
          }),
        };
        break;
      }
      case BiblePieces.StackBook: {
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
            property: "hoveredScaleX",
          }),
          scaleY: this.#visualStatePort.getStateProperty({
            piece,
            property: "hoveredScaleY",
          }),
        };
        break;
      }
    }

    if (!bot) return;
    await animateTag(bot, { fromValue, toValue, duration, easing });
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
        property: "hoveredScaleX",
      }),
      scaleY: this.#visualStatePort.getStateProperty({
        piece,
        property: "hoveredScaleY",
      }),
    };
    if (!bookData.isSelected) {
      fromValue.formOpacity = bookBot.tags.formOpacity;
      toValue.formOpacity = this.#visualStatePort.getStateProperty({
        piece,
        property: "hoveredFormOpacity",
      });
    }
    await animateTag(bookBot, { fromValue, toValue, duration, easing });
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

      if (!chapterData.isSelecting && !chapterData.isDeselecting) {
        if (!chapterData.isSelected || chapterData.isOnTheGround) {
          const color = this.#visualStatePort.getStateProperty({
            piece,
            property: "initialColor",
          });
          setTagMask(bot, "color", color); // TODO: Implement color lerping
        }
        if (chapterData.isSelected && chapterData.isOnTheGround) {
          const scaleZ = this.#visualStatePort.getStateProperty({
            piece,
            property: "expandedScaleZ",
          });
          await animateTag(bot, "scaleZ", {
            toValue: scaleZ,
            duration,
            easing,
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
            property: "initialScaleX",
          }),
          scaleY: this.#visualStatePort.getStateProperty({
            piece,
            property: "initialScaleY",
          }),
        };
        break;
      }
      case BiblePieces.StackBook: {
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
            property: "initialScaleX",
          }),
          scaleY: this.#visualStatePort.getStateProperty({
            piece,
            property: "initialScaleY",
          }),
        };
        break;
      }
    }

    if (!bot) return;
    await animateTag(bot, { fromValue, toValue, duration, easing });
  }

  increaseIntensity(piece: StackPieceUnion): void {
    if (piece.type !== BiblePieces.StackBook) return;
    const bot = this.#bookMapperPort.toInfrastructure(piece);
    if (!bot) return;
    const strokeColor = this.#visualStatePort.getStateProperty({
      piece,
      property: "increasedIntensityStrokeColor",
    });
    setTagMask(bot, "strokeColor", strokeColor);
  }

  decreaseIntensity(piece: StackPieceUnion): void {
    if (piece.type !== BiblePieces.StackBook) return;
    const bot = this.#bookMapperPort.toInfrastructure(piece);
    if (!bot) return;
    setTagMask(bot, "strokeColor", "clear");
  }
}
