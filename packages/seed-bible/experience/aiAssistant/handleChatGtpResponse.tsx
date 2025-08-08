function generateQuery(params) {
    const queryArray = [];
    for (const key in params) {
        if (params.hasOwnProperty(key)) {
            queryArray.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
        }
    }
    return queryArray.join('&');
}

function attachQueryToURL(url, params) {
    const queryString = generateQuery(params);
    return url + (url.includes('?') ? '&' : '?') + queryString;
}
try{
    const response = JSON.parse(that.content);

    console.log(response)

    const functions = [...response?.functions||''];

    try{
        if(response?.biblical){
            console.log("biblical")
            const data = {
                query: that.userMessage
            }
            const url = attachQueryToURL("https://developer.ai.gloo.us/api/documents/all", data);
            const response = await web.get(url, {
                headers: {
                    "X-Api-Key": "e78f1add78f0d3311156b3d539114a6d4d7308d3d9f3b93d6fadab8515721f73c6fb7f580857b1acb2b88e36cb7c5dd482a162e423a51613fe7cfc6d2f27a414",
                    "Accept": "*/*",
                    "User-Agent": "Thunder Client (https://www.thunderclient.com)"
                }
            })
            console.log(response)
        };
        const msg = response.message

        if(msg){
            const mp3 = await openAIClient.audio.speech.create({
                model: "tts-1",
                voice: masks?.aiVoice ? masks.aiVoice :"onyx",
                input: msg
            });


            const buffer = await mp3.arrayBuffer();

            const base64 = bytes.toBase64Url(new Uint8Array(buffer), "audio/mp3");

            await os.playSound(base64)
        }
        setAiLoading(false);
    }catch{() => {
        setAiLoading(false);
    }}

    if(functions){
        functions.forEach(async (functionData) => {
            await os.sleep(1000);
            switch(functionData.functionName){
                case "changeLightMode": {
                    await assistantActions.changeLightMode({parameters: functionData.parameters});
                    break
                }
                case "createImage": {
                    await assistantActions.createImage({parameters: functionData.parameters});
                    break
                }
                case "createBibleStack": {
                    await assistantActions.createBibleStack({parameters: functionData.parameters});
                    break
                }
                case "createAnimation": {
                    await assistantActions.createAnimation({parameters: functionData.parameters});
                    break
                }
                case "clearCanvas": {
                    await assistantActions.clearCanvas({parameters: functionData.parameters});
                    break
                }
            }
        })
    }
}catch{(e) => {
    console.log(e)
}}