const soundId = await os.playSound(thisBot.tags.soundsURLArray.find((soundInfo) => {return soundInfo.name === "DonationBarRaising"}).URL);
return soundId;