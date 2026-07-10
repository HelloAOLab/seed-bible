import { LabelPositions } from "bibleVizUtils.models.label";
import { LabelsRepository } from "bibleVizUtils.data.LabelsRepository";
import { SpawnLabelForPiece } from "bibleVizUtils.controllers.label.lifecycle";
import { GetBotScales } from "bibleVizUtils.functions.index";
import { HexToRgb } from "bibleVizUtils.functions.index";
import { BookShapes, type BookShape } from "bibleVizUtils.models.canvas";
import type { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import type { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import type { Easing } from "../../../../../../typings/AuxLibraryDefinitions";
import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";

/**
 * This tag try to set the book shape into the one passed as an argument
 * @param {Object} that - Object that contains important data for the function
 * @param {String} that.shape - The type of shape the book attempts to set its shape.
 * @param {Number} that.duration? - Is optional and is a custom duration for the animation
 * @example
 * thisBot.TrySetShape({shape: BookShapes.Regular})
 */

const dimension = os.getCurrentDimension();
const {
  shape,
  speedMultiplier = 1,
  isInstantaneous = false,
}: {
  shape: BookShape;
  speedMultiplier?: number;
  isInstantaneous?: boolean;
} = that;
let { duration = 0.5 }: { duration?: number } = that;
duration = duration / speedMultiplier;
const bookData = await (BibleStackManager.GetPieceData({
  piece: thisBot,
}) as Promise<StackBookData | undefined>);

if (!bookData) {
  console.error("bookData not found at TrySetShape");
  return;
}

const { sectionData } = await (BibleStackManager.GetDataChainFromParentDataIds({
  parentDataIds: bookData.parentDataIds,
}) as Promise<{ sectionData: StackSectionData | undefined }>);

const prevShape = bookData.currentShape;
if (shape === prevShape) return false;

const bookScales = GetBotScales(thisBot);
const easing: Easing = { type: "sinusoidal", mode: "inout" };
const selectedOpacity = 0;
const infoLabelTransformer =
  LabelsRepository.getLabelTransformerByOwner(thisBot);
bookData.changeShape(shape);
switch (shape) {
  case BookShapes.ExplodedView:
    {
      setTagMask(
        thisBot,
        "color",
        BibleVizUtils.Data.masks.isInHistoryMode
          ? BibleVizUtils.Functions.GetHistoryColor({ piece: thisBot })
          : (bookData.highlightColor ?? thisBot.tags.initialColor)
      );
      if (isInstantaneous) {
        if (prevShape !== BookShapes.Regular)
          setTagMask(thisBot, "formOpacity", thisBot.tags.unhoveredOpacity);
        setTagMask(
          thisBot,
          "scaleX",
          thisBot.tags.explodedViewCustomScale
            ? thisBot.tags.explodedViewCustomScale.x *
                sectionData?.piece?.tags.initialScaleX
            : thisBot.tags.initialScaleX
        );
        setTagMask(
          thisBot,
          "scaleY",
          thisBot.tags.explodedViewCustomScale
            ? thisBot.tags.explodedViewCustomScale.y *
                sectionData?.piece?.tags.initialScaleY
            : thisBot.tags.initialScaleY
        );
        setTagMask(thisBot, "scaleZ", thisBot.tags.desiredScaleZ);
      } else {
        await Promise.allSettled([
          animateTag(thisBot, {
            fromValue: {
              formOpacity:
                prevShape !== BookShapes.Regular
                  ? thisBot.tags.formOpacity
                  : null,
              scaleX: bookScales.x,
              scaleY: bookScales.y,
              scaleZ: bookScales.z,
            },
            toValue: {
              formOpacity:
                prevShape !== BookShapes.Regular
                  ? thisBot.tags.unhoveredOpacity
                  : null,
              scaleX: thisBot.tags.explodedViewCustomScale
                ? thisBot.tags.explodedViewCustomScale.x *
                  sectionData?.piece?.tags.initialScaleX
                : thisBot.tags.initialScaleX,
              scaleY: thisBot.tags.explodedViewCustomScale
                ? thisBot.tags.explodedViewCustomScale.y *
                  sectionData?.piece?.tags.initialScaleY
                : thisBot.tags.initialScaleY,
              scaleZ: thisBot.tags.desiredScaleZ,
            },
            duration,
            easing,
          }),
          prevShape === BookShapes.Selected && infoLabelTransformer
            ? infoLabelTransformer.Hide({ isInstantaneous }).then(() => {
                ObjectPooler.ReleaseObject({
                  obj: infoLabelTransformer,
                  tag: infoLabelTransformer.tags.poolTag,
                });
              })
            : null,
        ]);
      }
      if (!bookData.isSelected && !thisBot.masks.isHighlighted) {
        setTagMask(thisBot, "strokeColor", "clear");
      }
    }
    break;
  case BookShapes.Regular:
    {
      setTagMask(
        thisBot,
        "color",
        BibleVizUtils.Data.masks.isInHistoryMode
          ? BibleVizUtils.Functions.GetHistoryColor({ piece: thisBot })
          : (bookData.highlightColor ?? thisBot.tags.initialColor)
      );
      if (isInstantaneous) {
        if (prevShape !== BookShapes.Regular)
          setTagMask(thisBot, "formOpacity", thisBot.tags.unhoveredOpacity);
        setTagMask(
          thisBot,
          "scaleX",
          thisBot.tags.explodedViewCustomScale
            ? thisBot.tags.explodedViewCustomScale.x *
                sectionData?.piece?.tags.initialScaleX
            : thisBot.tags.initialScaleX
        );
        setTagMask(
          thisBot,
          "scaleY",
          thisBot.tags.explodedViewCustomScale
            ? thisBot.tags.explodedViewCustomScale.y *
                sectionData?.piece?.tags.initialScaleY
            : thisBot.tags.initialScaleY
        );
        setTagMask(thisBot, "scaleZ", thisBot.tags.desiredScaleZ);
      } else {
        await Promise.allSettled([
          animateTag(thisBot, {
            fromValue: {
              formOpacity:
                prevShape !== BookShapes.ExplodedView
                  ? thisBot.tags.formOpacity
                  : null,
              scaleX: bookScales.x,
              scaleY: bookScales.y,
              scaleZ: bookScales.z,
            },
            toValue: {
              formOpacity:
                prevShape !== BookShapes.ExplodedView
                  ? thisBot.tags.unhoveredOpacity
                  : null,
              scaleX: thisBot.tags.initialScaleX,
              scaleY: thisBot.tags.initialScaleY,
              scaleZ: thisBot.tags.desiredScaleZ,
            },
            duration,
            easing,
          }),
          prevShape === BookShapes.Selected && infoLabelTransformer
            ? infoLabelTransformer.Hide({ isInstantaneous }).then(() => {
                ObjectPooler.ReleaseObject({
                  obj: infoLabelTransformer,
                  tag: infoLabelTransformer.tags.poolTag,
                });
              })
            : null,
        ]);
      }
      if (!bookData.isSelected && !thisBot.masks.isHighlighted) {
        setTagMask(thisBot, "strokeColor", "clear");
      }
    }
    break;
  case BookShapes.RegularSelected:
    {
      setTagMask(thisBot, "strokeColor", "#FFFFFF");
      await Promise.allSettled([
        animateTag(thisBot, {
          fromValue: {
            formOpacity: thisBot.tags.formOpacity,
            scaleX: bookScales.x,
            scaleY: bookScales.y,
            scaleZ: bookScales.z,
          },
          toValue: {
            formOpacity: selectedOpacity,
            scaleX: thisBot.tags.initialScaleX,
            scaleY: thisBot.tags.initialScaleY,
            scaleZ: thisBot.tags.desiredScaleZ,
          },
          duration,
          easing,
        }),
        prevShape === BookShapes.Selected && infoLabelTransformer
          ? infoLabelTransformer.Hide({ isInstantaneous }).then(() => {
              ObjectPooler.ReleaseObject({
                obj: infoLabelTransformer,
                tag: infoLabelTransformer.tags.poolTag,
              });
            })
          : null,
      ]);
      setTagMask(thisBot, "color", "clear");
    }
    break;
  case BookShapes.Selected:
    {
      await Promise.allSettled([
        prevShape !== BookShapes.RegularSelected
          ? ColorLerper.LerpTag({
              startingColor: HexToRgb({
                hexColor: thisBot.masks.color ?? thisBot.tags.color,
              }),
              endingColor: [255, 255, 255],
              durationInSeconds: duration,
              bot: thisBot,
              tag: BibleVizUtils.Data.tags.InterpolatableColorTags.Color,
            })
          : null,
        animateTag(thisBot, {
          fromValue: {
            scaleX: bookScales.x,
            scaleY: bookScales.y,
            scaleZ: bookScales.z,
          },
          toValue: {
            scaleX:
              bookData instanceof StackSectionBookData
                ? bookData.piece?.tags.initialScaleX
                : bookData.piece?.tags.singleBooksScales.x,
            scaleY:
              bookData instanceof StackSectionBookData
                ? bookData.piece?.tags.initialScaleY
                : bookData.piece?.tags.singleBooksScales.y,
            scaleZ:
              bookData instanceof StackSectionBookData
                ? thisBot.tags.desiredScaleZ
                : thisBot.tags.explodedViewSelectedScaleZ,
          },
          duration,
          easing,
        }),
      ]);
      const { infoLabelTransformer } = SpawnLabelForPiece({
        piece: thisBot,
        label: thisBot.tags.bookName,
        color: bookData.highlightColor ?? thisBot.tags.labelTextColor,
        labelColor: "white",
        dimension,
        labelPositioning: thisBot.masks.isOnTheGround
          ? LabelPositions.Top
          : LabelPositions.RightSided,
        isAnimatable: false,
      });
      setTagMask(thisBot, "strokeColor", "#FFFFFF");
      await animateTag(thisBot, "formOpacity", {
        toValue: selectedOpacity,
        duration,
        easing,
      });
      setTagMask(thisBot, "color", "clear");
      await infoLabelTransformer.Show({
        isInstantaneous,
        manager: BibleStackManager,
      });
    }
    break;
}
return true;
