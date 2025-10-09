export const CreateMessageLog = () => {
    setTagMask(thisBot, 'chatMessages', {}, "tempLocal");
    setTagMask(thisBot, 'itemArray', [], "tempLocal");
}

export const ClearMessageLog = () => {
    setTagMask(thisBot, 'chatMessages', null, "tempLocal");
    setTagMask(thisBot, 'itemArray', [], "tempLocal");
}

export const OutputMessageLog = () => {
    if(!masks?.itemArray) return []
    let messages = [...masks.itemArray.map(item => {
        return masks.chatMessages[item]
    })]
    console.log(messages, messages.filter(messages => messages))
    return messages.filter(messages => messages)
}

export const HandleEventMessage = (event, setIsAssistantListening, setIsAssistantThinking) => {
    switch (event.type) {
        case "conversation.item.input_audio_transcription.completed": {
            setTagMask(thisBot, 'chatMessages', {
                ...masks.chatMessages,
                [`${event.item_id}`]: {
                    message: event.transcript,
                    role: "user"
                }
            }, "tempLocal");
            globalThis?.SetUserWriting && globalThis.SetUserWriting(false);
            globalThis?.SetAiTextMessages && globalThis.SetAiTextMessages([...OutputMessageLog()]);
            globalThis?.SetAssistantWriting && globalThis.SetAssistantWriting(true);
            break
        }
        case "response.output_audio_transcript.delta": {
            setTagMask(thisBot, 'chatMessages', {
                ...masks.chatMessages,
                [`${event.item_id}`]: {
                    message: masks.chatMessages[event.item_id] ? masks.chatMessages[event.item_id].message + event.delta : event.delta,
                    role: "assistant"
                }
            }, "tempLocal");
            globalThis?.SetAiTextMessages && globalThis.SetAiTextMessages([...OutputMessageLog()]);
            globalThis?.SetAssistantWriting && globalThis.SetAssistantWriting(false);
            break
        }
        case "response.content_part.done": {
            setTagMask(thisBot, 'chatMessages', {
                ...masks.chatMessages,
                [`${event.item_id}`]: {
                    message: event.part.transcript,
                    role: "assistant"
                }
            }, "tempLocal");
            globalThis?.SetAiTextMessages && globalThis.SetAiTextMessages([...OutputMessageLog()]);
            break
        }
        case "response.content_part.added": {
            setTagMask(thisBot, 'itemArray', [...masks.itemArray, event.item_id], "tempLocal");
            break
        }
        case "input_audio_buffer.speech_started": {
            setTagMask(thisBot, 'itemArray', [...masks.itemArray, event.item_id], "tempLocal");
            setIsAssistantListening(true);
            globalThis?.SetUserWriting && globalThis.SetUserWriting(true);
            break
        }
        case "input_audio_buffer.speech_stopped": {
            setIsAssistantListening(false);
            break
        }
    }
}