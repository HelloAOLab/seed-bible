import { type FontData } from "bibleVizUtils.data.BibleVizDataRepository";
import type {
  Vector3 as Vector3Type,
  Vector2 as Vector2Type,
} from "../../../../typings/AuxLibraryDefinitions";
import {
  LabelPosition,
  LabelDateFormat,
  type LabelPositionType,
  type LabelDateFormatType,
} from "bibleVizUtils.models.label";
import type { DialogBoxFormAddressesType } from "bibleVizUtils.data.DialogBoxFormAddresses";
import { ClosestNumber } from "bibleVizUtils.functions.math";

export type Scales = { x: number; y: number; z: number };
type GetDialogBotScaleYType = (params: {
  scaleXLimit: number;
  line: string;
  paddingX?: number;
  paddingY?: number;
  fontSize?: number;
  font: FontData;
}) => { scaleX: number; scaleY: number };
type GetExplodedViewBooksPositionsType = (params: {
  booksScalesZ: number[];
  sectionExplodedViewScaleZ: number;
}) => number[];
type ComputeNotificationDirectionType = (
  cameraRotationZ: number
) => Vector2Type;

type ComputeInfoLabelTransformerDesiredPositionType = (params: {
  positioning: LabelPositionType;
  piecePosition: Vector3Type;
  pieceScales: Scales;
  infoLabelTransformerDesiredScales: Scales;
  transformerPosition: Vector3Type;
}) => Vector3Type;

type ComputeInfoLabelOffsetType = (params: {
  positioning: LabelPositionType;
  radialVector: Vector2Type;
  infoLabelOffsetMargin: number;
  infoLabelScales: Scales;
  infoLabelTailDesiredScales: Scales;
}) => Vector3Type;

type ComputeInfoLabelTailRotationZType = (
  positioning: LabelPositionType
) => number;

type ComputeInfoLabelTailOffsetType = (params: {
  positioning: LabelPositionType;
  infoLabelTransformerDesiredScales: Scales;
  infoLabelScales: Scales;
  infoLabelTailDesiredScales: Scales;
  infoLabelOffset: Vector3Type;
}) => Vector3Type;

type InfoLabelTransformerPositionParams = {
  piecePosition: Vector3Type;
  pieceScales: Scales;
  infoLabelTransformerDesiredScales: Scales;
  transformerPosition: Vector3Type;
};
type InfoLabelTransformerPositionMap = Record<
  LabelPositionType,
  (params: InfoLabelTransformerPositionParams) => Vector3Type
>;

const infoLabelTransformerPositionStrategies: InfoLabelTransformerPositionMap =
  {
    [LabelPosition.LeftSided]: ({
      piecePosition,
      pieceScales,
      infoLabelTransformerDesiredScales,
      transformerPosition,
    }) => {
      return new Vector3(
        piecePosition.x,
        piecePosition.y,
        piecePosition.z +
          pieceScales.z / 2 -
          infoLabelTransformerDesiredScales.z / 2
      ).add(transformerPosition);
    },
    [LabelPosition.RightSided]: ({
      piecePosition,
      pieceScales,
      infoLabelTransformerDesiredScales,
      transformerPosition,
    }) => {
      return new Vector3(
        piecePosition.x,
        piecePosition.y,
        piecePosition.z +
          pieceScales.z / 2 -
          infoLabelTransformerDesiredScales.z / 2
      ).add(transformerPosition);
    },
    [LabelPosition.RightSidedCorner]: ({
      piecePosition,
      pieceScales,
      infoLabelTransformerDesiredScales,
      transformerPosition,
    }) => {
      return new Vector3(
        piecePosition.x,
        piecePosition.y,
        piecePosition.z +
          pieceScales.z -
          infoLabelTransformerDesiredScales.z / 2
      ).add(transformerPosition);
    },
    [LabelPosition.Top]: ({
      piecePosition,
      pieceScales,
      infoLabelTransformerDesiredScales,
      transformerPosition,
    }) => {
      return new Vector3(
        piecePosition.x,
        piecePosition.y,
        piecePosition.z +
          pieceScales.z -
          infoLabelTransformerDesiredScales.z / 2 +
          1.5
      ).add(transformerPosition);
    },
  };

type InfoLabelOffsetParams = {
  radialVector: Vector2Type;
  infoLabelOffsetMargin: number;
  infoLabelScales: Scales;
  infoLabelTailDesiredScales: Scales;
};

type InfoLabelOffsetMap = Record<
  LabelPositionType,
  (params: InfoLabelOffsetParams) => Vector3Type
>;

