const { obj } = that;

setTag(obj.bot, obj.tag, obj.options.toValue);
if (obj.then) {
  thisBot.GetSetTagFromObject({ obj: obj.then });
}
