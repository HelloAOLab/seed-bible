destroy(getBots("optionBot"));

if(that?.clean){
    return
}

const dim = os.getCurrentDimension();
const currentAiBot = getBot(byTag('selectedAiBot', true));

if(currentAiBot){
    const optionConfigs = [
        {
            [dim]: true,
            [dim + "Z"]: 0.1,
            scale: 0.5,
            scaleZ: 0.1,
            onClick: `@
                if(openSidebar){
                    setOpenSidebar(false);
                }else{
                    setCurrentExperience(9);
                    setOpenSidebar(true);
                }
            `,
            labelOapcity: 1,
            formOpacity: 1,
            space: "tempLocal",
            color: "#29B6F6",
            controlBotId: currentAiBot.tags.id,
            removeButton: true,
            formAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/da99f7462d60d593ceeda8c9f6facf670d422eb9103c3515e3877e6e0f955e94.png",
            form: "sprite",
            draggable: false,
            optionBot: true,
            activeFormAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/40b6f4c1f711f7b4b51b40627175048a47859feee30f769b45aebc00fb5625d3.png",
            onPointerEnter: `@ os.tip("Data Ocean")`
        },
        {
            [dim]: true,
            [dim + "Z"]: 0.1,
            scale: 0.6,
            scaleZ: 0.1,
            onClick: tags.aiOptionOnClick,
            labelOapcity: 1,
            formOpacity: 1,
            space: "tempLocal",
            color: "#29B6F6",
            controlBotId: currentAiBot.tags.id,
            removeButton: true,
            formAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/91f8c0eed1609bb051a14951b94a61c1de486b8d17775e53b5471bc5b88cf51f.png",
            form: "sprite",
            draggable: false,
            optionBot: true,
            activeFormAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/40b6f4c1f711f7b4b51b40627175048a47859feee30f769b45aebc00fb5625d3.png",
            onPointerEnter: `@ os.tip("Chat gpt")`,
            chatGptBot: true
        },
        {
            [dim]: true,
            [dim + "Z"]: 0.1,
            scale: 0.6,
            scaleZ: 0.1,
            onClick: tags.genImageOnClick,
            labelOapcity: 1,
            formOpacity: 1,
            space: "tempLocal",
            color: "#29B6F6",
            controlBotId: currentAiBot.tags.id,
            removeButton: true,
            formAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/4292dc93c2d0668f7e713a0453db294e8242fc307c32061d26b7cefdfb4abd0e.png",
            form: "sprite",
            draggable: false,
            optionBot: true,
            activeFormAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/66651e431410544d92baa944e144e7969c8c27e906c1181eca8f4ce6f617d59a.png",
            onPointerEnter: `@ os.tip("Ai images")`
        },
        {
            [dim]: true,
            [dim + "Z"]: 0.1,
            scale: 0.6,
            scaleZ: 0.1,
            onClick: `@
                let controlBot = getBot(byID(tags.controlBotId));
                if(controlBot.masks.voiceNote && !thisBot.masks.recording){
                    if(!thisBot.masks.playingId){
                        os.toast("Playing Voicenote");
                        os.log("Playing");
                        const id = await os.playSound(controlBot.masks.voiceNote);
                        thisBot.masks.formAddress = thisBot.tags.stopIcon;
                        thisBot.masks.playingId = id;
                    }else{
                        os.log("Stoping");
                        os.cancelSound(thisBot.masks.playingId);
                        thisBot.masks.playingId = null;
                        thisBot.masks.formAddress = thisBot.tags.playIcon;
                    }
                }
            `,
            labelOapcity: 1,
            formOpacity: 1,
            space: "tempLocal",
            color: "#29B6F6",
            controlBotId: currentAiBot.tags.id,
            removeButton: true,
            formAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/8cee03e3fe7b8cfbe0f9f47771448d15d40fbc9e5cdf85e12d120c6a5f800009.png",
            form: "sprite",
            draggable: false,
            optionBot: true,
            activeFormAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/e0c0866fa29460586e43849f78a27a765429362f992336fa86b561fab7c4b0ef.png",
            playIcon: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/3665ec87031b8dba497f9c6f1c09170304237250566d461233b8fb4c9c2262f6.png",
            stopIcon: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/eda10bc0e9c03da78005bd6bf1ea2c4086adebd6031fb8da7a4b3bc7c8f936cf.png",
            onPointerEnter: `@ os.tip("Voice Notes")`,
            onPointerDown: `@
                if(thisBot.masks.playingId){
                    return
                }
                const recordTimeout = setTimeout(async () => {
                    thisBot.masks.formAddress = thisBot.tags.activeFormAddress;
                    thisBot.masks.recordTimeout = null;
                    thisBot.masks.recording = true;
                    os.toast("Recording Voicenote");
                    await os.beginAudioRecording();
                }, 500);
                setTagMask(thisBot, "recordTimeout", recordTimeout, "tempLocal")
            `,
            onPointerUp: `@
                if(thisBot.masks.playingId){
                    return
                }
                if(thisBot.masks.recordTimeout){
                    clearTimeout(thisBot.masks.recordTimeout);
                    thisBot.masks.recordTimeout = null
                }else{
                    const data = await os.endAudioRecording();
                    data.arrayBuffer().then(buffer => {
                        const base64 = bytes.toBase64Url(new Uint8Array(buffer), data.type.split(";")[0]);
                        let controlBot = getBot(byID(tags.controlBotId));
                        setTagMask(controlBot, "voiceNote", base64, "tempLocal");
                        thisBot.masks.formAddress = thisBot.tags.playIcon;
                        setTimeout(() => {
                            thisBot.masks.recording = false;
                        }, 200)
                        os.toast("Voicenote Saved");
                    })
                }
            `,
            onCreate: `@
                let controlBot = getBot(byID(tags.controlBotId));
                if(controlBot.masks.voiceNote){
                    thisBot.masks.formAddress = thisBot.tags.playIcon;
                }
            `
        },
        {
            [dim]: true,
            [dim + "Z"]: 0.1,
            scale: 0.6,
            scaleZ: 0.1,
            onClick: `@ destroy(tags.controlBotId); shout("createAiOptions", {clean: true});`,
            labelOapcity: 1,
            formOpacity: 1,
            space: "tempLocal",
            color: "#29B6F6",
            controlBotId: currentAiBot.tags.id,
            removeButton: true,
            formAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/5e8c6e010331553182a513c84a018b150575b073b8d80f4546252fdefe27f973.png",
            form: "sprite",
            draggable: false,
            optionBot: true,
            onPointerEnter: `@ os.tip("Destroy")`
        }
    ];
    for(let i = 0; i < optionConfigs.length; i++){
        const optionBot = create({
            ...optionConfigs[i],
            [dim + "X"]: currentAiBot.tags[dim + "X"] + (1 * i) - ((optionConfigs.length / 2) - 0.6),
            [dim + "Y"]: currentAiBot.tags[dim + "Y"] - 1,
        })
    }
}