const infoLabelOffsetStrategies: InfoLabelOffsetMap = {
  [LabelPosition.LeftSided]: ({
    radialVector,
    infoLabelOffsetMargin,
    infoLabelScales,
    infoLabelTailDesiredScales,
  }) => {
    return new Vector3(
      -(
        radialVector.length() +
        infoLabelOffsetMargin +
        infoLabelScales.x / 2 +
        infoLabelTailDesiredScales.x
      ),
      0.5,
      5
    );
  },
  [LabelPosition.RightSided]: ({
    radialVector,
    infoLabelOffsetMargin,
    infoLabelScales,
    infoLabelTailDesiredScales,
  }) => {
    return new Vector3(
      radialVector.length() +
        infoLabelOffsetMargin +
        infoLabelScales.x / 2 +
        infoLabelTailDesiredScales.x,
      0.5,
      5
    );
  },
  [LabelPosition.RightSidedCorner]: ({ radialVector, infoLabelScales }) => {
    return new Vector3(radialVector.length() + infoLabelScales.x / 2, 0.5, 5);
  },
  [LabelPosition.Top]: ({ infoLabelScales }) => {
    const groundedPieceLabelOffsetY = 1.5;
    return new Vector3(0, groundedPieceLabelOffsetY + infoLabelScales.y / 2, 5);
  },
};

type InfoLabelTailRotationZMap = Record<LabelPositionType, () => number>;

const infoLabelTailRotationZStrategies: InfoLabelTailRotationZMap = {
  [LabelPosition.LeftSided]: () => math.degreesToRadians(90),
  [LabelPosition.RightSided]: () => math.degreesToRadians(-90),
  [LabelPosition.RightSidedCorner]: () => math.degreesToRadians(-26.56),
  [LabelPosition.Top]: () => 0,
};

type InfoLabelTailOffsetParams = {
  infoLabelOffset: Vector3Type;
  infoLabelScales: Scales;
  infoLabelTransformerDesiredScales: Scales;
  infoLabelTailDesiredScales: Scales;
};

type InfoLabelTailOffsetMap = Record<
  LabelPositionType,
  (params: InfoLabelTailOffsetParams) => Vector3Type
>;

const infoLabelTailOffsetStrategies: InfoLabelTailOffsetMap = {
  [LabelPosition.LeftSided]: ({
    infoLabelOffset,
    infoLabelScales,
    infoLabelTransformerDesiredScales,
    infoLabelTailDesiredScales,
  }) => {
    return new Vector3(
      infoLabelOffset.x +
        infoLabelScales.x / 2 / infoLabelTransformerDesiredScales.x +
        infoLabelTailDesiredScales.x / 2,
      infoLabelOffset.y,
      infoLabelOffset.z
    );
  },
  [LabelPosition.RightSided]: ({
    infoLabelOffset,
    infoLabelScales,
    infoLabelTransformerDesiredScales,
    infoLabelTailDesiredScales,
  }) => {
    return new Vector3(
      infoLabelOffset.x -
        infoLabelScales.x / 2 / infoLabelTransformerDesiredScales.x -
        infoLabelTailDesiredScales.x / 2,
      infoLabelOffset.y,
      infoLabelOffset.z
    );
  },
  [LabelPosition.RightSidedCorner]: ({
    infoLabelOffset,
    infoLabelScales,
    infoLabelTransformerDesiredScales,
    infoLabelTailDesiredScales,
  }) => {
    return new Vector3(
      infoLabelOffset.x -
        infoLabelScales.x / 2 / infoLabelTransformerDesiredScales.x +
        infoLabelTailDesiredScales.x,
      infoLabelOffset.y -
        infoLabelScales.y / 2 / infoLabelTransformerDesiredScales.y,
      infoLabelOffset.z
    );
  },
  [LabelPosition.Top]: ({
    infoLabelOffset,
    infoLabelScales,
    infoLabelTailDesiredScales,
  }) => {
    return new Vector3(
      0,
      infoLabelOffset.y -
        infoLabelScales.y / 2 -
        infoLabelTailDesiredScales.y / 2,
      infoLabelOffset.z
    );
  },
};

type ComputeInfoLabelDateOffsetType = (params: {
  infoLabelOffset: Vector3Type;
  infoLabelScales: Scales;
  infoLabelTransformerDesiredScales: Scales;
  dateFormat: LabelDateFormatType;
  relativeDateScalesX: number;
  absoluteDateScalesX: number;
  dateGap: { x: number; y: number };
  infoLabelDateScales: Scales;
}) => Vector3Type;

export const GetDialogBotScaleY: GetDialogBotScaleYType = ({
  scaleXLimit,
  line,
  paddingX = 0,
  paddingY = 0,
  fontSize = 1.94,
  font,
}) => {
  let amountOfLines = 1;
  let scaleX = 0;
  let finalScaleX = 0;
  const labelHeight = font.common.lineHeight;
  const newScaleXLimit = scaleXLimit - paddingX;
  let currentWordScaleX = 0;

  for (let i = 0; i < line.length; i++) {
    const charCode = line.charCodeAt(i);

    const charData = font.chars.find((c) => c.id === charCode);

    if (charData) {
      const charScaleX = charData.xadvance * fontSize * 0.0102;

      if (charCode === 10) {
        // Character is a line break

        amountOfLines++;
        scaleX = 0;
        currentWordScaleX = 0;
        continue;
      } else {
        if (charCode === 32) {
          // Character is a space

          if (scaleX === 0 && amountOfLines > 1) {
            continue;
          }

          currentWordScaleX = 0;
          if (scaleX + charScaleX > newScaleXLimit) {
            amountOfLines++;
            scaleX = 0;
            continue;
          } else {
            scaleX += charScaleX;
            finalScaleX =
              scaleX > finalScaleX
                ? Math.min(scaleX, newScaleXLimit)
                : finalScaleX;
          }
        } else {
          // Character is not a space

          currentWordScaleX += charScaleX;

          if (i + 1 >= line.length || line.charCodeAt(i + 1) === 32) {
            // This is the final character

            if (scaleX + currentWordScaleX > newScaleXLimit) {
              amountOfLines++;
              scaleX = 0;
            }
            scaleX += currentWordScaleX;
            finalScaleX =
              scaleX > finalScaleX
                ? Math.min(scaleX, newScaleXLimit)
                : finalScaleX;
            currentWordScaleX = 0;
          }
        }
      }
    }
  }
  const scaleY = labelHeight * fontSize * 0.0102 * amountOfLines + paddingY;
  return { scaleX: finalScaleX, scaleY };
};

