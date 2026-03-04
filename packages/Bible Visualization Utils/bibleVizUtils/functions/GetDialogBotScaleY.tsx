const { scaleXLimit, line, paddingX = 0, paddingY = 0, fontSize = 1.94 } = that;

let amountOfLines = 1;
let scaleX = 0;
let finalScaleX = 0;
const labelHeight = BibleVizUtils.Data.tags.robotoFont.common.lineHeight;
const newScaleXLimit = scaleXLimit - paddingX;
let currentWordScaleX = 0;

for (let i = 0; i < line.length; i++) {
  const charCode = line.charCodeAt(i);

  const charData = BibleVizUtils.Data.tags.robotoFont.chars.find(
    (c) => c.id === charCode
  );

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
          scaleX > finalScaleX ? Math.min(scaleX, newScaleXLimit) : finalScaleX;
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
          scaleX > finalScaleX ? Math.min(scaleX, newScaleXLimit) : finalScaleX;
        currentWordScaleX = 0;
      }
    }
  }
}
const scaleY = labelHeight * fontSize * 0.0102 * amountOfLines + paddingY;
return { scaleX: finalScaleX, scaleY };
