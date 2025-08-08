if(!masks?.ss){
    let data = await os.endAudioRecording();
    if(data){
        thisBot.Loading();
        const arrayBuffer = await data.arrayBuffer();
        if(arrayBuffer.byteLength > 1024 * 48 * 60){
            whisper(thisBot, "handleVoice", {msg: "Sorry, but you request is too long to be processed."})
            return
        }else{
            const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
            const file = new File([blob], "rec.wav");
            const transcription = await openAIClient.audio.transcriptions.create({
                file,
                model: "whisper-1",
                prompt: "The sentence may be cut off, do not make up words to fill in the rest of the sentence.",
                language: "en",
                temperature: 0.05
            });
            if(transcription.text === ""){
                thisBot.Idle();
                return;
            }
            whisper(getBot('system', 'experience.jarvis'), "callChatGptResponse", {
                role: "user",
                content: transcription.text
            })
        }
    }
    masks.color = null;
}else{
    try{
        await os.endAudioRecording()
    }catch{() => {}}
    clearTimeout(masks.ss);
    masks.ss = null;
    masks.color = null;
    thisBot.Idle();
}