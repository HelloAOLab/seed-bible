const {containerIndex} = that;

const urlsArray = thisBot.tags.soundsURLArray.find((soundInfo) => {return soundInfo.name === "DonationBarPop"}).URLs
os.playSound(urlsArray[containerIndex]);