import type { StackUpdateConfigProvider } from "../../config/stackUpdate/StackUpdateConfigProvider";
import type { LoggerPort } from "../../../application/ports/in/Logger";
import type { VisualStateRegistry } from "./VisualStateRegistry";
import type { StackUpdatePacing } from "../../../domain/models/stacks";
import type { StackBookData } from "../../../domain/entities/StackBookData";
import type { StackSectionBookData } from "../../../domain/entities/StackSectionBookData";
import type { BookBot } from "../../models/stack";
import type { PieceBot } from "../../models/casualos";
import type { Scales } from "../../functions/layout";
import { BookShapes, type BookShape } from "../../../domain/models/canvas";
import { SelectionStates } from "../../../domain/models/selection";
import { type SetStrictTag, AnimateStrictTag } from "../../functions/casualos";
import type { ColorLerper } from "../environment/ColorLerper";
import { HexToRgb } from "../../../domain/functions/colors";

type BookEntity = StackBookData | StackSectionBookData;

interface AdapterParams {
  stackUpdateConfigProvider: StackUpdateConfigProvider;
  visualStateRegistry: VisualStateRegistry;
  getBotScales: (bot: PieceBot) => Scales;
  setStrictTag: typeof SetStrictTag;
  loggerPort: LoggerPort;
  colorLerper: ColorLerper;
}

const SELECTED_FORM_OPACITY = 0;

