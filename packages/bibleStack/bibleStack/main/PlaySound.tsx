const isThrottle = that?.isThrottle || false;
const soundName = that?.soundName || "";
let PlaySound = true;
const throtleTimeLimit = 5000;
if(!globalThis.soundThrottleLimit) {
    globalThis.soundThrottleLimit = {}
}
const sound = thisBot.tags.soundsURLArray.find((soundInfo) =>soundInfo.name === soundName);

if(isThrottle) {
    if(globalThis.soundThrottleLimit[soundName]) {
        const timeDiff = Date.now() - globalThis.soundThrottleLimit[soundName];
        if(timeDiff < throtleTimeLimit) {
            PlaySound = false;
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

if(PlaySound && sound.URL) {
    return os.PlaySound(sound.URL);
}

if(sound.URLs && PlaySound) {

    const len = sound.URLs.length;
    const index = Math.floor(Math.random() * len);
    const url = sound.URLs[index];
    return os.PlaySound(url);
}