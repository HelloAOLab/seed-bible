import type { TabernacleVisualizerPort } from "../../../domain/ports/visualizer";
import type { MeshState } from "../../../domain/models/meshState";
import type { PieceKey, VerseReference } from "../../../domain/models/piece";
import type { Easing } from "../../../../../../typings/AuxLibraryDefinitions";

const DIMENSION = "tabernacle";
const BLINK_DURATION = 1;

// Hitbox base properties for all piece hitboxes
const HITBOX_BASE = {
  isTabernaclePieceHitbox: true,
  anchorPoint: "center",
  draggable: false,
  color: "clear",
  pointable: true,
};

export class TabernacleVisualizerAdapter implements TabernacleVisualizerPort {
  #focusedBots: Bot[] = [];
  #lastInteractionId: string | null = null;
  #currentContextMenuBot: Bot | null = null;

  initialize(): void {
    const pieces = getBots("hitboxData");
    for (const piece of pieces) {
      const hitboxTags: Record<string, unknown> = {
        ...HITBOX_BASE,
        [DIMENSION]: true,
        transformer: piece.id,
        piece: `🔗${piece.id}`,
        onClick: `@import { tabernacleController } from "tabernacle.infrastructure.di.bootstrap";
tabernacleController?.handlePieceClick(links.piece.tags.key);`,
      };
      const data = piece.tags.hitboxData;
      for (const key in data) {
        const value = data[key];
        if (key === "position") {
          const { x = 0, y = 0, z = 0 } = value ?? {};
          hitboxTags[`${DIMENSION}X`] = x;
          hitboxTags[`${DIMENSION}Y`] = y;
          hitboxTags[`${DIMENSION}Z`] = z;
        } else {
          hitboxTags[key] = value;
        }
      }
      create({ ...hitboxTags });
    }
  }

  applyMeshState(key: PieceKey, state: MeshState): void {
    const bot = getBot("system", `tabernacle.${key}`);
    if (!bot) return;

    if (state === "Hidden") {
      animateTag(bot, "formOpacity", { toValue: 0, duration: 0.3 });
      setTagMask(bot, "pointable", false, "tempLocal");
    } else if (state === "Shown") {
      animateTag(bot, "formOpacity", {
        toValue: bot.tags.baseFormOpacity ?? 1,
        duration: 0.3,
      });
      setTagMask(
        bot,
        "pointable",
        bot.tags.pointableDefault ?? true,
        "tempLocal"
      );
    } else {
      animateTag(bot, "formOpacity", { toValue: 0.025, duration: 0.3 });
      setTagMask(bot, "pointable", false, "tempLocal");
    }
  }

  highlightPiece(key: PieceKey): void {
    const bot = getBot("system", `tabernacle.${key}`);
    if (!bot) return;

    const interactionId = uuid();
    this.#lastInteractionId = interactionId;

    if (this.#focusedBots.length > 0) {
      this.#clearFocus();
    }

    this.#focusedBots = [bot];

    const baseCone = getBot("system", "tabernacle.cone");
    const botPosition = getBotPosition(bot, DIMENSION);
    const easing: Easing = { type: "sinusoidal", mode: "inout" };

    const cone =
      bot.tags.showHighlightCone &&
      baseCone &&
      create(baseCone, {
        space: "tempLocal",
        parentId: bot.id,
        pointable: false,
        [DIMENSION]: true,
        [`${DIMENSION}X`]: botPosition.x + (bot.tags.coneOffset?.x ?? 0),
        [`${DIMENSION}Y`]: botPosition.y + (bot.tags.coneOffset?.y ?? 0),
        [`${DIMENSION}Z`]:
          botPosition.z +
          (bot.tags.coneOffset?.z ?? 0) +
          (bot.tags.scaleZ ?? 1) * (bot.tags.scale ?? 1) +
          (baseCone.tags.scaleZ ?? 1) * (baseCone.tags.targetScale ?? 1),
        [`${DIMENSION}RotationX`]: 3.141593,
        isCone: true,
        system: null,
        scale: baseCone.tags.targetScale,
      });

    // Show bot if it was hidden or translucent
    if (bot.masks.state === "Hidden" || bot.masks.state === "Translucent") {
      this.applyMeshState(key, "Shown");
    }

    // Camera focus
    os.focusOn(bot, {
      duration: 1,
      easing,
      rotation: { x: 1.01229, y: 0.5 },
      zoom: 40,
    });

    // Color blink: white → cyan → white
    Promise.resolve(
      animateTag(bot, "color", {
        toValue: "#8df5f3",
        duration: BLINK_DURATION / 2,
        easing,
      })
    )
      .then(() =>
        animateTag(bot, "color", {
          toValue: "#ffffff",
          duration: BLINK_DURATION / 2,
          easing,
        })
      )
      .finally(() => {
        if (this.#lastInteractionId === interactionId) {
          this.#focusedBots = [];
          this.#lastInteractionId = null;
        }
      });

    // Cone animation
    if (bot.tags.showHighlightCone && cone) {
      animateTag(cone, "formOpacity", {
        toValue: 0.75,
        duration: BLINK_DURATION / 2,
        easing,
      })
        .then(() =>
          animateTag(cone, "formOpacity", {
            toValue: 0,
            duration: BLINK_DURATION / 2,
            easing,
          })
        )
        .finally(() => destroy([cone]));
    }
  }

