const {key} = that;

const contents = thisBot.tags.keys.filter((content) => {
    return content.keys.includes(key)
})

contents.forEach((content) => {
    globalThis?.[`TabernacleItemClicked-${content.book}-${content.chapter}-${content.minVerse}`]?.();
})
thisBot.HandleTabernacleSectionInteraction({keys: [key], type: "itemClick"})