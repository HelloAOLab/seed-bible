let messages;

if(that.content === ""){
    return
}

if(masks.messages){
    messages = [...masks.messages, {...that}];
}else{
    messages = [...aiInstructions, {...that}];
}

setTagMask(thisBot, "messages", [...messages], "local");

const response = await ai.chat(messages, {
    preferredModel: masks?.aiVersion ? masks.aiVersion : "gpt-4"
});


setTagMask(thisBot, "messages", [...messages, response], "local");

whisper(thisBot, "handleChatGtpResponse", {...response, userMessage: that.content});