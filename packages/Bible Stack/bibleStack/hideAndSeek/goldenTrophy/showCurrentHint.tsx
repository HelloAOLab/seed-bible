if(!globalThis.hideSeekPlaying) return;
const { useMemo } = os.appHooks;

os.unregisterApp("triedUI");
os.registerApp("triedUI");

// web.get(`https://bible.helloao.org/api/BSB/${thisBot.tags.gameData.bookName}.json`).then((res)=>{
//     console.log(res.data);
// });

const HintTries = () => {
    const incorrectTries = Math.min(thisBot.tags.currentTries,thisBot.tags.totalTries);
    const totalTried = thisBot.tags.totalTries;

    const hint = thisBot.extractNearestLowestHint();

    return <>
        <style>{thisBot.tags["index.css"]}</style>
        <div className="hints-tries">
            <div className="hints-details">
                <div className="hints-details-circle">
                    {
                        Array(incorrectTries).fill(0).map((e,index)=><p className={`tries-circle ${index===thisBot.tags.winAt?"correct":"incorrect"}`} ></p>)
                    }
                    {Array(totalTried - incorrectTries).fill(0).map(()=><p className="tries-circle" ></p>)}
                </div>
            </div>
            {thisBot.tags.winAt > 7 && hint &&  <p>Hint: {hint} </p>}
        </div>
    </>
}

// if(thisBot.tags.currentTries+1 === thisBot.tags.totalTries && thisBot.tags.winAt > 7) thisBot.gameLose();

if(!that?.isGrayScaled && thisBot.tags.winAt > 7) setTag(thisBot,"currentTries",thisBot.tags.currentTries + 1);

os.compileApp('triedUI',<HintTries />);


// {thisBot.tags.winAt > 7 ?<p>Chances Left: {thisBot.tags.totalTries - thisBot.tags.currentTries} / {thisBot.tags.totalTries}</p>:<p>You Won!</p>}
