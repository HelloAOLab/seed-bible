const isThrottle = that?.isThrottle || false;
const soundName = that?.soundName || "";
let playSound = true;
const throtleTimeLimit = 5000;
if(!globalThis.soundThrottleLimit) {
    globalThis.soundThrottleLimit = {}
}
const sound = thisBot.tags.soundsURLArray.find((soundInfo) =>soundInfo.name === soundName);

if(isThrottle) {
    if(globalThis.soundThrottleLimit[soundName]) {
        const timeDiff = Date.now() - globalThis.soundThrottleLimit[soundName];
        if(timeDiff < throtleTimeLimit) {
            playSound = false;
        }else {
            globalThis.soundThrottleLimit[soundName] = Date.now();
        }
    }else {
        globalThis.soundThrottleLimit[soundName] = Date.now();
    }
    
}

if(!sound){
    return os.toast("SOUND NOT FOUND!")
}

if(playSound && sound.URL) {
    return os.playSound(sound.URL);
}

if(sound.URLs && playSound) {
    const len = sound.URLs.length;
    const index = Math.floor(Math.random() * len);
    const url = sound.URLs[index];
    return os.playSound(url);
}