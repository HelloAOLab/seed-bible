let tempChaisms = tags.chaisms;
os.toast("Saved current arrangement");
let index = 0;
for(let i = 0; i < tempChaisms[masks.currentChaism].length; i++){
    for(let j = 0; j < tempChaisms[masks.currentChaism][i].length; j++){
        let words = tempChaisms[masks.currentChaism][i][j].text.split(" ");
        tempChaisms[masks.currentChaism][i][j].labelScaleZ = [];
        for(let k = 0; k < words.length; k++){
            let wordBot = getBot(byTag("label", words[k]), byTag("index", index++));
            if(wordBot){
                tempChaisms[masks.currentChaism][i][j].labelScaleZ = [...tempChaisms[masks.currentChaism][i][j].labelScaleZ, wordBot.masks.scaleZ ? wordBot.masks.scaleZ : wordBot.tags.scaleZ]
            }
        }
    }
}

tags.chaisms = [...tempChaisms];