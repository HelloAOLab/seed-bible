const callGPT = async (text: string) => {
    const currentAiBot = getBot(byTag('selectedAiBot', true));

    let messageText = text ? text : currentAiBot.tags.label !== "Type your questions here!" ? currentAiBot.tags.label : currentAiBot.masks.label;
    if (messageText && messageText !== "") {
        whisper(thisBot, "aiProgress");
        const resMsg = await ai.chat(`${masks?.positivePromt ? masks?.positivePromt : ""} ${messageText}`, {
            preferredModel: `${masks?.gptVersion ? masks.gptVersion.value : "gpt-4"}`
        });
        os.unregisterApp('aiProgress');
        return resMsg;
    } else {
        os.toast("No message found!!!")
        return null
    }
}

const callGPTImageGen = async (text: string) => {
    const currentAiBot = getBot(byTag('selectedAiBot', true));

    let messageText = text ? text : currentAiBot.tags.label !== "Type your questions here!" ? currentAiBot.tags.label : currentAiBot.masks.label;
    if (messageText && messageText !== "") {
        try {
            whisper(thisBot, "aiProgress");
            const imageResult = await ai.generateImage(masks?.dallEVersion.value === "stabilityAi" ? {
                prompt: `${masks?.positiveImagePromt ? masks?.positiveImagePromt : ""} \n generate an image of based on the previous info for ${messageText}`,
                negativePrompt: `${masks?.negativeImagePromt ? masks?.negativeImagePromt : null}`,
                stabilityai: [
                    "stable-diffusion-xl-1024-v1-0",
                    "stable-diffusion-v1-6",
                    "stable-image-ultra",
                    "stable-image-core",
                    "sd3-medium",
                    "sd3-large",
                    "sd3-large-turbo"
                ]
            } : {
                prompt: `${masks?.positiveImagePromt ? masks?.positiveImagePromt : ""} \n generate an image of based on the previous info for ${messageText}`,
                negativePrompt: `${masks?.negativeImagePromt ? masks?.negativeImagePromt : null}`,
                model: masks?.dallEVersion ? masks.dallEVersion.value : "dall-e-2"
            });
            os.unregisterApp('aiProgress');
            return imageResult.images[0].url;
        } catch (e) {
            console.log(e)
            os.toast("Internal Error!!!")
            return null
        }
    } else {
        os.toast("No message found!!!")
        return null
    }
}

console.log("making global ai")

const aiUtils = {
    callGPT,
    callGPTImageGen
}

globalThis.aiUtils = aiUtils;