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

export const HandleEventMessage = (event) => {
    switch (event.type) {
        case "conversation.item.input_audio_transcription.completed": {
            setTagMask(thisBot, 'chatMessages', {
                ...masks.chatMessages,
                [`${event.item_id}`]: {
                    message: event.transcript,
                    role: "user"
                }
            }, "tempLocal");
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
            break
        }
        case "response.content_part.added": {
            setTagMask(thisBot, 'itemArray', [...masks.itemArray, event.item_id], "tempLocal");
            break
        }
        case "input_audio_buffer.speech_started": {
            setTagMask(thisBot, 'itemArray', [...masks.itemArray, event.item_id], "tempLocal");
            break
        }
    }
}