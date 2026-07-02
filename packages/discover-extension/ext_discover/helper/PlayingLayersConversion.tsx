export function PlayingLayersConversion(that?: any) {
  const list = that;

  const newList = list.map((item: any) => {
    // Deep copy to avoid modifying original
    const newItem = JSON.parse(JSON.stringify(item));

    if (newItem?.additionalInfo?.layers?.length) {
      // Create a stripped copy of the item without layers
      const strippedItem = JSON.parse(JSON.stringify(newItem));
      delete strippedItem.additionalInfo.layers;

      // Append stripped copy to layers
      newItem.additionalInfo.layers.unshift(strippedItem);
    }
    return newItem;
  });

  return newList;
}
