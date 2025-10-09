import { captureElement } from 'aiApps.voiceAssistant.Utils'

const HandleEvents = async ({ dc, data }) => {
    console.log(data);
    switch (data.name) {
        case "getTime": {
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
            dc.send(
                JSON.stringify({ type: "response.create" })
            );
            break
        }
        
    }
}

export default HandleEvents;