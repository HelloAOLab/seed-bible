if(!thisBot.masks.initialized || thisBot.masks?.activated){
    whisper(thisBot, "manifest", {dimension: os.getCurrentDimension(), position: {...that.position}})
}

if(!thisBot.tags.jarvis) return;

console.log({...thisBot} ,that.dimension, configBot.tags.miniMapPortal)

let aoLogoMod = {
    space: "tempLocal",
    [that.dimension]: true,
    dimension: that.dimension,
    [that.dimension + "X"]: that.position.x,
    [that.dimension + "Y"]: that.position.y,
    scaleZ: 0.01,
    onCreate: `@ masks.timeout = setTimeout(() => {
        destroy(links.circle);
        destroy(thisBot)
    }, 800);
    await animateTag(thisBot, {
        fromValue: {
            scaleX: 0.1,
            scaleY: 0.1
        },
        toValue: {
            scaleX: 1.1,
            scaleY: 1.1
        },
        duration: 0.5,
        easing: {
            type: "elastic",
            mode: "out"
        }
    }).catch(e => {});`,
    onClick: `@ clearTimeout(tags.timeout);
    tags.pointable = false;
    links.jarvis.Spawn({positionInfo: tags.positionInfo});
    links.circle.Shrink();
    await os.sleep(500);
    await animateTag(thisBot, "scale", {
        fromValue: 1,
        toValue: 0.01,
        duration: 1,
        easing: {
            type: "elastic",
            mode: "out"
        }
    }).catch(e => {});
    destroy(links.circle)
    destroy(thisBot);`,
    positionInfo: that,
    color: "#ffffff",
    form: "sprite",
    draggable: false,
    formAddress: tags.aoLogo,
    jarvis: "🔗" + thisBot.id,
}

const aoLogo = create(aoLogoMod);

let aoLogoCircleMod = {
    space: "tempLocal",
    [that.dimension]: true,
    dimension: that.dimension,
    [that.dimension + "X"]: 0,
    [that.dimension + "Y"]: -0.02,
    [that.dimension + "Z"]: 0,
    scaleX: 0.4,
    scaleY: 0.4,
    scaleZ: 0.01,
    pointable: false,
    color: "#ffffff",
    form: "circle",
    jarvis: "🔗" + thisBot.id,
    transformer: aoLogo.id,
    Shrink: `@ animateTag(thisBot, {
        fromValue: { scaleX: 0.4, scaleY: 0.4 },
        toValue: { scaleX: 0, scaleY: 0 },
        duration: 0.25,
        easing: {type: "linear"}
    })`
}
const aoLogoCircle = create(aoLogoCircleMod);

aoLogo.tags.circle = "🔗" + aoLogoCircle.id;