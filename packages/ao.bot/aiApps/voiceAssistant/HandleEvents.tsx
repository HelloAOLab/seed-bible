import { captureElement } from 'aiApps.voiceAssistant.Utils'

const HandleEvents = async ({ dc, data }) => {
    console.log(data, 'eventat datat');
    switch (data.name) {
        case "getSeedBibleUrl": {
            const now = new Date().toLocaleTimeString();
            dc.send(
                JSON.stringify({
                    type: "conversation.item.create",
                    item: {
                        type: "function_call_output",
                        call_id: data.call_id,
                        output: now,
                    }
                })
            );
            dc.send(JSON.stringify({
                type: "conversation.item.create",
                item: {
                    type: "message",
                    role: "assistant",
                    content: [
                        { type: "input_text", text: `Here you go: urlllll` }
                    ]
                }
            }));
            dc.send(
                JSON.stringify({ type: "response.create" })
            );
            break
        }

    }
}

export default HandleEvents;
