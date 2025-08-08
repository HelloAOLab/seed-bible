const newAnnot = selectedAnnot;
if(newAnnot){
    console.log("Deploying new annot");
    sendIcon({ type: 'loading', trayColor: "#ffffff", dragerColor: "#000000", action: null });
    const fileData = await os.getFile(newAnnot.recordAddress);
    sendIcon(null);
    if(fileData){
        const dim = os.getCurrentDimension();
        const typingTool = getBot(byTag("typingTool"));
        const newBotsId = [];
        const mmBots = [];
        const createdMMBot = [];
        const normalBots = [];
        fileData.bots.forEach(item => {
            // let textBot = create({
            //     ...item,
            //     [dim]: true,
            //     [dim + "X"]: item.x + that.position.x,
            //     [dim + "Y"]: item.y + that.position.y,
            //     space: "tempLocal"
            // })
            // newBotsId = [...newBotsId, textBot.tags.id]
            if(item?.mmBot || item?.mmIndexBot){
                mmBots.push(item);
            }else{
                normalBots.push(item);
            }
        });
        normalBots.forEach(item => {
            destroy(getBots(byTag("uid", item.uid)));
            const textBot = create({
                ...item,
                [dim]: true,
                [dim + "X"]: item.x + that.position.x,
                [dim + "Y"]: item.y + that.position.y,
                space: "tempLocal"
            })
            newBotsId.push(textBot.tags.id)
        })
        mmBots.map(item => {
            destroy(getBots(byTag("uid", item.uid)));
            const textBot = create({
                ...item,
                [dim]: true,
                [dim + "X"]: item.x + that.position.x,
                [dim + "Y"]: item.y + that.position.y,
                space: "tempLocal"
            })
            newBotsId.push(textBot.tags.id)
            createdMMBot.push(textBot.tags.id)
        })
        console.log(createdMMBot)
        createdMMBot.forEach(item => {
            const newBot = getBot(byID(item));
            console.log(newBot, "newBot")
            if(newBot.tags.mmBot){
                const mmIndexBot = getBot(byTag("uid", newBot.tags.indexBot));
                newBot.tags.indexBot = mmIndexBot.tags.id;
                const lineTo = [];
                newBot.tags.lineTo.map(subItem => {
                    const childBot = getBot(byTag("uid", subItem));
                    childBot.tags.parentBotId = item;
                    lineTo.push(childBot.tags.id);
                })
                setTagMask(newBot, "lineTo", [...lineTo], "tempLocal");
                setTagMask(newBot, "childIds", [...lineTo], "tempLocal");
            }else if(newBot.tags.mmIndexBot){
                const mmBot = getBot(byTag("uid", newBot.tags.textBot));
                newBot.tags.textBot = mmBot.tags.id;
            }
        })
        setAnnotBotIds([...newBotsId]);
        setAnnotations([...JSON.parse(fileData.annotations)])
        setTitle(fileData.title)
        setMode(0);
        os.toast("Annotation loaded successfully");
    }else{
        os.toast("Unable to load the annotation")
    }
}