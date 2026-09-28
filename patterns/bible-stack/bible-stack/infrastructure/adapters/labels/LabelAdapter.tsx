import {
  GetDialogBotScaleY,
  GetLabelFormAddress,
  ComputeInfoLabelDateOffset,
  ComputeInfoLabelTransformerDesiredPosition,
  ComputeInfoLabelOffset,
  ComputeInfoLabelTailRotationZ,
  ComputeInfoLabelTailOffset,
} from "../../functions/layout";
import { ApplyStrictMod, GetBotScales } from "../../functions/casualos";
import { BiblePieces } from "../../../domain/models/canvas";
import {
  LabelDateFormats,
  type LabelPosition,
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
import type { LabelsConfigProvider } from "../../config/labels/LabelsConfigProvider";
import type { VisualStateRegistry } from "../stacks/VisualStateRegistry";

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
  labelConfigProviderPort: LabelsConfigProvider;
  dimensionProviderPort: DimensionProviderPort;
  infoLabelTextMapperPort: InfoLabelTextMapperPort;
  pieceMapperPort: PieceMapperPort;
  infoLabelTransformerMapperPort: InfoLabelTransformerMapper;
  infoLabelTailMapperPort: InfoLabelTailMapper;
  infoLabelDateMapperPort: InfoLabelDateMapper;
  visualStateRegistry: VisualStateRegistry;
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
  #visualStateRegistry: ServiceParams["visualStateRegistry"];

  constructor({
    objectPooler,
    labelConfigProviderPort,
    dimensionProviderPort,
    infoLabelTextMapperPort,
    pieceMapperPort,
    infoLabelTransformerMapperPort,
    infoLabelTailMapperPort,
    infoLabelDateMapperPort,
    visualStateRegistry,
  }: ServiceParams) {
    this.#objectPooler = objectPooler;
    this.#labelConfigProviderPort = labelConfigProviderPort;
    this.#dimensionProviderPort = dimensionProviderPort;
    this.#infoLabelTextMapperPort = infoLabelTextMapperPort;
    this.#pieceMapperPort = pieceMapperPort;
    this.#infoLabelTransformerMapperPort = infoLabelTransformerMapperPort;
    this.#infoLabelTailMapperPort = infoLabelTailMapperPort;
    this.#infoLabelDateMapperPort = infoLabelDateMapperPort;
    this.#visualStateRegistry = visualStateRegistry;
  }

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
    const scaleYConfig = {
      scaleXLimit: this.#labelConfigProviderPort.getMeasurement("ScaleXLimit"),
      line: label,
      paddingX: this.#labelConfigProviderPort.getMeasurement("PaddingX"),
      paddingY: this.#labelConfigProviderPort.getMeasurement("PaddingY"),
      font: this.#labelConfigProviderPort.getFontData("Roboto"),
    };
    const { scaleY } = GetDialogBotScaleY(scaleYConfig);
    const infoLabelScales = {
      x: this.#labelConfigProviderPort.getMeasurement("ScaleXLimit"),
      y: scaleY,
      z: this.#labelConfigProviderPort.getMeasurement("TextScaleZ"),
    };
    const infoLabelAspectRatio = infoLabelScales.x / infoLabelScales.y;
    const infoLabelFormAddress = GetLabelFormAddress(
      infoLabelAspectRatio,
      this.#labelConfigProviderPort.getDialogBoxFormAddresses()
    );
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
    const infoLabelTransformerDesiredScales =
      this.#labelConfigProviderPort.getTransformerDesiredScales();
    const radialVector = new Vector2(pieceScales.x / 2, pieceScales.y / 2);
    const infoLabelTailDesiredScales = {
      x:
        this.#labelConfigProviderPort.getMeasurement("TailDesiredScaleX") /
        infoLabelTransformerDesiredScales.x,
      y:
        this.#labelConfigProviderPort.getMeasurement("TailDesiredScaleY") /
        infoLabelTransformerDesiredScales.y,
      z:
        this.#labelConfigProviderPort.getMeasurement("TailDesiredScaleZ") /
        infoLabelTransformerDesiredScales.z,
    };
    const dateGap = {
      x: this.#labelConfigProviderPort.getMeasurement("DateGapX"),
      y: this.#labelConfigProviderPort.getMeasurement("DateGapY"),
    };

    const infoLabelOffset = ComputeInfoLabelOffset({
      positioning: labelPositioning,
      radialVector,
      infoLabelOffsetMargin:
        this.#labelConfigProviderPort.getMeasurement("TextOffsetMargin"),
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

    let infoLabelDateDomain: Piece<"InfoLabelDate"> | undefined = undefined;
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
          y:
            this.#labelConfigProviderPort.getMeasurement("DateDesiredScaleY") /
            infoLabelTransformerDesiredScales.y,
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
          ownerBotId: piece.id,
        };
        infoLabelDateDomain = this.#pieceMapperPort.toDomain(infoLabelDate);
        ApplyStrictMod(infoLabelDate, infoLabelDateMod);
        this.#visualStateRegistry.registerState({
          piece: infoLabelDateDomain,
          state: {
            initialPosition: infoLabelDateOffset,
          },
        });
      }
    }

    const infoLabelTransformerMod: Partial<InfoLabelTransformerTags> = {
      [dimension]: true,
      scaleX: infoLabelTransformerDesiredScales.x,
      scaleY: infoLabelTransformerDesiredScales.y,
      scaleZ: infoLabelTransformerDesiredScales.z,
      ownerBotId: piece.id,
      ownerBotType: piece.type,
    };
    const infoLabelMod: Partial<InfoLabelTextTags> = {
      [dimension]: true,
      [dimension + "X"]: infoLabelOffset.x,
      [dimension + "Y"]: infoLabelOffset.y,
      [dimension + "Z"]: infoLabelOffset.z,
      label,
      transformer: getID(infoLabelTransformer),
      scaleX: infoLabelScales.x / infoLabelTransformerDesiredScales.x,
      scaleY: infoLabelScales.y / infoLabelTransformerDesiredScales.y,
      scaleZ: infoLabelScales.z / infoLabelTransformerDesiredScales.z,
      formAddress: infoLabelFormAddress,
      color,
      labelColor,
      ownerBotId: piece.id,
    };
    const infoLabelTailMod: Partial<InfoLabelTailTags> = {
      [dimension]: true,
      [dimension + "X"]: infoLabelTailOffset.x,
      [dimension + "Y"]: infoLabelTailOffset.y,
      [dimension + "Z"]: infoLabelTailOffset.z,
      [dimension + "RotationZ"]: infoLabelTailDesiredRotationZ,
      transformer: getID(infoLabelTransformer),
      scaleX: infoLabelTailDesiredScales.x,
      scaleY: infoLabelTailDesiredScales.y,
      scaleZ: infoLabelTailDesiredScales.z,
      color,
      ownerBotId: piece.id,
    };

    ApplyStrictMod(infoLabelTransformer, infoLabelTransformerMod);
    ApplyStrictMod(infoLabelText, infoLabelMod);
    ApplyStrictMod(infoLabelTail, infoLabelTailMod);

    // setTagMask([infoLabelText], "formOpacity", 0);
    const piecesToSetOpacity: (
      | InfoLabelTailBot
      | InfoLabelTextBot
      | InfoLabelDateBot
    )[] = [infoLabelText, infoLabelTail];
    if (infoLabelDate) {
      piecesToSetOpacity.push(infoLabelDate);
    }
    // setTagMask(piecesToSetOpacity, "labelOpacity", 0);

    const infoLabelTransformerDomain =
      this.#pieceMapperPort.toDomain(infoLabelTransformer);
    const infoLabelTailDomain = this.#pieceMapperPort.toDomain(infoLabelTail);
    const infoLabelTextDomain = this.#pieceMapperPort.toDomain(infoLabelText);

    this.#visualStateRegistry.registerState({
      piece: infoLabelTransformerDomain,
      state: {
        makesAttentionFeedback,
        targetOpacity:
          this.#labelConfigProviderPort.getOpacity(translucencyMode),
        isInteractable,
      },
    });
    this.#visualStateRegistry.registerState({
      piece: infoLabelTailDomain,
      state: {
        initialPosition: infoLabelTailOffset,
      },
    });
    this.#visualStateRegistry.registerState({
      piece: infoLabelTextDomain,
      state: {
        initialPosition: infoLabelOffset,
      },
    });

    this.locateLabel({
      positioning: labelPositioning,
      piece,
      infoLabelTransformer: infoLabelTransformerDomain,
    });

    return {
      transformer: infoLabelTransformerDomain,
      tail: infoLabelTailDomain,
      label: infoLabelTextDomain,
      date: infoLabelDateDomain,
    };
  };

  locateLabel({
    positioning,
    piece,
    infoLabelTransformer,
  }: {
    positioning: LabelPosition;
    piece: Piece;
    infoLabelTransformer: Piece<"InfoLabelTransformer">;
  }) {
    const dimension = this.#dimensionProviderPort.getDimension();
    const pieceBot = this.#pieceMapperPort.toInfrastructure(piece);
    if (!pieceBot) {
      throw new Error(`LabelAdapter: pieceBot not found at spawnLabelForPiece`);
    }
    const transformer = pieceBot.tags.transformer
      ? getBot(byID(pieceBot.tags.transformer))
      : null;
    const transformerOffset =
      this.#labelConfigProviderPort.getTransformerOffset();
    const transformerPosition = transformer
      ? getBotPosition(transformer, dimension).add(transformerOffset)
      : new Vector3(0, 0, 0);
    const piecePosition = getBotPosition(pieceBot, dimension);
    const pieceScales = GetBotScales(pieceBot);
    const infoLabelTransformerDesiredScales =
      this.#labelConfigProviderPort.getTransformerDesiredScales();
    const transformerBot =
      this.#infoLabelTransformerMapperPort.toInfrastructure(
        infoLabelTransformer
      );

    if (!transformerBot) {
      throw new Error("LabelAdapter: transformerBot not found");
    }

    const infoLabelTransformerDesiredPosition =
      ComputeInfoLabelTransformerDesiredPosition({
        positioning,
        piecePosition,
        pieceScales,
        infoLabelTransformerDesiredScales,
        transformerPosition,
      });

    ApplyStrictMod(transformerBot, {
      [dimension + "X"]: infoLabelTransformerDesiredPosition.x,
      [dimension + "Y"]: infoLabelTransformerDesiredPosition.y,
      [dimension + "Z"]: infoLabelTransformerDesiredPosition.z,
    });
  }

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
