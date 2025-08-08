masks['run'] = false
shout('returnTrays')
const tm = setTimeout(() => {
    destroy(thisBot);
}, 10000);

setTagMask(thisBot, "tm", tm, "tempLocal");