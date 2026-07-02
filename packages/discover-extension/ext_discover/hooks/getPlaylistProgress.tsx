export function getPlaylistItemCount(item: any): number {
  if (!item) return 0;

  if (Array.isArray(item?.list) && item.list.length) {
    return item.list.reduce(
      (acc: number, nestedItem: any) => acc + getPlaylistItemCount(nestedItem),
      0
    );
  }

  const layers = item?.additionalInfo?.layers;
  if (Array.isArray(layers) && layers.length) {
    return layers.length;
  }

  return 1;
}

export function getCheckedUnitsInItem(
  item: any,
  checkedItems: Record<string, boolean> | undefined
): number {
  if (!item) return 0;

  if (Array.isArray(item?.list) && item.list.length) {
    return item.list.reduce(
      (acc: number, nestedItem: any) =>
        acc + getCheckedUnitsInItem(nestedItem, checkedItems),
      0
    );
  }

  const layers = item?.additionalInfo?.layers;
  if (Array.isArray(layers) && layers.length) {
    return layers.reduce((acc: number, layer: any) => {
      const done = !!checkedItems?.[layer.id] || !!layer.readAlready;
      return acc + (done ? 1 : 0);
    }, 0);
  }

  const done = !!checkedItems?.[item.id] || !!item.readAlready;
  return done ? 1 : 0;
}

export function getPlaylistProgress(
  playlists: Record<string, any>,
  currIndex: Record<string, any>,
  checklistEnabled?: boolean,
  checkedItems?: Record<string, boolean>
) {
  const keys = Object.keys(playlists || {}).sort(
    (a, b) => Number(a) - Number(b)
  );
  let totalItems = 0;
  let currentPosition = 0;

  keys.forEach((key) => {
    const list = playlists[key]?.list || [];
    totalItems += list.reduce(
      (acc: number, item: any) => acc + getPlaylistItemCount(item),
      0
    );
  });

  if (!checklistEnabled) {
    for (const key of keys) {
      const list = playlists[key]?.list || [];
      if (String(key) !== String(currIndex?.key)) {
        currentPosition += list.reduce(
          (acc: number, item: any) => acc + getPlaylistItemCount(item),
          0
        );
        continue;
      }

      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (i < currIndex?.index) {
          currentPosition += getPlaylistItemCount(item);
          continue;
        }

        if (i === currIndex?.index) {
          if (
            Array.isArray(item?.additionalInfo?.layers) &&
            item.additionalInfo.layers.length
          ) {
            currentPosition += Math.min(
              Math.max((currIndex?.subIndex || 0) + 1, 1),
              item.additionalInfo.layers.length
            );
          } else {
            currentPosition += 1;
          }
        }
        break;
      }
      break;
    }
  } else {
    keys.forEach((key) => {
      const list = playlists[key]?.list || [];
      currentPosition += list.reduce(
        (acc: number, item: any) =>
          acc + getCheckedUnitsInItem(item, checkedItems),
        0
      );
    });
  }

  const safeTotal = Math.max(totalItems, 0);
  const safeCurrent =
    safeTotal > 0 ? Math.min(Math.max(currentPosition, 0), safeTotal) : 0;
  const percent = safeTotal > 0 ? (safeCurrent / safeTotal) * 100 : 0;

  return { safeCurrent, safeTotal, percent };
}
