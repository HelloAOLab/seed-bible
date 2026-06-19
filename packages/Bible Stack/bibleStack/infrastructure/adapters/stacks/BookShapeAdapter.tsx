import type { StackUpdateConfigProvider } from "../../config/stackUpdate/StackUpdateConfigProvider";
import type { LoggerPort } from "@packages/Bible Stack/bibleStack/application/ports/in/Logger";
import type { VisualStateRegistry } from "./VisualStateRegistry";
import type { StackUpdatePacing } from "@packages/Bible Stack/bibleStack/domain/models/stacks";
import type { StackBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackBookData";
import type { StackSectionBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionBookData";
import type { BookBot } from "@packages/Bible Stack/bibleStack/models/stack";
import type { PieceBot } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/models/casualos";
import type { Scales } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/functions/layout";
import {
  BookShape,
  type BookShapeType,
} from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";
import { SelectionStates } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/selection";
import type {
  SetStrictTag,
  AnimateStrictTag,
} from "bibleVizUtils.infrastructure.functions.casualos";

type BookEntity = StackBookData | StackSectionBookData;

interface AdapterParams {
  stackUpdateConfigProvider: StackUpdateConfigProvider;
  visualStateRegistry: VisualStateRegistry;
  getBotScales: (bot: PieceBot) => Scales;
  setStrictTag: typeof SetStrictTag;
  animateStrictTag: typeof AnimateStrictTag;
  loggerPort: LoggerPort;
}

const SELECTED_FORM_OPACITY = 0;

/**
 * Infrastructure adapter that animates a book piece between its shapes
 * (Regular / ExplodedView / Selected / RegularSelected). Ported from the legacy
 * `prefabs/book/TrySetShape` shout.
 *
 * Scope: scale / opacity / stroke / colour transitions only. The book info label
 * is owned by the application layer (BookStackUpdaterService prepare/finalize via
 * PieceLabelService), so no label spawn/hide happens here. History-mode colour and
 * the colour-lerp-to-white selection effect are not yet ported — see TODOs.
 */
export class BookShapeAdapter {
  #stackUpdateConfigProvider: AdapterParams["stackUpdateConfigProvider"];
  #visualStateRegistry: AdapterParams["visualStateRegistry"];
  #getBotScales: AdapterParams["getBotScales"];
  #setStrictTag: AdapterParams["setStrictTag"];
  #animateStrictTag: AdapterParams["animateStrictTag"];
  #loggerPort: AdapterParams["loggerPort"];

  constructor({
    stackUpdateConfigProvider,
    visualStateRegistry,
    getBotScales,
    setStrictTag,
    animateStrictTag,
    loggerPort,
  }: AdapterParams) {
    this.#stackUpdateConfigProvider = stackUpdateConfigProvider;
    this.#visualStateRegistry = visualStateRegistry;
    this.#getBotScales = getBotScales;
    this.#setStrictTag = setStrictTag;
    this.#animateStrictTag = animateStrictTag;
    this.#loggerPort = loggerPort;
  }

  /**
   * Transition the book `bot` to `shape`. Returns `false` if it was already in
   * that shape (no-op), `true` otherwise. `sectionInitialScale` is the parent
   * section's initial scale, used only by the `explodedViewCustomScale` path.
   */
  async trySetShape({
    data,
    bot,
    shape,
    pacing,
    sectionInitialScale,
  }: {
    data: BookEntity;
    bot: BookBot;
    shape: BookShapeType;
    pacing: StackUpdatePacing;
    sectionInitialScale?: { x: number; y: number };
  }): Promise<boolean> {
    const prevShape = data.currentShape;
    if (shape === prevShape) return false;

    const piece = data.piece;
    if (!piece) {
      this.#loggerPort.error("BookShapeAdapter: book piece not defined");
      return false;
    }

    const isInstantaneous = pacing === "Instant";
    const duration = this.#stackUpdateConfigProvider.getDuration(pacing);
    const easing = this.#stackUpdateConfigProvider.getEasing();
    const currentScales = this.#getBotScales(bot);

    const initialScaleX = this.#visualStateRegistry.getStateProperty({
      piece,
      property: "initialScaleX",
    });
    const initialScaleY = this.#visualStateRegistry.getStateProperty({
      piece,
      property: "initialScaleY",
    });
    const desiredScaleZ = this.#visualStateRegistry.getStateProperty({
      piece,
      property: "desiredScaleZ",
    });
    const unhoveredFormOpacity = this.#visualStateRegistry.getStateProperty({
      piece,
      property: "unhoveredFormOpacity",
    });
    const initialColor = this.#visualStateRegistry.getStateProperty({
      piece,
      property: "initialColor",
    });

    // TODO(history-mode): the legacy chose the colour via history-mode/GetHistoryColor.
    const baseColor = data.highlightColor ?? initialColor;

    // explodedViewCustomScale multiplies the parent section's initial scale.
    const customScale = this.#visualStateRegistry.getStateProperty({
      piece,
      property: "explodedViewCustomScale",
    });
    const explodedScaleX =
      customScale && sectionInitialScale
        ? customScale.x * sectionInitialScale.x
        : initialScaleX;
    const explodedScaleY =
      customScale && sectionInitialScale
        ? customScale.y * sectionInitialScale.y
        : initialScaleY;

    data.changeShape(shape);

    switch (shape) {
      case BookShape.ExplodedView:
      case BookShape.Regular: {
        const isExploded = shape === BookShape.ExplodedView;
        const oppositeShape = isExploded
          ? BookShape.Regular
          : BookShape.ExplodedView;
        const targetScaleX = isExploded ? explodedScaleX : initialScaleX;
        const targetScaleY = isExploded ? explodedScaleY : initialScaleY;
        this.#setStrictTag(bot, "color", baseColor);

        if (isInstantaneous) {
          if (prevShape !== BookShape.Regular)
            this.#setStrictTag(bot, "formOpacity", unhoveredFormOpacity);
          this.#setStrictTag(bot, "scaleX", targetScaleX);
          this.#setStrictTag(bot, "scaleY", targetScaleY);
          this.#setStrictTag(bot, "scaleZ", desiredScaleZ);
        } else {
          const animations: Array<Promise<void>> = [
            this.#animateStrictTag(bot, "scaleX", {
              fromValue: currentScales.x,
              toValue: targetScaleX,
              duration,
              easing,
            }),
            this.#animateStrictTag(bot, "scaleY", {
              fromValue: currentScales.y,
              toValue: targetScaleY,
              duration,
              easing,
            }),
            this.#animateStrictTag(bot, "scaleZ", {
              fromValue: currentScales.z,
              toValue: desiredScaleZ,
              duration,
              easing,
            }),
          ];
          if (prevShape !== oppositeShape) {
            animations.push(
              this.#animateStrictTag(bot, "formOpacity", {
                fromValue: bot.tags.formOpacity,
                toValue: unhoveredFormOpacity,
                duration,
                easing,
              })
            );
          }
          await Promise.allSettled(animations);
        }
        if (
          data.selectionState !== SelectionStates.Selected &&
          !bot.masks.isHighlighted
        ) {
          this.#setStrictTag(bot, "strokeColor", "clear");
        }
        break;
      }
      case BookShape.RegularSelected: {
        this.#setStrictTag(bot, "strokeColor", "#FFFFFF");
        await Promise.allSettled([
          this.#animateStrictTag(bot, "formOpacity", {
            fromValue: bot.tags.formOpacity,
            toValue: SELECTED_FORM_OPACITY,
            duration,
            easing,
          }),
          this.#animateStrictTag(bot, "scaleX", {
            fromValue: currentScales.x,
            toValue: initialScaleX,
            duration,
            easing,
          }),
          this.#animateStrictTag(bot, "scaleY", {
            fromValue: currentScales.y,
            toValue: initialScaleY,
            duration,
            easing,
          }),
          this.#animateStrictTag(bot, "scaleZ", {
            fromValue: currentScales.z,
            toValue: desiredScaleZ,
            duration,
            easing,
          }),
        ]);
        this.#setStrictTag(bot, "color", "clear");
        break;
      }
      case BookShape.Selected: {
        const isSectionBook = data.type === "StackSectionBook";
        const singleBooksScales = this.#visualStateRegistry.getStateProperty({
          piece,
          property: "singleBooksScales",
        });
        const explodedViewSelectedScaleZ =
          this.#visualStateRegistry.getStateProperty({
            piece,
            property: "explodedViewSelectedScaleZ",
          });
        const targetScaleX = isSectionBook
          ? initialScaleX
          : singleBooksScales.x;
        const targetScaleY = isSectionBook
          ? initialScaleY
          : singleBooksScales.y;
        const targetScaleZ = isSectionBook
          ? desiredScaleZ
          : explodedViewSelectedScaleZ;
        // TODO(colour-lerp): legacy lerped colour to white before this animation.
        await Promise.allSettled([
          this.#animateStrictTag(bot, "scaleX", {
            fromValue: currentScales.x,
            toValue: targetScaleX,
            duration,
            easing,
          }),
          this.#animateStrictTag(bot, "scaleY", {
            fromValue: currentScales.y,
            toValue: targetScaleY,
            duration,
            easing,
          }),
          this.#animateStrictTag(bot, "scaleZ", {
            fromValue: currentScales.z,
            toValue: targetScaleZ,
            duration,
            easing,
          }),
        ]);
        this.#setStrictTag(bot, "strokeColor", "#FFFFFF");
        await this.#animateStrictTag(bot, "formOpacity", {
          toValue: SELECTED_FORM_OPACITY,
          duration,
          easing,
        });
        this.#setStrictTag(bot, "color", "clear");
        // NOTE: the book info label is shown by BookStackUpdaterService.finalizeBook.
        break;
      }
    }

    return true;
  }
}
