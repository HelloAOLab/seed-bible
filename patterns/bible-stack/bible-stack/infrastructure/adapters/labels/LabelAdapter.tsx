import {
  GetDialogBotScaleY,
  GetLabelFormAddress,
  ComputeInfoLabelDateOffset,
  ComputeInfoLabelTransformerDesiredPosition,
  ComputeInfoLabelOffset,
  ComputeInfoLabelTailRotationZ,
  ComputeInfoLabelTailOffset,
} from "../../functions/layout";
import { GetBotScales } from "../../functions/casualos";
import { BiblePieces } from "../../../domain/models/canvas";
import {
  LabelDateFormats,
  LabelTranslucencyModes,
} from "../../../domain/models/label";
import type { PieceMapperPort } from "../../mappers/PieceMapper";
import type {
  InfoLabelDateBot,
  InfoLabelDateTags,
  InfoLabelTailBot,
  InfoLabelTailTags,
  InfoLabelTextBot,
  InfoLabelTextTags,
  InfoLabelTransformerTags,
} from "../../models/stack";
import type { BibleStackObjectPoolerMap } from "../../models/objectPooler";
import type { LabelAdapterPort } from "../../../application/ports/out/PieceLabel";
import type { ObjectPooler } from "../environment/ObjectPooler";
import type { InfoLabelTransformerMapper } from "../../mappers/InfoLabelTransformerMapper";
import type { InfoLabelTailMapper } from "../../mappers/InfoLabelTailMapper";
import type { Piece } from "../../../domain/models/canvas";
import type { InfoLabelDateMapper } from "../../mappers/InfoLabelDateMapper";
import type {
  FontData,
  FontName,
} from "../../config/labels/LabelsConfigProvider";
import type { DialogBoxFormAddress } from "../../config/labels/formAddresses";
import type { LabelDateConfig } from "../../config/labels/date";

interface LabelConfigProviderPort {
  getFontData: (font: FontName) => FontData;
  getDialogBoxFormAddresses: () => DialogBoxFormAddress;
  getDateConfig: <K extends keyof LabelDateConfig>(
    key: K
  ) => LabelDateConfig[K];
}

interface DimensionProviderPort {
  getDimension(): string;
}

interface InfoLabelTextMapperPort {
  toInfrastructure: (
    piece: Piece<"InfoLabelText">
  ) => InfoLabelTextBot | undefined;
}

interface ServiceParams {
  objectPooler: ObjectPooler<BibleStackObjectPoolerMap>;
  labelConfigProviderPort: LabelConfigProviderPort;
  dimensionProviderPort: DimensionProviderPort;
  infoLabelTextMapperPort: InfoLabelTextMapperPort;
  pieceMapperPort: PieceMapperPort;
  infoLabelTransformerMapperPort: InfoLabelTransformerMapper;
  infoLabelTailMapperPort: InfoLabelTailMapper;
  infoLabelDateMapperPort: InfoLabelDateMapper;
}

export class LabelAdapter implements LabelAdapterPort {
  #objectPooler: ServiceParams["objectPooler"];
  #labelConfigProviderPort: ServiceParams["labelConfigProviderPort"];
  #dimensionProviderPort: DimensionProviderPort;
  #infoLabelTextMapperPort: InfoLabelTextMapperPort;
  #pieceMapperPort: ServiceParams["pieceMapperPort"];
  #infoLabelTransformerMapperPort: ServiceParams["infoLabelTransformerMapperPort"];
  #infoLabelTailMapperPort: ServiceParams["infoLabelTailMapperPort"];
  #infoLabelDateMapperPort: ServiceParams["infoLabelDateMapperPort"];
  constructor({
    objectPooler,
    labelConfigProviderPort,
    dimensionProviderPort,
    infoLabelTextMapperPort,
    pieceMapperPort,
    infoLabelTransformerMapperPort,
    infoLabelTailMapperPort,
    infoLabelDateMapperPort,
  }: ServiceParams) {
    this.#objectPooler = objectPooler;
    this.#labelConfigProviderPort = labelConfigProviderPort;
    this.#dimensionProviderPort = dimensionProviderPort;
    this.#infoLabelTextMapperPort = infoLabelTextMapperPort;
    this.#pieceMapperPort = pieceMapperPort;
    this.#infoLabelTransformerMapperPort = infoLabelTransformerMapperPort;
    this.#infoLabelTailMapperPort = infoLabelTailMapperPort;
    this.#infoLabelDateMapperPort = infoLabelDateMapperPort;
  }

