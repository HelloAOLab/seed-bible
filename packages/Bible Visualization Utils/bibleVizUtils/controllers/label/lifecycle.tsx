import {
  GetBotScales,
  GetDialogBotScaleY,
  type HexString,
  GetLabelFormAddress,
  ComputeInfoLabelDateOffset,
  ComputeInfoLabelTransformerDesiredPosition,
  ComputeInfoLabelOffset,
  ComputeInfoLabelTailRotationZ,
  ComputeInfoLabelTailOffset,
} from "bibleVizUtils.functions.index";
import { labelService } from "bibleVizUtils.services.LabelService";
import { ObjectPoolTags } from "bibleVizUtils.models.canvas.models";
import {
  LabelDateFormat,
  type LabelPositionType,
} from "bibleVizUtils.models.label.models";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import type { Bot } from "../../../../../typings/AuxLibraryDefinitions";
import { LabelsRepository } from "bibleVizUtils.data.LabelsRepository";
import { updateIndicators } from "bibleVizUtils.controllers.userPresence.activityIndicatorsController";

export type SpawnLabelForPieceType = (params: {
  piece: Bot;
  label: string;
  date?: string;
  color: HexString;
  labelColor: HexString;
  dimension: string;
  labelPositioning: LabelPositionType;
  isAnimatable: boolean;
  targetOpacity?: number;
  pointableDefault?: boolean;
}) => { infoLabelTransformer: Bot };
export type DespawnLabelForPieceType = (piece: Bot) => void;

