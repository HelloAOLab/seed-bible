import type { ContextMenuRendererPort as PieceInteractionContextMenuRendererPort } from "../../../application/ports/out/PieceInteraction";
import type { ContextMenuRendererPort as EnvironmentContextMenuRendererPort } from "../../../application/ports/out/EnvironmentInteraction";
import type { PieceKey, VerseReference } from "../../../domain/models/piece";
import type { PiecesProvider } from "./PiecesProvider";
import type { PieceMapper } from "../../mappers/PieceMapper";
import type {
  ExperienceKey,
  ExperienceKeyMap,
} from "../../../domain/models/experience";

interface AdapterParams {
  getDimension: () => string;
  piecesProvider: PiecesProvider;
  pieceMapper: PieceMapper;
}

// TODO: Context menu should not work for now.
const doesContextMenusWork = false;

// prettier-ignore
export class ContextMenuRendererAdapter
  implements PieceInteractionContextMenuRendererPort, EnvironmentContextMenuRendererPort
{
  #currentContextMenuBot: Bot | null = null;
  #getDimension: AdapterParams["getDimension"];
  #piecesProvider: AdapterParams["piecesProvider"];
  #pieceMapper: AdapterParams["pieceMapper"];

  constructor({ getDimension, piecesProvider, pieceMapper }: AdapterParams) {
    this.#getDimension = getDimension;
    this.#piecesProvider = piecesProvider;
    this.#pieceMapper = pieceMapper;
  }

  toggleContextMenu<E extends ExperienceKey>(
    experience: E,
    key: ExperienceKeyMap[E],
    versesInChapter: VerseReference[],
    versesInOtherChapters: VerseReference[]
  ): void {
    if(doesContextMenusWork) {
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
  }

  hideContextMenu(): void {
    if (this.#currentContextMenuBot) {
      destroy(this.#currentContextMenuBot);
      this.#currentContextMenuBot = null;
    }
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
