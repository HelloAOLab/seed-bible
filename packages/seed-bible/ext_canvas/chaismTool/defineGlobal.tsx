let dim = os.getCurrentDimension();

const getVerses = () => {
    let verseBots = getBots(byTag("wordBot", true));
    verseBots.sort(function(bot1, bot2){
        if( bot1.tags[dim + "Y"] == bot2.tags[dim + "Y"]) return bot1.tags[dim + "X"] - bot2.tags[dim + "X"];
        return bot2.tags[dim + "Y"] - bot1.tags[dim + "Y"];
    });
    for(let i = 0; i < verseBots.length; i++){
        if(verseBots[i].tags.label === undefined){
            verseBots.splice(i, 1);
            continue;
        }
    }
    return verseBots;
}

let globalFunctions = {getVerses};

globalThis.globalFunctions = globalFunctions;