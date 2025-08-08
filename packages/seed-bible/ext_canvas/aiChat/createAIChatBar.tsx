destroy(getBots("aiBar"));

const dim = os.getCurrentDimension();

const eventTool = getBot('system', 'ext_canvas.eventTool');

const initialPlace = [that.position.x, that.position.y];

const aiBarConfig = {
    space: "tempLocal",
    [dim]: true,
    [dim + "X"]: initialPlace[0] + 8,
    [dim + "Y"]: initialPlace[1],
    scaleX: 6,
    scaleY: 0.1,
    scaleZ: 0.2,
    onCreate: `@ shout("createAiTextBot")`,
    onPointerEnter: `@
        tags.color = '#'+(Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0');
        animateTag(thisBot,"scaleZ",{fromValue:tags.scaleZ,toValue:0.3,duration:0.3})
    `,
    onPointerExit: `@
        tags["color"] = "white" 
        animateTag(thisBot,"scaleZ",{fromValue:tags.scaleZ,toValue:0.1,duration:0.3})
    `,
    aiBar: true,
    onDrop: `@
        const dim = os.getCurrentDimension();
        let textBot = getBot(byTag('parentTextBar', thisBot.tags.id));
        textBot.tags[dim + "X"] = that.to.x;
        textBot.tags[dim + "Y"] = that.to.y + 0.7;
    `,
    toErase: true,
    onDestroy: `@
        destroy(tags.childTextBot)
    `
}

const aiBar = create({
    ...aiBarConfig
})

os.focusOn(aiBar, {
    duration: 0.5,
    zoom: 10,
    rotation: {x: 0, y: 0, z: 0}
});