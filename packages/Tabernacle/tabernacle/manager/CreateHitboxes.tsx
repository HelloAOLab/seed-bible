const pieces = getBots("hitboxData");

const dimension = thisBot.tags.dimension;

for (const piece of pieces) {
  const hitboxTags = {
    ...thisBot.tags.pieceHitboxBaseData,
    [dimension]: true,
    transformer: piece.id,
    piece: `🔗${piece.id}`,
    onClick: `@shout("OnTabernacleItemClicked", {key: links.piece.tags.key})`,
  };
  const data = piece.tags.hitboxData;
  for (const key in data) {
    const value = data[key];
    if (key === "position") {
      const { x = 0, y = 0, z = 0 } = value ?? {};
      hitboxTags[`${dimension}X`] = x;
      hitboxTags[`${dimension}Y`] = y;
      hitboxTags[`${dimension}Z`] = z;
    } else {
      hitboxTags[key] = value;
    }
  }
  create({ ...hitboxTags });
}
