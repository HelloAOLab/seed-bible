let jarvis = getBot('system', 'experience.jarvis')
console.log(jarvis.masks)
if(jarvis.masks?.playingAudioId){
    os.cancelSound(jarvis.masks.playingAudioId.id);
    clearTimeout(jarvis.masks.playingAudioId.audioTimeout);
    jarvis.masks.playingAudioId = null;
}
if(masks?.ss){
    clearTimeout(masks.ss);
    masks.ss = null;
}
let ss = setTimeout(() => {
    masks.ss = null;
    thisBot.Recording();
}, 500);
setTagMask(thisBot, "ss", ss, "tempLocal");
await os.beginAudioRecording({
    mimeType: 'audio/wav'
});