export const GetExplodedViewBooksPositions: GetExplodedViewBooksPositionsType =
  ({ booksScalesZ, sectionExplodedViewScaleZ }) => {
    const totalScaleZ = booksScalesZ.reduce((sum, scaleZ) => sum + scaleZ, 0);

    const gaps = booksScalesZ.length - 1;
    const gapSize =
      gaps > 0 ? (sectionExplodedViewScaleZ - totalScaleZ) / gaps : 0;

    let position = 0;

    return booksScalesZ.map((scaleZ) => {
      const bookPosition = position / sectionExplodedViewScaleZ;
      position += gapSize + scaleZ;
      return bookPosition;
    });
  };

export const computeNotificationDirection: ComputeNotificationDirectionType = (
  cameraRotationZ
) => {
  cameraRotationZ = (cameraRotationZ - Math.PI / 2) % (Math.PI * 2);

  if (cameraRotationZ < 0) cameraRotationZ += Math.PI * 2;

  return cameraRotationZ > Math.PI ? new Vector2(1, 1) : new Vector2(-1, -1);
};

export const ComputeInfoLabelTransformerDesiredPosition: ComputeInfoLabelTransformerDesiredPositionType =
  ({
    positioning,
    piecePosition,
    pieceScales,
    infoLabelTransformerDesiredScales,
    transformerPosition,
  }) => {
    return infoLabelTransformerPositionStrategies[positioning]({
      piecePosition,
      pieceScales,
      infoLabelTransformerDesiredScales,
      transformerPosition,
    });
  };

export const ComputeInfoLabelOffset: ComputeInfoLabelOffsetType = ({
  positioning,
  radialVector,
  infoLabelOffsetMargin,
  infoLabelScales,
  infoLabelTailDesiredScales,
}) => {
  return infoLabelOffsetStrategies[positioning]({
    radialVector,
    infoLabelOffsetMargin,
    infoLabelScales,
    infoLabelTailDesiredScales,
  });
};

export const ComputeInfoLabelTailRotationZ: ComputeInfoLabelTailRotationZType =
  (positioning) => {
    return infoLabelTailRotationZStrategies[positioning]();
  };

export const ComputeInfoLabelTailOffset: ComputeInfoLabelTailOffsetType = ({
  positioning,
  infoLabelTransformerDesiredScales,
  infoLabelScales,
  infoLabelTailDesiredScales,
  infoLabelOffset,
}) => {
  return infoLabelTailOffsetStrategies[positioning]({
    infoLabelOffset,
    infoLabelScales,
    infoLabelTransformerDesiredScales,
    infoLabelTailDesiredScales,
  });
};

export const ComputeInfoLabelDateOffset: ComputeInfoLabelDateOffsetType = ({
  infoLabelOffset,
  infoLabelScales,
  infoLabelTransformerDesiredScales,
  dateFormat,
  relativeDateScalesX,
  absoluteDateScalesX,
  dateGap,
  infoLabelDateScales,
}) => {
  return new Vector3(
    infoLabelOffset.x +
      infoLabelScales.x / 2 / infoLabelTransformerDesiredScales.x -
      (dateFormat === LabelDateFormat.Relative
        ? relativeDateScalesX
        : absoluteDateScalesX) /
        2 -
      dateGap.x,
    infoLabelOffset.y +
      infoLabelScales.y / 2 +
      infoLabelDateScales.y / 2 +
      dateGap.y,
    infoLabelOffset.z + 1
  );
};

export const GetLabelFormAddress: (
  labelAspectRatio: number,
  formAddresses: DialogBoxFormAddressesType
) => DialogBoxFormAddressesType[keyof DialogBoxFormAddressesType] = (
  labelAspectRatio,
  formAddresses
) => {
  const aspectRatios = Object.keys(formAddresses).map(Number) as Array<
    keyof DialogBoxFormAddressesType
  >;
  const closestFormAddressAspectRatio: keyof DialogBoxFormAddressesType =
    ClosestNumber({
      arr: aspectRatios,
      input: labelAspectRatio,
    }) as keyof DialogBoxFormAddressesType;
  return formAddresses[closestFormAddressAspectRatio];
};