  stopHighlight(): void {
    this.#clearFocus();
  }

  toggleContextMenu(
    key: PieceKey,
    versesInChapter: VerseReference[],
    versesInOtherChapters: VerseReference[]
  ): void {
    const currMenu = this.#currentContextMenuBot;

    if (currMenu) {
      if (currMenu.tags.key === key) {
        destroy(currMenu);
        this.#currentContextMenuBot = null;
        return;
      } else {
        this.#buildContextMenu(
          currMenu,
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
      [DIMENSION]: true,
      color: "clear",
      orientationMode: "billboard",
      onDestroy: `@destroy(thisBot.vars.lines); destroy(thisBot.vars.menu)`,
    });
    const menuBot = newMenuBot as Bot;
    this.#currentContextMenuBot = menuBot;
    this.#buildContextMenu(
      menuBot,
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
      animateTag(bot, "color", { toValue: "#ffffff", duration: 0.3 });
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

  #buildContextMenu(
    menuBot: Bot,
    key: PieceKey,
    versesInChapter: VerseReference[],
    versesInOtherChapters: VerseReference[]
  ): void {
    const piece = getBot(byTag("key", key));
    if (!piece) return;

    const piecePosition = getBotPosition(piece, DIMENSION);
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
      [DIMENSION]: true,
      [`${DIMENSION}X`]: 0,
      [`${DIMENSION}Z`]: menuLinesPositionZ,
      scaleX: menuLineScaleX,
      scaleY: menuLineScaleY,
      scaleZ: 0,
    };
    const baseOptionTags = {
      ...baseLineTags,
      labelColor: "#1C1917",
      onPointerEnter: `@setTag(thisBot, "color", "#cacaca")`,
      onPointerExit: `@setTag(thisBot, "color", "white")`,
      onClick: `@import { tabernacleController } from "tabernacle.infrastructure.di.bootstrap";
tabernacleController?.handleVerseMenuClick(thisBot.tags.bookId, Number(thisBot.tags.chapter), Number(thisBot.tags.verse));`,
    };

    const lines: Bot[] = [];
    lines.push(
      create({ ...baseLineTags, label: this.#getFixedTitle(key) }) as Bot
    );

    for (const { bookId, chapter, verse } of versesInChapter) {
      lines.push(
        create({
          ...baseOptionTags,
          label: `${bookId} ${chapter}:${verse}`,
          bookId,
          chapter,
          verse,
        }) as Bot
      );
    }

    if (versesInChapter.length > 0 && versesInOtherChapters.length > 0) {
      lines.push(
        create({
          space: "tempLocal",
          draggable: false,
          [DIMENSION]: true,
          [`${DIMENSION}X`]: 0,
          [`${DIMENSION}Z`]: menuLinesPositionZ,
          scaleX: menuLineScaleX - menuPadding * 2,
          scaleY: 0.05,
          scaleZ: 0,
          color: "#1C1917",
        }) as Bot
      );
    }

    for (const { bookId, chapter, verse } of versesInOtherChapters) {
      lines.push(
        create({
          ...baseOptionTags,
          label: `${bookId} ${chapter}:${verse}`,
          bookId,
          chapter,
          verse,
        }) as Bot
      );
    }

    destroy(menuBot.vars.lines);
    menuBot.vars.lines = lines;

    const menu = (menuBot.vars.menu ??= create({
      space: "tempLocal",
      pointable: false,
      [DIMENSION]: true,
      [`${DIMENSION}X`]: 0,
      [`${DIMENSION}Z`]: -1,
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
      [`${DIMENSION}Y`]: 0,
    });

    let currY = menuScaleY / 2;
    for (const line of lines) {
      currY -= line.tags.scaleY / 2 + menuGap;
      applyMod(line, {
        transformer: menuBot.id,
        [`${DIMENSION}Y`]: currY,
      });
      currY -= line.tags.scaleY / 2;
    }

    applyMod(menuBot, {
      [`${DIMENSION}X`]: piecePosition.x,
      [`${DIMENSION}Y`]: piecePosition.y,
      [`${DIMENSION}Z`]:
        piecePosition.z +
        (piece.tags.scale ?? 1) / 2 +
        menuMarginBottom +
        menuScaleY / 2,
      key,
    });
  }
}
