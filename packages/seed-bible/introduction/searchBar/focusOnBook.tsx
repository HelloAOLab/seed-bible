
return
let bookName = that.bookname;
setVersesState([])
let bookArrangementObj = getBot("system", "introduction.manager").tags.bibleArrangementsArray[0];
// os.log(bookArrangementObj,'bookArrangementObj')
let name = null;
let sectionName = null;
let commonName = null;
updateCustomHeight(0)
try{
    setVersesState([])
}catch{
    os.log('not globaled yet')
}
   let MainBot =  getBot('phrase','firstPhrase')


for(let i = 0; i < bookArrangementObj.length; i++){
    name = bookArrangementObj[i].name;
    // os.log(bookArrangementObj[i].sections,i)
    let sections = Object.keys(bookArrangementObj[i].sections);
    for(let j = 0; j < sections.length; j++){
        sectionName = sections[j];
        let sectionArray = bookArrangementObj[i].sections[sections[j]];
        for(let k = 0; k < sectionArray.length; k++){
            if(sectionArray[k].commonName === that.bookname){
                commonName = sectionArray[k].commonName;
            }
            if(commonName){
                break
            }
        }
        if(commonName){
            break
        }
    }
    if(commonName){
        break
    }
}

if(!commonName) globalThis.arrowActionsFreeze = false;

async function openBook(bookBot,commonName){
    shout('closeFormMenu')
    if(bookBot.masks.isSelected)
    {
        bible.openAt(`${bookBot.tags.bookName} ${that.chapter}:1`)
        await os.sleep(100)
        updateCustomHeight(0.8)
        globalThis.arrowActionsFreeze = false;
    }
    else
    {
        setTagMask(bookBot, "searchSelect", {commonName: commonName, chapter: that.chapter}, "tempLocal");
        await bookBot.interact().then(async () => {
            if(!bookBot.masks.isSelected)
            {
                setTagMask(bookBot, "searchSelect", {commonName: commonName, chapter: that.chapter}, "tempLocal");
                await bookBot.interact().then(async () => {
                    if(!bookBot.masks.isSelected)
                    {
                        setTagMask(bookBot, "searchSelect", {commonName: commonName, chapter: that.chapter}, "tempLocal");
                        await bookBot.interact();
                    }
                })
            }

        });
        globalThis.arrowActionsFreeze = false;
    }
    try{
        setVersesState([])
    }catch{
        os.log('setVersesState not global yet')
    }
}

let interactWithBook = () => {
    let bookBot = getBot(byTag("bookName", commonName), byTag("isBook", true));
    // console.log(bookBot);
   if(bookBot){
        os.focusOn(bookBot, {
            duration: 1,
            easing: "quadratic",
            // zoom: 10
        }).then(async() => {
            // os.log(commonName,'commonName')
           openBook(bookBot,commonName);
        })
    }
}

let interactWithSection = async () => {
    let sectionBot = getBot(byTag("isSection", true), byTag('sectionName',sectionName.toLowerCase()));
    os.log(sectionBot,sectionName,'sectionBotdd');

    // Double time is for interaction and select
    await sectionBot.interact({ notATour: true});
    await sectionBot.interact({ notATour: true});
    interactWithBook();
    // setTimeout(() => {
        // let bookBot = getBot(byTag("bookName", commonName));
        // os.focusOn(bookBot, {
        //     duration: 1,
        //     easing: "quadratic",
        //     zoom: 10
        // }).then(() => {
        //     whisper(bookBot, "interact", {center: true, chapter: that.chapter, stayClose: true})
        //     bible.openAt(`${commonName} ${that.chapter}:1`)
        // })
        // interactWithBook()
    // }, 4000)
}

// isMainWordLowerCover

// infoLabel

const mainWordBibleOldTestament = getBot("isOldTestament", true);
const mainWordBibleNewTestament = getBot("isNewTestament", true);

const bookTestament = globalThis.findNameRank(commonName)?.testament === "Old Testament" ? mainWordBibleOldTestament : mainWordBibleNewTestament;
if(bookTestament) {
    bookTestament.convertIntoArrangement();
    await os.sleep(4000);    
}

let bibleLowerCover = getBot(byTag("isMainWordLowerCover", true));
let infoLabelBot = getBot("infoLabel");
let sectionBot = getBot(byTag("sectionName", sectionName));
let bookBot = getBot(byTag("bookName", commonName));
let formMenu = getBot("system", "baseElements.formMenu");

whisper(formMenu, "closeFormMenu");

// os.log(bookBot,'bookBot1');
if(bookBot){
    // openBook(bookBot,commonName)
    interactWithBook();
}else{
    interactWithSection();
}  