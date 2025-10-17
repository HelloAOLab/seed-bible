if(!that || !globalThis.hideSeekPlaying) return;

os.unregisterApp("showMessage");

const dimension = os.getCurrentDimension();

const isHotter = that.isHotter;

const isGrayScaled = that.isGrayScaled;

const comparisionFunction = (curRank,expectedRank)=> isHotter ? curRank >=  expectedRank : curRank <= expectedRank; 

const currBook = getBot("bookRank",that.currBookRank);

let bookBots = isGrayScaled ? [] : getBots(
    byTag("system","baseElements.book"),
    byTag("#bookRank", (bookRank)=>comparisionFunction(bookRank,that.currBookRank),
    byTag("#color",(color)=>!!color)
));
const sectionBots = getBots(
    byTag("system","baseElements.section"),
    byTag("#sectionRank", (sectionRank)=>comparisionFunction(sectionRank,that.currSectionRank),
    byTag("#color",(color)=>!!color),
    byTag("selected", false)
));


const sorter = isHotter ? -1 : 1;

bookBots = bookBots.sort((a,b)=>(a.tags.bookRank - b.tags.bookRank) * sorter).filter(book=>!book.tags.isGrayScaled);

if (sectionBots) {
    whisper(sectionBots,"changeColor", {grayScaleColor: true});
}


const x = gridPortalBot.tags.cameraFocusX;
const y = gridPortalBot.tags.cameraFocusY;
let z = gridPortalBot.tags.cameraFocusZ;

if(!isGrayScaled) {
    try {
        os.focusOn(
            {
                x, 
                y,
                z,
            }, 
            {
                duration: 0.05 * (bookBots.length ? bookBots.length + 30 :0),
                zoom: Math.min((globalThis.hideSeekZoom || 5), 8),
                easing: {type: "sinusoidal", mode: "inout"},
                rotation: {x: 1.01229, y:0.5},
            }
        );
    } catch {

    }
}

if (bookBots.length > 0) {
    const soundID = await soundsManager.playSound({soundName: "GUESSING-GAME-FADE-IN"});
    for (let i=0; i<bookBots.length; i++) {
        const book = bookBots[i];
        const blinkSelf = book.tags.bookRank === that.currBookRank ? true : false;
        if(i===(bookBots.length - 1)) os.cancelSound(soundID);
        await book.changeColor({grayScaleColor: true , blinkSelf})
    }
    shout("playSound",{soundName: "GUESSING-GAME-LAST-FADE"});
    await os.sleep(200);
}



if (that.wins) {
    hotseatPlayRange(p=>{
        const old = {...p};
        old.winnerBook = that.currBookRank;
        return old;
    });
    setTag(thisBot, "winAt", thisBot.tags.currentTries - 1);
    whisper(thisBot,"gameWon",{prizeBookName: thisBot.tags.gameData.bookName});
    introductionManager.makePortalFree();
    globalThis.bookClickWait = false;
    return;
}

os.registerApp("showMessage");

let radius = Math.floor(25 * Math.random());
let angle = Math.random() * Math.PI;
if(isHotter) {
    angle += Math.PI;
}
let randomX = `calc(50% + ${Math.cos(angle) * radius}px)`;
let randomY = `calc(${isHotter?"10":"90"}% + ${Math.sin(angle) * radius}px)`;


if(thisBot.tags.currentTimeout) {
    clearTimeout(thisBot.tags.currentTimeout);
}



const ShowMessage = () => {
    return <div 
        style={{
            left: randomX,
            top: randomY,
            transform: `translate(-50%)`,
            position: 'absolute',
        }} 
        className={`chance-message ${isHotter?"hotter":"colder"}`}
    >
        <p style={{margin: 0}} >{isHotter?`Go Below!`:`Go Above!`}</p>
    </div>
}

const currentTimeout = setTimeout(()=>{
    os.unregisterApp('showMessage');
    setTag(thisBot,"currentTimeout",null);
},4000);

const arrowBot = getBot(byTag("system","hideAndSeek.arrowPointer"),byTag("initialized",false));
const arrowBotActive = getBots(byTag("system","hideAndSeek.arrowPointer"),byTag("initialized",true));

if(arrowBotActive.length){
    destroy(arrowBotActive.map(ele=>ele.id));
}

if(thisBot.tags.currentTimeout){
    clearTimeout(thisBot.tags.currentTimeout);
    setTag(thisBot,"currentTimeout",null);
}

const firstBot = create(arrowBot,{
    [dimension]: true,
    [dimension + "X"]: currBook.tags.homeX + 8,
    [dimension + "Y"]: currBook.tags.homeY,
    [dimension + "Z"]: currBook.tags.homeZ - 2,
    space: "tempLocal",
    isHotter: isHotter,
    initialized: true
});


const secondBot = create(arrowBot,{
    [dimension]: true,
    [dimension + "X"]: currBook.tags.homeX + 8,
    [dimension + "Y"]: currBook.tags.homeY,
    [dimension + "Z"]: currBook.tags.homeZ + 2,
    space: "tempLocal",
    isHotter: isHotter,
    initialized: true
});

const aimBot = isHotter ? firstBot : secondBot;
const startBot = isHotter ? secondBot : firstBot;

setTag(startBot,"lineTo",aimBot.id);
try {
    animateTag(aimBot,{
        fromValue: {
            scaleX: aimBot.tags.scaleX,
            scaleZ: aimBot.tags.scaleZ,
            scaleY: aimBot.tags.scaleY,
        },
        toValue: {
            scaleX: 0,
            scaleZ: 0,
            scaleY: 0,
        },
        duration: 0.1
    });
}catch {

}

shout("playSound",{soundName: !that.isGrayScaled?"ArrowPointerGuessingGame":"AlertAnimation"});

if (isHotter) {
    z -= 4;
}else {
    z += 4;
}

try {
    os.focusOn(
        {
            x, 
            y,
            z,
        }, 
        {
            duration: 1,
            easing: {type: "sinusoidal", mode: "inout"},
        }
    );

} catch {
    
}

const timeout = setTimeout(()=>{
    destroy([firstBot,secondBot]);
},2000);

setTag(thisBot,"currentTimeout",timeout);
introductionManager.makePortalFree();
globalThis.bookClickWait = false;
os.compileApp("showMessage",<ShowMessage/>);