  #opacityMap = {
    [LabelTranslucencyModes.Faded]: 0.5,
    [LabelTranslucencyModes.Solid]: 1,
  };

  spawnLabel: LabelAdapterPort["spawnLabel"] = ({
    piece,
    label,
    date,
    color,
    labelColor,
    labelPositioning,
    isInteractable = true,
    dateFormat,
    translucencyMode,
    makesAttentionFeedback,
  }) => {
    const dimension = this.#dimensionProviderPort.getDimension();
    const pieceBot = this.#pieceMapperPort.toInfrastructure(piece);
    if (!pieceBot) {
      throw new Error(`LabelAdapter: pieceBot not found at spawnLabelForPiece`);
    }
    const { scaleY } = GetDialogBotScaleY({
      scaleXLimit: 5,
      line: label,
      paddingX: 0.4,
      paddingY: 0.4,
      font: this.#labelConfigProviderPort.getFontData("Roboto"),
    });
    const infoLabelScales = { x: 5, y: scaleY, z: 1 };
    const infoLabelAspectRatio = infoLabelScales.x / infoLabelScales.y;
    const infoLabelFormAddress = GetLabelFormAddress(
      infoLabelAspectRatio,
      this.#labelConfigProviderPort.getDialogBoxFormAddresses()
    );
    const transformer = pieceBot.tags.transformer
      ? getBot(byID(pieceBot.tags.transformer))
      : null;
    const transformerOffset = new Vector3(0, 0, 1);
    const transformerPosition = transformer
      ? getBotPosition(transformer, dimension).add(transformerOffset)
      : new Vector3(0, 0, 0);
    const piecePosition = getBotPosition(pieceBot, dimension);
    const pieceScales = GetBotScales(pieceBot);
    const infoLabelTransformer = this.#objectPooler.getObject(
      BiblePieces.InfoLabelTransformer
    );
    const infoLabelText = this.#objectPooler.getObject(
      BiblePieces.InfoLabelText
    );
    const infoLabelTail = this.#objectPooler.getObject(
      BiblePieces.InfoLabelTail
    );
    let infoLabelDate: InfoLabelDateBot | undefined;
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
      infoLabelDate = this.#objectPooler.getObject(BiblePieces.InfoLabelDate);
      if (infoLabelDate) {
        const infoLabelDateScales = GetBotScales(infoLabelDate);
        const infoLabelDateDesiredScales = {
          x:
            dateFormat === LabelDateFormats.Relative
              ? this.#labelConfigProviderPort.getDateConfig(
                  "relativeDateScales"
                ).x
              : this.#labelConfigProviderPort.getDateConfig(
                  "absoluteDateScales"
                ).x,
          y: 0.375 / infoLabelTransformerDesiredScales.y,
          z: infoLabelScales.z / infoLabelTransformerDesiredScales.z,
        };
        const infoLabelDateOffset = ComputeInfoLabelDateOffset({
          infoLabelOffset,
          infoLabelScales,
          infoLabelTransformerDesiredScales,
          dateFormat: dateFormat,
          relativeDateScalesX:
            this.#labelConfigProviderPort.getDateConfig("relativeDateScales").x,
          absoluteDateScalesX:
            this.#labelConfigProviderPort.getDateConfig("absoluteDateScales").x,
          dateGap,
          infoLabelDateScales,
        });
        const infoLabelDateMod: Partial<InfoLabelDateTags> = {
          [dimension]: true,
          [dimension + "X"]: infoLabelDateOffset.x,
          [dimension + "Y"]: infoLabelDateOffset.y,
          [dimension + "Z"]: infoLabelDateOffset.z,
          initialPosition: infoLabelDateOffset,
          transformer: getID(infoLabelTransformer),
          label: date,
          color,
          formAddress:
            dateFormat === LabelDateFormats.Relative
              ? this.#labelConfigProviderPort.getDateConfig(
                  "relativeDateFormAddress"
                )
              : this.#labelConfigProviderPort.getDateConfig(
                  "absoluteDateFormAddress"
                ),
          scaleX: infoLabelDateDesiredScales.x,
          scaleY: infoLabelDateDesiredScales.y,
          scaleZ: infoLabelDateDesiredScales.z,
          labelColor,
          formOpacity: 0,
          ownerBotId: piece.id,
        };
        applyMod(infoLabelDate, infoLabelDateMod);
      }
    }

    const infoLabelTransformerMod: Partial<InfoLabelTransformerTags> = {
      [dimension]: true,
      [dimension + "X"]: infoLabelTransformerDesiredPosition.x,
      [dimension + "Y"]: infoLabelTransformerDesiredPosition.y,
      [dimension + "Z"]: infoLabelTransformerDesiredPosition.z,
      scaleX: infoLabelTransformerDesiredScales.x,
      scaleY: infoLabelTransformerDesiredScales.y,
      scaleZ: infoLabelTransformerDesiredScales.z,
      ownerBotId: piece.id,
      isAnimatable: makesAttentionFeedback,
      targetOpacity: this.#opacityMap[translucencyMode],
      pointableDefault: isInteractable,
    };
    const infoLabelMod: Partial<InfoLabelTextTags> = {
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
      ownerBotId: piece.id,
    };
    const infoLabelTailMod: Partial<InfoLabelTailTags> = {
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
      ownerBotId: piece.id,
    };
    applyMod(infoLabelTransformer, infoLabelTransformerMod);
    applyMod(infoLabelText, infoLabelMod);
    applyMod(infoLabelTail, infoLabelTailMod);

    setTagMask([infoLabelText], "formOpacity", 0);
    const piecesToSetOpacity: (
      | InfoLabelTailBot
      | InfoLabelTextBot
      | InfoLabelDateBot
    )[] = [infoLabelText, infoLabelTail];
    if (infoLabelDate) {
      piecesToSetOpacity.push(infoLabelDate);
    }
    setTagMask(piecesToSetOpacity, "labelOpacity", 0);

    return {
      transformer: this.#pieceMapperPort.toDomain(infoLabelTransformer),
      tail: this.#pieceMapperPort.toDomain(infoLabelTail),
      label: this.#pieceMapperPort.toDomain(infoLabelText),
      date: infoLabelDate
        ? this.#pieceMapperPort.toDomain(infoLabelDate)
        : undefined,
    };
  };

  despawnLabel: LabelAdapterPort["despawnLabel"] = (data) => {
    const transformer = this.#infoLabelTransformerMapperPort.toInfrastructure(
      data.transformer
    );
    const tail = this.#infoLabelTailMapperPort.toInfrastructure(data.tail);
    const text = this.#infoLabelTextMapperPort.toInfrastructure(data.label);
    if (!transformer || !tail || !text) {
      throw new Error(
        `LabelAdapter: required bots not found at despawnLabelForPiece.`
      );
    }
    this.#objectPooler.releaseObject(
      transformer,
      BiblePieces.InfoLabelTransformer
    );
    this.#objectPooler.releaseObject(tail, BiblePieces.InfoLabelTail);
    this.#objectPooler.releaseObject(text, BiblePieces.InfoLabelText);
    if (data.date) {
      const date = this.#infoLabelDateMapperPort.toInfrastructure(data.date);
      if (!date) {
        throw new Error(
          `LabelAdapter: date not found at despawnLabelForPiece.`
        );
      }
      this.#objectPooler.releaseObject(date, BiblePieces.InfoLabelDate);
    }
  };
}
