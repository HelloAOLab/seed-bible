if(!thisBot.tags.color) return;

const grayScaleColor = that.grayScaleColor;

setTagMask(thisBot,"isGrayScaled",grayScaleColor);

const colorNew = grayScaleColor ? `${thisBot.tags.grayScaleColor}` : `${thisBot.tags.orginalColor}`;

setTagMask(thisBot,"color",colorNew);