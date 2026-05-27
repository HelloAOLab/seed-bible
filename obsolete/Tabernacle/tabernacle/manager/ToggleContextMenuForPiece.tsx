const { key, versesInChapter, versesInOtherChapters } = that;

const dimension = os.getCurrentDimension();

const piece = getBot(byTag("key", key));
const piecePosition = getBotPosition(piece, dimension);
const currContextMenuTransformer = getBot(
  "isTabernaclePieceContextMenuTransformer",
  true
);
const menuPadding = 0.25;
const menuGap = 0.25;
const menuMarginBottom = 3;
const menuLineScaleX = 5;
const menuLineScaleY = 1;
const menuScaleX = menuLineScaleX + menuPadding * 2;
const menuLinesPositionZ = -0.95;

const baseMenuLineTags = {
  space: "tempLocal",
  draggable: false,
  isTabernacleContextMenuLine: true,
  [dimension]: true,
  [dimension + "X"]: 0,
  [dimension + "Z"]: menuLinesPositionZ,
  scaleX: menuLineScaleX,
  scaleY: menuLineScaleY,
  scaleZ: 0,
};
const baseMenuOptionTags = {
  ...baseMenuLineTags,
  labelColor: "#1C1917",
  onPointerEnter: `@setTag(thisBot, "color", "#cacaca")`,
  onPointerExit: `@setTag(thisBot, "color", "white")`,
  onClick: `@globalThis.TabernacleManager.TryHideCurrentPieceContextMenu();
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
    pointable: false,
    [dimension]: true,
    color: "clear",
    orientationMode: "billboard",
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

  for (const versePath of versesInChapter) {
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

  if (versesInChapter.length > 0 && versesInOtherChapters.length > 0) {
    const divider = create({
      space: "tempLocal",
      draggable: false,
      [dimension]: true,
      [dimension + "X"]: 0,
      [dimension + "Z"]: menuLinesPositionZ,
      scaleX: menuLineScaleX - menuPadding * 2,
      scaleY: 0.05,
      scaleZ: 0,
      color: "#1C1917",
    });
    lines.push(divider);
  }

  for (const versePath of versesInOtherChapters) {
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
    pointable: false,
    [dimension]: true,
    [dimension + "X"]: 0,
    [dimension + "Z"]: -1,
    transformer: menuTransformer.id,
    scaleX: menuScaleX,
    scaleZ: 0,
  }));
  const linesAccumulatedScaleY = lines.reduce((acc, line) => {
    return acc + line.tags.scaleY;
  }, 0);
  const menuScaleY = linesAccumulatedScaleY + (lines.length + 1) * menuGap;
  const menuPositionY = 0;
  const menuMod = {
    scaleY: menuScaleY,
    [dimension + "Y"]: menuPositionY,
  };
  applyMod(menu, menuMod);

  let currLinePositionY = menuScaleY / 2;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    currLinePositionY -= line.tags.scaleY / 2 + menuGap;

    const lineMod = {
      transformer: menuTransformer.id,
      [dimension + "Y"]: currLinePositionY,
    };

    applyMod(line, lineMod);

    currLinePositionY -= line.tags.scaleY / 2;
  }

  const menuTransformerMod = {
    [dimension + "X"]: piecePosition.x,
    [dimension + "Y"]: piecePosition.y,
    [dimension + "Z"]:
      piecePosition.z +
      (piece.tags.scale ?? 1) / 2 +
      menuMarginBottom +
      menuScaleY / 2,
    key,
  };
  applyMod(menuTransformer, menuTransformerMod);
}