export const SpawnLabelForPiece: SpawnLabelForPieceType = ({
  piece,
  label,
  date,
  color,
  labelColor,
  dimension,
  labelPositioning,
  isAnimatable,
  targetOpacity = 1,
  pointableDefault = true,
}) => {
  const { scaleY } = GetDialogBotScaleY({
    scaleXLimit: 5,
    line: label,
    paddingX: 0.4,
    paddingY: 0.4,
    font: BibleVizDataRepository.getFont("Roboto"),
  });
  const infoLabelScales = { x: 5, y: scaleY, z: 1 };
  const infoLabelAspectRatio = infoLabelScales.x / infoLabelScales.y;
  const infoLabelFormAddress = GetLabelFormAddress(
    infoLabelAspectRatio,
    BibleVizDataRepository.getDialogBoxFormAddresses()
  );
  const transformer = piece.tags.transformer
    ? getBot(byID(piece.tags.transformer))
    : null;
  const transformerOffset = new Vector3(0, 0, 1);
  const transformerPosition = transformer
    ? getBotPosition(transformer, dimension).add(transformerOffset)
    : new Vector3(0, 0, 0);
  const piecePosition = getBotPosition(piece, dimension);
  const pieceScales = GetBotScales(piece);
  const infoLabelTransformer = ObjectPooler.GetObjectFromPool({
    tag: ObjectPoolTags.InfoLabelTransformer,
  });
  const infoLabel = ObjectPooler.GetObjectFromPool({
    tag: ObjectPoolTags.InfoLabel,
  });
  const infoLabelTail = ObjectPooler.GetObjectFromPool({
    tag: ObjectPoolTags.InfoLabelTail,
  });
  let infoLabelDate: Bot | undefined;
  const infoLabelTransformerDesiredScales = { x: 1, y: 1, z: 1 };
  const radialVector = new Vector2(pieceScales.x / 2, pieceScales.y / 2);
  const infoLabelOffsetMargin = 0.25;
  const infoLabelTailDesiredScales = {
    x: 0.3 / infoLabelTransformerDesiredScales.x,
    y: 0.3 / infoLabelTransformerDesiredScales.y,
    z: 0.3 / infoLabelTransformerDesiredScales.z,
  };
  const dateGap = { x: 0.2, y: 0.05 };

  const infoLabelTransformerDesiredPosition =
    ComputeInfoLabelTransformerDesiredPosition({
      positioning: labelPositioning,
      piecePosition,
      pieceScales,
      infoLabelTransformerDesiredScales,
      transformerPosition,
    });
  const infoLabelOffset = ComputeInfoLabelOffset({
    positioning: labelPositioning,
    radialVector,
    infoLabelOffsetMargin,
    infoLabelScales,
    infoLabelTailDesiredScales,
  });
  const infoLabelTailDesiredRotationZ =
    ComputeInfoLabelTailRotationZ(labelPositioning);
  const infoLabelTailOffset = ComputeInfoLabelTailOffset({
    positioning: labelPositioning,
    infoLabelTransformerDesiredScales,
    infoLabelScales,
    infoLabelTailDesiredScales,
    infoLabelOffset,
  });

  if (date) {
    infoLabelDate = ObjectPooler.GetObjectFromPool({
      tag: ObjectPoolTags.InfoLabelDate,
    });
    if (infoLabelDate) {
      const infoLabelDateDesiredScales = {
        x:
          labelService.getDateFormat() === LabelDateFormat.Relative
            ? infoLabelDate.tags.relativeDateScales.x
            : infoLabelDate.tags.absoluteDateScales.x,
        y: 0.375 / infoLabelTransformerDesiredScales.y,
        z: infoLabelScales.z / infoLabelTransformerDesiredScales.z,
      };
      const infoLabelDateScales = GetBotScales(infoLabelDate);
      if (
        infoLabelDate.tags?.relativeDateScales?.x &&
        infoLabelDate.tags?.absoluteDateScales?.x
      ) {
        const infoLabelDateOffset = ComputeInfoLabelDateOffset({
          infoLabelOffset,
          infoLabelScales,
          infoLabelTransformerDesiredScales,
          dateFormat: labelService.getDateFormat(),
          relativeDateScalesX: infoLabelDate.tags.relativeDateScales.x,
          absoluteDateScalesX: infoLabelDate.tags.absoluteDateScales.x,
          dateGap,
          infoLabelDateScales,
        });
        const infoLabelDateMod = {
          [dimension]: true,
          [dimension + "X"]: infoLabelDateOffset.x,
          [dimension + "Y"]: infoLabelDateOffset.y,
          [dimension + "Z"]: infoLabelDateOffset.z,
          initialPosition: infoLabelDateOffset,
          transformer: getID(infoLabelTransformer),
          label: date,
          color,
          formAddress:
            labelService.getDateFormat() === LabelDateFormat.Relative
              ? infoLabelDate.tags.relativeDateFormAddress
              : infoLabelDate.tags.absoluteDateFormAddress,
          scaleX: infoLabelDateDesiredScales.x,
          scaleY: infoLabelDateDesiredScales.y,
          scaleZ: infoLabelDateDesiredScales.z,
          labelColor,
          formOpacity: 0,
          labelPositioning,
          ownerBotId: getID(piece),
        };
        infoLabelDate.OnSpawned({ mod: infoLabelDateMod });
      } else {
        throw new Error(
          "relativeDateScales and absoluteDateScales of infoLabelDate are not defined at LabelController"
        );
      }
    }
  }

  const infoLabelTransformerMod = {
    [dimension]: true,
    [dimension + "X"]: infoLabelTransformerDesiredPosition.x,
    [dimension + "Y"]: infoLabelTransformerDesiredPosition.y,
    [dimension + "Z"]: infoLabelTransformerDesiredPosition.z,
    scaleX: infoLabelTransformerDesiredScales.x,
    scaleY: infoLabelTransformerDesiredScales.y,
    scaleZ: infoLabelTransformerDesiredScales.z,
    ownerBotId: getID(piece),
    ownerBot: `🔗${getID(piece)}`,
    isAnimatable,
    labelPositioning,
    targetOpacity,
    pointableDefault,
  };
  const infoLabelMod = {
    [dimension]: true,
    [dimension + "X"]: infoLabelOffset.x,
    [dimension + "Y"]: infoLabelOffset.y,
    [dimension + "Z"]: infoLabelOffset.z,
    initialPosition: infoLabelOffset,
    label,
    transformer: getID(infoLabelTransformer),
    scaleX: infoLabelScales.x / infoLabelTransformerDesiredScales.x,
    scaleY: infoLabelScales.y / infoLabelTransformerDesiredScales.y,
    scaleZ: infoLabelScales.z / infoLabelTransformerDesiredScales.z,
    formAddress: infoLabelFormAddress,
    pointable: false,
    formOpacity: 0,
    labelOpacity: 0,
    color,
    labelColor,
    labelPositioning,
    ownerBotId: getID(piece),
  };
  const infoLabelTailMod = {
    [dimension]: true,
    [dimension + "X"]: infoLabelTailOffset.x,
    [dimension + "Y"]: infoLabelTailOffset.y,
    [dimension + "Z"]: infoLabelTailOffset.z,
    initialPosition: infoLabelTailOffset,
    [dimension + "RotationZ"]: infoLabelTailDesiredRotationZ,
    transformer: getID(infoLabelTransformer),
    scaleX: infoLabelTailDesiredScales.x,
    scaleY: infoLabelTailDesiredScales.y,
    scaleZ: infoLabelTailDesiredScales.z,
    color,
    formOpacity: 0,
    labelPositioning,
    ownerBotId: getID(piece),
  };
  infoLabelTransformer.OnSpawned({ mod: infoLabelTransformerMod });
  infoLabel.OnSpawned({ mod: infoLabelMod });
  infoLabelTail.OnSpawned({ mod: infoLabelTailMod });

  const infoLabelUsersColor = updateIndicators(infoLabelTransformer);

  setTagMask([...infoLabelUsersColor, infoLabel], "formOpacity", 0);
  setTagMask([infoLabel, infoLabelTail, infoLabelDate], "labelOpacity", 0);

  return { infoLabelTransformer };
};

export const DespawnLabelForPiece: DespawnLabelForPieceType = (piece) => {
  const infoLabelTransformer =
    LabelsRepository.getLabelTransformerByOwner(piece);
  if (infoLabelTransformer)
    ObjectPooler.ReleaseObject({
      obj: infoLabelTransformer,
      tag: infoLabelTransformer.tags.poolTag,
    });
};
