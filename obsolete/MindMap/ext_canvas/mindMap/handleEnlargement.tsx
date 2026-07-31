if (
  (that.bot.masks.formAddress === null ||
    that.bot.masks.formAddress === undefined) &&
  (that.bot.tags.formAddress === null ||
    that.bot.tags.formAddress === undefined) &&
  that.bot.masks.label.replace(" ", "") === ""
) {
  return;
}

let dim = os.getCurrentDimension();
if (that.bot.masks.enlarged === null && that.bot.masks.singleClicked === null) {
  setTagMask(that.bot, "enlarged", false, "tempLocal");
  setTagMask(that.bot, "singleClicked", false, "tempLocal");
}

if (that.bot.masks.enlarged) {
  setTagMask(that.bot, "enlarged", false, "tempLocal");
  clearTagMasks(that.bot, "tempLocal");
} else {
  if (that.bot.masks.singleClicked) {
    // let enlargedBots = getBots(byTag("enlarged", true));
    // for(let enlargedBot of enlargedBots){
    //     clearTagMasks(enlargedBot, "tempLocal")
    // }
    setTagMask(that.bot, "enlarged", true, "tempLocal");
    animateTag(that.bot, {
      fromValue: {
        scaleX: 5,
        scaleY: 1,
        [dim + "Z"]: 0.05,
        labelOpacity: 0,
      },
      toValue: {
        scaleX: that.bot.tags?.prevScaleX ? that.bot.tags.prevScaleX : 10,
        scaleY: that.bot.tags?.prevScaleY ? that.bot.tags.prevScaleY : 5,
        [dim + "Z"]: 0.3,
        labelOpacity: 1,
      },
      duration: 0.3,
      easing: "elastic",
      tagMaskSpace: "tempLocal",
    });
    setTagMask(that.bot, "labelAlignment", "center", "tempLocal");
    setTagMask(that.bot, "labelPadding", 0.3, "tempLocal");
  } else {
    if (masks.scTimeout) {
      await clearTimeout(masks.scTimeout);
      that.bot.masks.scTImeout = null;
    }
    setTagMask(that.bot, "singleClicked", true, "tempLocal");
    let scTimeout = setTimeout(() => {
      setTagMask(that.bot, "singleClicked", false, "tempLocal");
      that.bot.masks.scTImeout = null;
    }, 200);
    setTagMask(that.bot, "scTimeout", scTimeout, "tempLocal");
  }
}
