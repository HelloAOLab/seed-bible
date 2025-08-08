const dim = os.getCurrentDimension();

const currentTrays = getBots(byTag("tray"));
destroy(currentTrays);
const prevWordBots = getBots(byTag("wordBot"));
destroy(prevWordBots);

let startingX = 50;
let startingY = 0;
let maxX = 1;
let maxY = 1;
let index = 0;
for(let i = 0; i < tags.chaisms[0].length; i++){
    startingY -= 1;
    maxY += 1;
    startingX = 50;
    let wordLengthTotal = 0;
    for(let j = 0; j < tags.chaisms[0][i].length; j++){
        let placeTempScaleZ = false;
        const words = tags.chaisms[0][i][j].text.split(" ");
        if(words.length === tags.chaisms[0][i][j].labelScaleZ.length){
            placeTempScaleZ = true;
        }
        for(let k = 0; k < words.length; k++){
            let wordLength = thisBot.calcWord({label: words[k]});
            if(words[k] === "“I"){
                wordLength += 0.15
            }
            if(tags.chaisms[0][i][j].labelSize){
                wordLength = wordLength * tags.chaisms[0][i][j].labelSize;
            }
            if(startingX + wordLength > 70){
                startingX = 50;
                startingY -= 1;
                maxY += 1;
            }
            const wordXPosition = startingX + (wordLength / 2);
            startingX = startingX + wordLength;
            wordLengthTotal += wordLength;
            create({
                wordBot: !tags.chaisms[0][i][j]?.title,
                space: "tempLocal",
                [dim]: true,
                [dim + "X"]: wordXPosition,
                [dim + "Y"]: startingY,
                [dim + "Z"]: 0.1,
                label: words[k],
                color: "white",
                scaleX: wordLength,
                scaleZ: 0.1,
                line: i,
                index: index++,
                labelColor: tags.chaisms[0][i][j].labelColor,
                labelSize: tags.chaisms[0][i][j].labelSize ? tags.chaisms[0][i][j].labelSize : 1,
                tempScaleZ: tags.chaisms[0][i][j].labelScaleZ[k]
            })
        }
        if(tags.chaisms[0][i][j]?.title){
            startingY -= 1;
        }
    }
    if(!maxX || maxX < wordLengthTotal){
        maxX = wordLengthTotal;
    }
}

const currentTray = create({
    tray: "true",
    [dim + "X"]: 60,
    [dim + "Y"]: -(maxY / 2) - 1,
    scaleX: 22,
    scaleY: maxY + 2,
    scaleZ: 0.1,
    space: "tempLocal",
    [dim]: true,
    draggable: false,
    pointable: false
});

os.focusOn(currentTray, {
    duration: 1,
    rotation: {x: 0, y: 0},
    zoom: gridPortalBot.tags.pixelWidth > 768 ? 10 : 5
})