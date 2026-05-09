import { GetDialogBotScaleY } from "bibleVizUtils.functions.index";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import { ObjectPoolTags } from "bibleVizUtils.models.canvas";

/**
 * Displays an interactive dialog for the Bible, focusing on it and animating its associated labels.
 * @param {Object} that - The context containing properties for displaying the dialog.
 * @param {number} [that.focusDuration=1] - Duration for focusing on the Bible.
 * @param {number} [that.duration=0.15] - Duration for the fade-in animation of the dialog elements.
 * @param {Object} [that.easing={type: "sinusoidal", mode: "inout"}] - Easing configuration for the animations.
 * @param {string} [that.dialog="Click or tap!"] - The message displayed in the dialog.
 * @example
 * bibleTransformer.ShowBibleInteractDialog({focusDuration: 2, duration: 0.5, dialog: "Interact with the Bible!"});
 */

const dimension = os.getCurrentDimension();
const focusDuration = 1;
const duration = 0.15;
const easing = { type: "sinusoidal", mode: "inout" };
const dialog = "Click or tap!";
const { scaleY } = GetDialogBotScaleY({
  scaleXLimit: 5,
  line: dialog,
  paddingX: 0.4,
  paddingY: 0.4,
  font: BibleVizDataRepository.getFont("Roboto"),
});
const infoLabelDesiredScales = { x: 5, y: scaleY, z: 1 };
const infoLabelDesiredAspectRatio =
  infoLabelDesiredScales.x / infoLabelDesiredScales.y;
const closestFormAddressAspectRatio = BibleVizUtils.Functions.BiblePieceType({
  arr: BibleVizUtils.Datga.tags.dialogBoxFormAddresses.map(
    (formAddressesInfo) => {
      return formAddressesInfo.aspectRatio;
    }
  ),
  input: infoLabelDesiredAspectRatio,
});
const infoLabelDesiredFormAddress =
  BibleVizUtils.Datga.tags.dialogBoxFormAddresses.find((formAddressesInfo) => {
    return formAddressesInfo.aspectRatio === closestFormAddressAspectRatio;
  }).formAddress;
const infoLabelTransformer = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.InfoLabelTransformer,
});
const infoLabel = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.InfoLabel,
});
const infoLabelDesiredOffset = new Vector3(0, 3, 5);
const infoLabelTail = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.InfoLabelTail,
});
const infoLabelTailDesiredOffset = new Vector3(
  0,
  infoLabelDesiredOffset.y,
  infoLabelDesiredOffset.z
);
const bibleTransformerPosition = getBotPosition(thisBot, dimension);
const infoLabelTransformerDesiredScales = { x: 1, y: 1, z: 1 };
const infoLabelDesiredPosition = new Vector3(
  infoLabelDesiredOffset.x,
  infoLabelDesiredOffset.y +
    infoLabelDesiredScales.y / infoLabelTransformerDesiredScales.y / 2,
  infoLabelDesiredOffset.z
);
const infoLabelTailDesiredPosition = new Vector3(
  infoLabelTailDesiredOffset.x,
  infoLabelTailDesiredOffset.y - 0.3 / infoLabelTransformerDesiredScales.y / 2,
  infoLabelTailDesiredOffset.z
);
const infoLabelTailDesiredRotationZ = 0;
const infoLabelTailDesiredScales = new Vector3(
  0.3 / infoLabelTransformerDesiredScales.x,
  0.3 / infoLabelTransformerDesiredScales.y,
  0.3 / infoLabelTransformerDesiredScales.z
);
let infoLabelTransformerMod, infoLabelMod, infoLabelTailMod;

os.focusOn(
  {
    x: thisBot.masks[dimension + "X"] ?? thisBot.tags[dimension + "X"],
    y: thisBot.masks[dimension + "Y"] ?? thisBot.tags[dimension + "Y"],
  },
  {
    duration: focusDuration,
    easing: { type: "sinusoidal", mode: "inout" },
    rotation: { x: 1.01229, y: 0.5 },
    zoom: 10,
  }
);
if (infoLabelTransformer) {
  infoLabelTransformerMod = {
    [dimension]: true,
    [dimension + "X"]: bibleTransformerPosition.x,
    [dimension + "Y"]: bibleTransformerPosition.y,
    [dimension + "Z"]: bibleTransformerPosition.z,
    scaleX: infoLabelTransformerDesiredScales.x,
    scaleY: infoLabelTransformerDesiredScales.y,
    scaleZ: infoLabelTransformerDesiredScales.z,
    ownerBotId: getID(thisBot),
    isAnimatable: true,
  };
  infoLabelTransformer.OnSpawned({ mod: infoLabelTransformerMod });
}
if (infoLabel) {
  infoLabelMod = {
    [dimension]: true,
    [dimension + "X"]: infoLabelDesiredPosition.x,
    [dimension + "Y"]: infoLabelDesiredPosition.y,
    [dimension + "Z"]: infoLabelDesiredPosition.z,
    initialPosition: infoLabelDesiredPosition,
    label: dialog,
    transformer: getID(infoLabelTransformer),
    scaleX: infoLabelDesiredScales.x / infoLabelTransformerDesiredScales.x,
    scaleY: infoLabelDesiredScales.y / infoLabelTransformerDesiredScales.y,
    scaleZ: infoLabelDesiredScales.z / infoLabelTransformerDesiredScales.z,
    formAddress: infoLabelDesiredFormAddress,
    formOpacity: 1,
    labelOpacity: 1,
    color: "white",
    labelColor: "black",
    isAside: false,
    ownerBotId: getID(thisBot),
  };
  infoLabel.OnSpawned({ mod: infoLabelMod });
}
if (infoLabelTail) {
  infoLabelTailMod = {
    [dimension]: true,
    [dimension + "X"]: infoLabelTailDesiredPosition.x,
    [dimension + "Y"]: infoLabelTailDesiredPosition.y,
    [dimension + "Z"]: infoLabelTailDesiredPosition.z,
    initialPosition: infoLabelTailDesiredPosition,
    [dimension + "RotationZ"]: infoLabelTailDesiredRotationZ,
    transformer: getID(infoLabelTransformer),
    scaleX: infoLabelTailDesiredScales.x,
    scaleY: infoLabelTailDesiredScales.y,
    scaleZ: infoLabelTailDesiredScales.z,
    formOpacity: 1,
    isAside: false,
    ownerBotId: getID(thisBot),
    color: "white",
  };
  infoLabelTail.OnSpawned({ mod: infoLabelTailMod });
}

setTagMask([infoLabel, infoLabelTail], "formOpacity", 0);
setTagMask(infoLabel, "labelOpacity", 0);

await Promise.allSettled([
  animateTag([infoLabel, infoLabelTail], "formOpacity", {
    toValue: 1,
    duration,
    easing,
  }),
  animateTag(infoLabel, "labelOpacity", {
    toValue: 1,
    duration,
    easing,
  }),
]);