/**
 * Infrastructure adapter that animates a book piece between its shapes.
 * Ported from the legacy `prefabs/book/TrySetShape` shout.
 *
 * `trySetShape` is a switchboard: a regular book (`StackBook`) and a single-book
 * section (`StackSectionBook`) have diverged visual states and shape sets, so
 * each type is rendered by its own method with concrete typing —
 * `#trySetBookShape` (Regular / ExplodedView / Selected / RegularSelected) and
 * `#trySetSectionBookShape` (Regular / Selected only).
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
  #loggerPort: AdapterParams["loggerPort"];
  #colorLerper: AdapterParams["colorLerper"];

  constructor({
    stackUpdateConfigProvider,
    visualStateRegistry,
    getBotScales,
    setStrictTag,
    loggerPort,
    colorLerper,
  }: AdapterParams) {
    this.#stackUpdateConfigProvider = stackUpdateConfigProvider;
    this.#visualStateRegistry = visualStateRegistry;
    this.#getBotScales = getBotScales;
    this.#setStrictTag = setStrictTag;
    this.#loggerPort = loggerPort;
    this.#colorLerper = colorLerper;
  }

  /**
   * Transition the book `bot` to `shape`. Returns `false` if it was already in
   * that shape (no-op) or has no piece, `true` otherwise. Dispatches to the
   * per-type renderer.
   */
  async trySetShape({
    data,
    bot,
    shape,
    pacing,
  }: {
    data: BookEntity;
    bot: BookBot;
    shape: BookShape;
    pacing: StackUpdatePacing;
    // Accepted for backwards compatibility with call sites; the scales are now
    // precomputed in the registry, so it is no longer used here.
    sectionInitialScale?: { x: number; y: number };
  }): Promise<boolean> {
    if (shape === data.currentShape) return false;
    if (!data.piece) {
      this.#loggerPort.error("BookShapeAdapter: book piece not defined");
      return false;
    }

    return data.type === "StackSectionBook"
      ? this.#trySetSectionBookShape({ data, bot, shape, pacing })
      : this.#trySetBookShape({ data, bot, shape, pacing });
  }

  /**
   * A regular book: Regular / ExplodedView / Selected / RegularSelected, using
   * its precomputed imploded / exploded scales from the registry.
   */
  async #trySetBookShape({
    data,
    bot,
    shape,
    pacing,
  }: {
    data: StackBookData;
    bot: BookBot;
    shape: BookShape;
    pacing: StackUpdatePacing;
  }): Promise<boolean> {
    const piece = data.piece;
    if (!piece) return false;

    const prevShape = data.currentShape;
    const isInstantaneous = pacing === "Instant";
    const duration = this.#stackUpdateConfigProvider.getDuration(pacing);
    const easing = this.#stackUpdateConfigProvider.getEasing();
    const currentScales = this.#getBotScales(bot);

    const implodedScales = this.#visualStateRegistry.getStateProperty({
      piece,
      property: "implodedScales",
    });
    const explodedScales = this.#visualStateRegistry.getStateProperty({
      piece,
      property: "explodedScales",
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
    const baseColor = data.paintColor ?? initialColor;

    data.changeShape(shape);

    switch (shape) {
      case BookShapes.ExplodedView:
      case BookShapes.Regular: {
        const isExploded = shape === BookShapes.ExplodedView;
        const oppositeShape = isExploded
          ? BookShapes.Regular
          : BookShapes.ExplodedView;
        const targetScales = isExploded ? explodedScales : implodedScales;
        this.#setStrictTag(bot, "color", baseColor);

        if (isInstantaneous) {
          if (prevShape !== BookShapes.Regular)
            this.#setStrictTag(bot, "formOpacity", unhoveredFormOpacity);
          this.#setStrictTag(bot, "scaleX", targetScales.x);
          this.#setStrictTag(bot, "scaleY", targetScales.y);
          this.#setStrictTag(bot, "scaleZ", targetScales.z);
        } else {
          const animations: Array<Promise<void>> = [
            AnimateStrictTag(bot, "scaleX", {
              fromValue: currentScales.x,
              toValue: targetScales.x,
              duration,
              easing,
              tagMaskSpace: false,
            }),
            AnimateStrictTag(bot, "scaleY", {
              fromValue: currentScales.y,
              toValue: targetScales.y,
              duration,
              easing,
              tagMaskSpace: false,
            }),
            AnimateStrictTag(bot, "scaleZ", {
              fromValue: currentScales.z,
              toValue: targetScales.z,
              duration,
              easing,
              tagMaskSpace: false,
            }),
          ];
          if (prevShape !== oppositeShape) {
            animations.push(
              AnimateStrictTag(bot, "formOpacity", {
                fromValue: bot.tags.formOpacity,
                toValue: unhoveredFormOpacity,
                duration,
                easing,
                tagMaskSpace: false,
              })
            );
          }
          await Promise.allSettled(animations);
        }
        if (
          data.selectionState !== SelectionStates.Selected &&
          data.highlightState !== "Highlighted"
        ) {
          this.#setStrictTag(bot, "strokeColor", "clear");
        }
        break;
      }
      case BookShapes.RegularSelected: {
        this.#setStrictTag(bot, "strokeColor", "#FFFFFF");
        await Promise.allSettled([
          AnimateStrictTag(bot, "formOpacity", {
            fromValue: bot.tags.formOpacity,
            toValue: SELECTED_FORM_OPACITY,
            duration,
            easing,
            tagMaskSpace: false,
          }),
          AnimateStrictTag(bot, "scaleX", {
            fromValue: currentScales.x,
            toValue: implodedScales.x,
            duration,
            easing,
            tagMaskSpace: false,
          }),
          AnimateStrictTag(bot, "scaleY", {
            fromValue: currentScales.y,
            toValue: implodedScales.y,
            duration,
            easing,
            tagMaskSpace: false,
          }),
          AnimateStrictTag(bot, "scaleZ", {
            fromValue: currentScales.z,
            toValue: implodedScales.z,
            duration,
            easing,
            tagMaskSpace: false,
          }),
        ]);
        this.#setStrictTag(bot, "color", "clear");
        break;
      }
      case BookShapes.Selected: {
        const singleBooksScales = this.#visualStateRegistry.getStateProperty({
          piece,
          property: "singleBooksScales",
        });
        const explodedViewSelectedScaleZ =
          this.#visualStateRegistry.getStateProperty({
            piece,
            property: "explodedViewSelectedScaleZ",
          });
        await Promise.allSettled([
          AnimateStrictTag(bot, "scaleX", {
            fromValue: currentScales.x,
            toValue: singleBooksScales.x,
            duration,
            easing,
            tagMaskSpace: false,
          }),
          AnimateStrictTag(bot, "scaleY", {
            fromValue: currentScales.y,
            toValue: singleBooksScales.y,
            duration,
            easing,
            tagMaskSpace: false,
          }),
          AnimateStrictTag(bot, "scaleZ", {
            fromValue: currentScales.z,
            toValue: explodedViewSelectedScaleZ,
            duration,
            easing,
            tagMaskSpace: false,
          }),
          this.#colorLerper.lerp({
            start: HexToRgb({ hexColor: baseColor }),
            end: HexToRgb({ hexColor: "#FFFFFF" }),
            durationSec: duration,
            bot,
            tag: "color",
          }),
        ]);
        this.#setStrictTag(bot, "strokeColor", "#FFFFFF");
        await AnimateStrictTag(bot, "formOpacity", {
          toValue: SELECTED_FORM_OPACITY,
          duration,
          easing,
          tagMaskSpace: false,
        });
        this.#setStrictTag(bot, "color", "clear");
        // NOTE: the book info label is shown by BookStackUpdaterService.finalizeBook.
        break;
      }
    }

    return true;
  }

  /**
   * A single-book section (`StackSectionBook`): only Regular and Selected, using
   * its precomputed unhovered scale from the registry.
   */
  async #trySetSectionBookShape({
    data,
    bot,
    shape,
    pacing,
  }: {
    data: StackSectionBookData;
    bot: BookBot;
    shape: BookShape;
    pacing: StackUpdatePacing;
  }): Promise<boolean> {
    const piece = data.piece;
    if (!piece) return false;

    const isInstantaneous = pacing === "Instant";
    const duration = this.#stackUpdateConfigProvider.getDuration(pacing);
    const easing = this.#stackUpdateConfigProvider.getEasing();
    const currentScales = this.#getBotScales(bot);

    const unhoveredScales = this.#visualStateRegistry.getStateProperty({
      piece,
      property: "unhoveredScales",
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
    const baseColor = data.paintColor ?? initialColor;

    data.changeShape(shape);

    switch (shape) {
      case BookShapes.Regular: {
        this.#setStrictTag(bot, "color", baseColor);

        if (isInstantaneous) {
          this.#setStrictTag(bot, "formOpacity", unhoveredFormOpacity);
          this.#setStrictTag(bot, "scaleX", unhoveredScales.x);
          this.#setStrictTag(bot, "scaleY", unhoveredScales.y);
          this.#setStrictTag(bot, "scaleZ", unhoveredScales.z);
        } else {
          await Promise.allSettled([
            AnimateStrictTag(bot, "scaleX", {
              fromValue: currentScales.x,
              toValue: unhoveredScales.x,
              duration,
              easing,
              tagMaskSpace: false,
            }),
            AnimateStrictTag(bot, "scaleY", {
              fromValue: currentScales.y,
              toValue: unhoveredScales.y,
              duration,
              easing,
              tagMaskSpace: false,
            }),
            AnimateStrictTag(bot, "scaleZ", {
              fromValue: currentScales.z,
              toValue: unhoveredScales.z,
              duration,
              easing,
              tagMaskSpace: false,
            }),
            AnimateStrictTag(bot, "formOpacity", {
              fromValue: bot.tags.formOpacity,
              toValue: unhoveredFormOpacity,
              duration,
              easing,
              tagMaskSpace: false,
            }),
          ]);
        }
        if (
          data.selectionState !== SelectionStates.Selected &&
          !bot.masks.isHighlighted
        ) {
          this.#setStrictTag(bot, "strokeColor", "clear");
        }
        break;
      }
      case BookShapes.Selected: {
        await Promise.allSettled([
          this.#colorLerper.lerp({
            start: HexToRgb({ hexColor: baseColor }),
            end: HexToRgb({ hexColor: "#FFFFFF" }),
            durationSec: duration,
            bot,
            tag: "color",
          }),
          AnimateStrictTag(bot, "scaleX", {
            fromValue: currentScales.x,
            toValue: unhoveredScales.x,
            duration,
            easing,
            tagMaskSpace: false,
          }),
          AnimateStrictTag(bot, "scaleY", {
            fromValue: currentScales.y,
            toValue: unhoveredScales.y,
            duration,
            easing,
            tagMaskSpace: false,
          }),
          AnimateStrictTag(bot, "scaleZ", {
            fromValue: currentScales.z,
            toValue: desiredScaleZ,
            duration,
            easing,
            tagMaskSpace: false,
          }),
        ]);
        this.#setStrictTag(bot, "strokeColor", "#FFFFFF");
        await AnimateStrictTag(bot, "formOpacity", {
          toValue: SELECTED_FORM_OPACITY,
          duration,
          easing,
          tagMaskSpace: false,
        });
        this.#setStrictTag(bot, "color", "clear");
        // NOTE: the book info label is shown by BookStackUpdaterService.finalizeBook.
        break;
      }
      default: {
        this.#loggerPort.error(
          `BookShapeAdapter: unsupported shape "${shape}" for section book`
        );
        break;
      }
    }

    return true;
  }
}
