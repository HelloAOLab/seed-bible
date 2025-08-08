const dimension = os.getCurrentDimension();
const bibleTransformerPosition = getBotPosition(thisBot.vars.platformerGameBibleData.staticBibleElements.bibleTransformer, dimension);
const characterPosition = new Vector3(bibleTransformerPosition.x, bibleTransformerPosition.y - 7, 0);
const rotationZero = new Rotation({euler: {x: 0, y: 0, z: 0}});
setTagMask(thisBot.vars.character, dimension + "X", characterPosition.x)
setTagMask(thisBot.vars.character, dimension + "Y", characterPosition.y)
setTagMask(thisBot.vars.character, dimension + "Z", characterPosition.z)
setTagMask(thisBot.vars.character, dimension + "RotationX", 0)
setTagMask(thisBot.vars.character, dimension + "RotationY", 0)
setTagMask(thisBot.vars.character, dimension + "RotationZ", 0)
setTagMask(thisBot.vars.character, dimension + "Rotation", rotationZero);