const {totalBooks, currentBookIndex} = that;
const soundName = thisBot.tags.tourGuideStringsSounds[totalBooks][currentBookIndex];
thisBot.playSound({soundName});