const dim = os.getCurrentDimension();
that.bot.masks.formOpacity = null;
that.bot.masks.strokeColor = null;
setTagMask(that.bot, `labelOpacity`, 0, "shared");
setTagMask(that.bot, `formOpacity`, 0, "shared");
setTagMask(that.bot, `color`, "clear", "shared");
setTagMask(that.bot, `strokeColor`, "clear", "shared");
setTagMask(that.bot, `pointable`, false, "shared");
setTagMask(that.bot, `${[dim + "Z"]}`, 0.05, "shared")