import {
  GetDialogBotScaleY,
  GetLabelFormAddress,
  ComputeInfoLabelDateOffset,
  ComputeInfoLabelTransformerDesiredPosition,
  ComputeInfoLabelOffset,
  ComputeInfoLabelTailRotationZ,
  ComputeInfoLabelTailOffset,
} from "bibleVizUtils.infrastructure.functions.layout";
import { GetBotScales } from "bibleVizUtils.infrastructure.functions.casualos";
import { BiblePiece } from "bibleVizUtils.domain.models.canvas";
import {
  LabelDateFormat,
  LabelTranslucencyModes,
} from "bibleVizUtils.domain.models.label";
import { PieceMapper } from "bibleVizUtils.infrastructure.mappers.PieceMapper";
import type {
  BibleVizUtilsObjectPoolerMap,
  InfoLabelDateBot,
  InfoLabelDateTags,
  InfoLabelTailBot,
  InfoLabelTailTags,
  InfoLabelTextBot,
  InfoLabelTextTags,
  InfoLabelTransformerTags,
} from "bibleVizUtils.infrastructure.models.casualos";
import { globalAPI } from "app.controller.controllerBuilder";
import type { LabelAdapterPort } from "bibleVizUtils.domain.ports.label";
import type { ObjectPooler } from "bibleVizUtils.infrastructure.adapters.casualos.ObjectPooler";
import { InfoLabelTransformerMapper } from "bibleVizUtils.infrastructure.mappers.InfoLabelTransformerMapper";
import { InfoLabelTailMapper } from "bibleVizUtils.infrastructure.mappers.InfoLabelTailMapper";
import { InfoLabelTextMapper } from "bibleVizUtils.infrastructure.mappers.InfoLabelTextMapper";
import { InfoLabelDateMapper } from "bibleVizUtils.infrastructure.mappers.InfoLabelDateMapper";
import type {
  FontData,
  FontName,
} from "bibleVizUtils.infrastructure.config.labels.LabelsConfigProvider";
import type { DialogBoxFormAddressesType } from "bibleVizUtils.infrastructure.config.labels.formAddresses";
import type { LabelDateConfigsType } from "bibleVizUtils.infrastructure.config.labels.date";

interface LabelConfigProviderPort {
  getFontData: (font: FontName) => FontData;
  getDialogBoxFormAddresses: () => DialogBoxFormAddressesType;
  getDateConfig: <K extends keyof LabelDateConfigsType>(
    key: K
  ) => LabelDateConfigsType[K];
}

interface ServiceParams {
  objectPooler: ObjectPooler<BibleVizUtilsObjectPoolerMap>;
  labelConfigProviderPort: LabelConfigProviderPort;
}

export class LabelAdapter implements LabelAdapterPort {
  #objectPooler: ServiceParams["objectPooler"];
  #labelConfigProviderPort: ServiceParams["labelConfigProviderPort"];
  constructor({ objectPooler, labelConfigProviderPort }: ServiceParams) {
    this.#objectPooler = objectPooler;
    this.#labelConfigProviderPort = labelConfigProviderPort;
  }

  #isAnimatable: boolean = true; // TODO: Define how to decide this and move its decision to the aplication layer.
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
  }) => {
    const dimension = globalAPI.defaultPortalName;
    const pieceBot = PieceMapper.toInfrastructure(piece);
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
      BiblePiece.InfoLabelTransformer
    );
    const infoLabelText = this.#objectPooler.getObject(
      BiblePiece.InfoLabelText
    );
    const infoLabelTail = this.#objectPooler.getObject(
      BiblePiece.InfoLabelTail
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
      infoLabelDate = this.#objectPooler.getObject(BiblePiece.InfoLabelDate);
      if (infoLabelDate) {
        const infoLabelDateScales = GetBotScales(infoLabelDate);
        const infoLabelDateDesiredScales = {
          x:
            dateFormat === LabelDateFormat.Relative
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
            dateFormat === LabelDateFormat.Relative
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
      isAnimatable: this.#isAnimatable,
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
      transformer: PieceMapper.toDomain(infoLabelTransformer),
      tail: PieceMapper.toDomain(infoLabelTail),
      label: PieceMapper.toDomain(infoLabelText),
      date: infoLabelDate ? PieceMapper.toDomain(infoLabelDate) : undefined,
    };
  };

  despawnLabel: LabelAdapterPort["despawnLabel"] = (data) => {
    const transformer = InfoLabelTransformerMapper.toInfrastructure(
      data.transformer
    );
    const tail = InfoLabelTailMapper.toInfrastructure(data.tail);
    const text = InfoLabelTextMapper.toInfrastructure(data.label);
    if (!transformer || !tail || !text) {
      throw new Error(
        `LabelAdapter: required bots not found at despawnLabelForPiece.`
      );
    }
    this.#objectPooler.releaseObject(
      transformer,
      BiblePiece.InfoLabelTransformer
    );
    this.#objectPooler.releaseObject(tail, BiblePiece.InfoLabelTail);
    this.#objectPooler.releaseObject(text, BiblePiece.InfoLabelText);
    if (data.date) {
      const date = InfoLabelDateMapper.toInfrastructure(data.date);
      if (!date) {
        throw new Error(
          `LabelAdapter: date not found at despawnLabelForPiece.`
        );
      }
      this.#objectPooler.releaseObject(date, BiblePiece.InfoLabelDate);
    }
  };
}
