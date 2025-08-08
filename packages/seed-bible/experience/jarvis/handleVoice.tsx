const aiAssistant = getBot('system', 'experience.aiAssistant');

let base64;

let buffer;

if(!that?.intro){
    const mp3 = await openAIClient.audio.speech.create({
        model: "tts-1",
        voice: aiAssistant.masks?.aiVoice ? aiAssistant.masks.aiVoice : "onyx",
        input: that.msg
    });

    buffer = await mp3.arrayBuffer();

    base64 = bytes.toBase64Url(new Uint8Array(buffer), "audio/mp3");
}else{
    if(tags[aiAssistant.masks?.aiVoice ? aiAssistant.masks.aiVoice + "intro" : "onyxintro"]){
        console.log("from memory")
        base64 = tags[aiAssistant.masks?.aiVoice ? aiAssistant.masks.aiVoice + "intro" : "onyxintro"]

        const blob = bytes.fromBase64Url(base64);

        buffer = await blob.arrayBuffer();
    }else{
        const mp3 = await openAIClient.audio.speech.create({
            model: "tts-1",
            voice: aiAssistant.masks?.aiVoice ? aiAssistant.masks.aiVoice : "onyx",
            input: that.msg
        });

        buffer = await mp3.arrayBuffer();

        base64 = bytes.toBase64Url(new Uint8Array(buffer), "audio/mp3");

        tags[aiAssistant.masks?.aiVoice ? aiAssistant.masks.aiVoice + "intro" : "onyxintro"] = base64;
    }
}

const jarvisInstance = getBot("jarvis", true);

setTagMask(jarvisInstance, "thinking", false, "tempLocal");

jarvisInstance.Speaking();

const id = await os.playSound(base64);

console.log(buffer)
const audioTimeout = setTimeout(() => {
    console.log("clearing audioData mask")
    thisBot.masks.playingAudioId = null;
    jarvisInstance.Idle();
}, buffer.byteLength / 1024 * 48)

setTagMask(thisBot, "playingAudioId", {id: id, audioTimeout: audioTimeout}, "tempLocal");

