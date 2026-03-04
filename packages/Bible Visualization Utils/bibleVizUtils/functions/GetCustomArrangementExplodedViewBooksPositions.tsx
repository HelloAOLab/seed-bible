const {booksScalesZ, sectionExplodedViewScaleZ} = that;

const totalScaleZ = booksScalesZ.reduce((sum, scaleZ) => sum + scaleZ, 0);

const gaps = booksScalesZ.length - 1;
const gapSize = gaps > 0 ? (sectionExplodedViewScaleZ - totalScaleZ) / gaps : 0;

let position = 0

return booksScalesZ.map(scaleZ => {
    const bookPosition = (position / sectionExplodedViewScaleZ);
    position += gapSize + scaleZ;
    return bookPosition;
});