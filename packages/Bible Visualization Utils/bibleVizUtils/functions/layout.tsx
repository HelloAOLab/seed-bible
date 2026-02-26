import { type FontData } from "bibleVizUtils.data.BibleVizDataRepository";
import type { Vector2 as Vetor2Type } from "../../../../typings/AuxLibraryDefinitions";

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
type ComputeNotificationDirectionType = (cameraRotationZ: number) => Vetor2Type;

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
