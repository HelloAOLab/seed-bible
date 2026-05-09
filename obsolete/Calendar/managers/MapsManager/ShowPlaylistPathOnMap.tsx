const { mapData } = that;

const dimension = os.getCurrentDimension();

mapData.playlistEntries
  .filter((entryItem) => {
    return entryItem !== null;
  })
  .forEach((entryItem, index, array) => {
    const prevEntryItem = array[index - 1];
    if (
      index > 0 &&
      (prevEntryItem.tags.book !== entryItem.tags.book ||
        prevEntryItem.tags.chapter !== entryItem.tags.chapter)
    ) {
      const mapBookStructure = mapData.childrenStructures.find((structure) => {
        return (
          structure.mapBookData.elementInfo.commonName === entryItem.tags.book
        );
      });
      const mapChapterData = mapBookStructure.mapBookData.childrenData.find(
        (data) => {
          return data.elementInfo.number === entryItem.tags.chapter;
        }
      );
      const chapterDataLastEntryItem =
        mapChapterData.playlistEntriesItems[
          mapChapterData.playlistEntriesItems.length - 1
        ];

      const prevMapBookStructure = mapData.childrenStructures.find(
        (structure) => {
          return (
            structure.mapBookData.elementInfo.commonName ===
            prevEntryItem.tags.book
          );
        }
      );
      const prevChapterData =
        prevMapBookStructure.mapBookData.childrenData.find((data) => {
          return data.elementInfo.number === prevEntryItem.tags.chapter;
        });
      const prevChapterDataLastEntryItem =
        prevChapterData.playlistEntriesItems[
          prevChapterData.playlistEntriesItems.length - 1
        ];

      let node = prevChapterDataLastEntryItem.vars.nodes?.find?.((node) => {
        return (
          node.tags.isInUse &&
          node.tags.linkedTo === chapterDataLastEntryItem.id &&
          node.tags.index == prevEntryItem.tags.index
        );
      });
      if (!node) {
        const prevChapterDataLastEntryItemPosition = getBotPosition(
          prevChapterDataLastEntryItem,
          dimension
        );
        const prevChapterDataLastEntryItemScales = GetBotScales(
          prevChapterDataLastEntryItem
        );
        node = ObjectPooler.GetObjectFromPool({
          tag: ObjectPoolTags.MapChapterPlaylistEntryNode,
        });
        const mod = {
          [dimension]: true,
          [dimension + "X"]: prevChapterDataLastEntryItemPosition.x,
          [dimension + "Y"]: prevChapterDataLastEntryItemPosition.y,
          [dimension + "Z"]: prevChapterDataLastEntryItemPosition.z,
          linkedTo: chapterDataLastEntryItem.id,
          index: prevEntryItem.tags.index,
          scaleX: prevChapterDataLastEntryItemScales.x,
          scaleY: prevChapterDataLastEntryItemScales.y,
          scaleZ: prevChapterDataLastEntryItemScales.z,
        };
        node.OnSpawned({ mod });
        prevChapterDataLastEntryItem.vars.nodes.push(node);
      }
      setTag(node, "lineTo", node.tags.linkedTo);
      setTag(
        node,
        "lineColor",
        mapData.playlistSelectedEntryIndex >= entryItem.tags.index
          ? "lightgrey"
          : "white"
      );
    }
  });
