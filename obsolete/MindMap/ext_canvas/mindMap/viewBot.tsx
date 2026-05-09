let dim = os.getCurrentDimension();
that.bot.masks.formOpacity = null;
that.bot.masks.strokeColor = null;
setTagMask(that.bot, `labelOpacity`, 1, "shared");
setTagMask(that.bot, `formOpacity`, 1, "shared");
setTagMask(that.bot, `color`, "white", "shared");
setTagMask(that.bot, `pointable`, true, "shared");
setTagMask(that.bot, `${[dim + "Z"]}`, 0.05, "shared");
