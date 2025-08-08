if (masks?.clicked) {
    // 
    switch (masks.type.type) {
        case "text_tool": {
            console.log("text_tool");
            whisper(getBot('system', 'ext_canvas.mindMap'), 'createTextBar', that);
            break
        }
        case "mind_map": {
            console.log("mind_map");
            const mindMapBot = getBot('mmTypingManager');
            whisper(mindMapBot, "UMCreateInitNode", that);
            break
        }
        case "eraser": {
            console.log("eraser");
            shout("createErase", that)
            break
        }
        case "animation": {
            console.log("animation");
            break
        }
        case "annotation": {
            const annotationBot = getBot('system', 'experience.annotation');
            annotationBot.masks.onAnyBotClicked = null;
            break
        }
        case "newAnnot": {
            console.log("newAnnot")
            shout("deployNewAnnnot", that)
            break
        }
        case "timeLine": {
            shout("createEventBot", {eventBotData: eventData, position: that.position});
            break
        }
        case "bible-stack": {
            StacksManager.SetStackCreationActive({value: !StacksManager.masks.isBibleCreationActive});
            StacksManager.TryCreateNewBible(that);
            break
        }
        case "bible_map": {
            MapsManager.CreateNewMap(that);
            break
        }
    }
    masks['clicked'] = false
    masks['type'] = null
    clearInterval(masks.pointer)
    masks.pointer = null;
    try{
        await os.unregisterApp('mouseCursor');
    }catch{() => {}}
}