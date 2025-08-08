let messages;

console.log(that)

if (that.content === "") {
    return
}

if (masks.messages) {
    messages = [...masks.messages, { ...that }];
} else {
    messages = [...preAIInstructions, { ...that }];
}

if(messages.length > 10){
    messages = messages.filter((item) => {
        return item.role === "system" || item.role === "user" || item.role === "assistent"
    })

    messages = [...preAIInstructions, ...messages.slice(1, messages.length)]
}

setTagMask(thisBot, "messages", [...messages], "tempLocal");

const jarvisInstance = getBot("jarvis", true);

setTagMask(jarvisInstance, "thinking", true, "tempLocal");

jarvisInstance.Loading();

const response = await openAIClient.chat.completions.create({
    model: "gpt-4",
    messages: [...messages],
    tools: [
        ...aiTools
    ]
});

console.log(response)

const choice = response.choices[0].message;

if (choice?.tool_calls) {
    const toolCall = choice?.tool_calls[0];
    console.log(toolCall.function.name)
    const result = await assistantActions[toolCall.function.name]({ parameters: {...JSON.parse(toolCall.function.arguments), tool_call_id: choice.tool_calls[0].id} });
    setTagMask(thisBot, "messages", [
        ...messages,
        { ...choice }
    ], "tempLocal");
    if(result.success){
        whisper(thisBot, "callChatGptResponse", {
            role: "tool",
            content: JSON.stringify(toolCall.function),
            tool_call_id: choice.tool_calls[0].id
        })
    }else{
        whisper(thisBot, "callChatGptResponse", {
            role: "tool",
            content: JSON.stringify({
                error: result.message
            }),
            tool_call_id: choice.tool_calls[0].id
        })
    }
} else {
    setTagMask(thisBot, "messages", [...messages, { ...choice }], "tempLocal");
    whisper(thisBot, "handleVoice", { msg: choice.content })
}