const { key, versesInChapter, versesInOtherChapters } = that;

const dimension = os.getCurrentDimension();

const piece = getBot(byTag("key", key));
const piecePosition = getBotPosition(piece, dimension);
const currContextMenuTransformer = getBot(
  "isTabernaclePieceContextMenuTransformer",
  true
);
const menuPadding = 0.25;
const menuMarginBottom = 3;
const menuLineScaleX = 5;
const menuLineScaleY = 1;
const menuScaleX = menuLineScaleX + menuPadding * 2;

const baseMenuLineTags = {
  space: "tempLocal",
  isTabernacleContextMenuLine: true,
  [dimension]: true,
  [dimension + "X"]: 0,
  [dimension + "Z"]: -0.95,
  scaleX: menuLineScaleX,
  scaleY: menuLineScaleY,
  scaleZ: 0,
};
const baseMenuOptionTags = {
  ...baseMenuLineTags,
  onPointerEnter: `@setTag(thisBot, "color", "#959595")`,
  onPointerExit: `@setTag(thisBot, "color", "white")`,
  onClick: `@
if(globalThis.TabernacleManager.vars.currentBookId !== thisBot.tags.bookId || Number(globalThis.TabernacleManager.vars.currentChapter) !== Number(thisBot.tags.chapter))
{
    await globalThis.Open(thisBot.tags.bookId, thisBot.tags.chapter);
    await os.sleep(100);
}
globalThis.TabernacleScrollToVerse(thisBot.tags.verse)`,
};

if (currContextMenuTransformer) {
  if (currContextMenuTransformer.tags.key === key) {
    destroy(currContextMenuTransformer);
  } else {
    AdjustContextMenu(currContextMenuTransformer);
  }
} else {
  const newMenuTransformer = create({
    isTabernaclePieceContextMenuTransformer: true,
    space: "tempLocal",
    [dimension]: true,
    color: "clear",
    orientationMode: "billboardTop",
    onDestroy: `@destroy(thisBot.vars.lines);
destroy(thisBot.vars.menu)`,
  });
  AdjustContextMenu(newMenuTransformer);
}

function AdjustContextMenu(menuTransformer) {
  const lines = [];
  const title = create({
    ...baseMenuLineTags,
    label: thisBot.GetFixedTitle(key),
  });
  lines.push(title);

  for (const versePath of [...versesInChapter, ...versesInOtherChapters]) {
    const { bookId, chapter, verse } = versePath;
    const label = `${bookId} ${chapter}:${verse}`;
    const option = create({
      ...baseMenuOptionTags,
      label,
      bookId,
      chapter,
      verse,
    });
    lines.push(option);
  }

  destroy(menuTransformer.vars.lines);
  menuTransformer.vars.lines = lines;

  const menu = (menuTransformer.vars.menu ??= create({
    space: "tempLocal",
    [dimension]: true,
    [dimension + "X"]: 0,
    [dimension + "Z"]: -1,
    transformer: menuTransformer.id,
    scaleX: menuScaleX,
    scaleZ: 0,
  }));
  const menuScaleY =
    lines.length * menuLineScaleY + (lines.length + 1) * menuPadding;
  const menuPositionY = menuMarginBottom + menuScaleY / 2;
  const menuMod = {
    scaleY: menuScaleY,
    [dimension + "Y"]: menuPositionY,
  };
  applyMod(menu, menuMod);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const positionY =
      menuScaleY +
      menuMarginBottom -
      menuLineScaleY / 2 -
      menuPadding -
      lineIndex * (menuLineScaleY + menuPadding);

    const lineMod = {
      transformer: menuTransformer.id,
      [dimension + "Y"]: positionY,
    };

    applyMod(line, lineMod);
  }

  const menuTransformerMod = {
    [dimension + "X"]: piecePosition.x,
    [dimension + "Y"]: piecePosition.y,
    [dimension + "Z"]: piecePosition.z + (piece.tags.scale ?? 1) / 2,
    key,
  };
  applyMod(menuTransformer, menuTransformerMod);
}
