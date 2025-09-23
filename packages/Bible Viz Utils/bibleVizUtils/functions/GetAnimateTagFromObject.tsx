const {obj} = that;

const animateFn = obj.tag ? animateTag(obj.bot, obj.tag, obj.options) : animateTag(obj.bot, obj.options);
return animateFn.then(() => {
    if(obj.then)
    {
        return thisBot.GetAnimateTagFromObject({obj: obj.then})
    }
})