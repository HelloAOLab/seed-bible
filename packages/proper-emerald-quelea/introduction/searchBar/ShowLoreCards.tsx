shout("clearUi")
SetShowDonateButton(false);

os.unregisterApp("loreCard");
os.registerApp("loreCard");

const { Button , ButtonsCover } = Components;
const { LoreCardItem } = thisBot.LoreCardItem();
const { useState, useCallback, useEffect, useRef } = os.appHooks;
const { data } = thisBot.LoreCardData();
const LoreCardTutorailJSX =  getBot("system","loreCard.app").LoreCardTutorial();

const len = data.length;
shout("playSound",{soundName: "ConfirmLanguageButton"});

const LoreCard = () => {

    const [range,setRange] = useState([0,1,2,3,4]);

    const [selectedCard,setSelectedCard] = useState(-3);
    const [subCard,setSubCard] = useState(4);

    const onButtonClick = useCallback(async ()=>{
        shout("playSound",{soundName: "BookShrink"});  
        setSelectedCard(-2)
        await os.sleep(3500);
        setRange(p=>{
            return p.map(ran=>(ran+5) % len);
        });
        await os.sleep(2500);
        shout("playSound",{soundName: "SectionExpand"});
        await os.sleep(1000);
        setSelectedCard(-1);
        await os.sleep(50);
        setSelectedCard((range[4] + 1) % len);
    },[range]);

    const onForthMainCardSelect = useCallback(async (val = -1)=>{
        setSelectedCard(p=>{
            if(val === 1){
                return range[(p + 1) % 5];
            }else {
                return range[((p - 1) + 5) % 5];
            }
        });
        await os.sleep(1000);
        shout("playSound",{soundName: "DropArrangementElement"});
    },[range])

    const onForthCardSelect = useCallback(async (val = -1)=>{
        // We are using Row Reverse in UI to the If checks are odd to see
        setSubCard(p=>{
            if(p === 0 && val === 1) {
                onForthMainCardSelect(1)
            }
            if(p === 4 && val === -1) {
                onForthMainCardSelect(-1);
            } 
            if(val === -1){
                shout("playSound",{soundName: "ReceivingSignal"});
                return (p + 1) % 5;
            }else {
                shout("playSound",{soundName: "ReceivingSignal"});
                return ((p - 1) + 5) % 5;
            }
        });
    },[onForthMainCardSelect]);

    useEffect(()=>{
        (async ()=>{
            await os.sleep(3000);
            shout("playSound",{soundName: "SectionExpand"});
            await os.sleep(1000);
            setSelectedCard(-1);
            await os.sleep(50);
            setSelectedCard(0);
        })();
    },[]);

    return <>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
        <style>{thisBot.tags["lore-card.css"]}</style>
        {selectedCard !== -3 && <div className="lore-cards-left-actions">
            <ButtonsCover style={{zIndex: '1000',justifyContent: 'center'}}>
                    <Button isDisabled={ selectedCard === -2 } style={{width: 'auto',minWidth: 'auto',justifyContent: 'center'}} backgroundColor="black" onClick={onButtonClick} >Next Deck</Button>
                </ButtonsCover>
          </div>
        }
        <div className="lore-card-container">
            <div className="description__programming">
                {
                    range.map((ranItem,index)=>{
                            const dataItem = data[ranItem];
                            return <LoreCardItem index={index % 5} subCard={subCard} setSubCard={setSubCard} id={dataItem.id} key={index % 5} selectedCard={selectedCard} setSelectedCard={setSelectedCard} dataItem={dataItem.data} title={dataItem.title}  />
                        }
                    )
                }
           
            </div>
        {selectedCard !== -3 &&  
        <div className="lore-cards-user-actions">
            <ButtonsCover style={{zIndex: '1000'}}>
                <Button isDisabled={ selectedCard === -2 } style={{width: 'auto',minWidth: 'auto',padding: '0',borderRadius: '4px',marginLeft: '4px',overflow: 'hidden'}} backgroundColor="black" onClick={()=>{onForthCardSelect(-1)}} >
                    <span  style={{border: "none",backgroundColor: 'transparent',backdropFilter: 'none'}} className="item material-symbols-outlined">chevron_left</span>
                </Button>
                <Button isDisabled={ selectedCard === -2 } style={{width: 'auto',minWidth: 'auto',padding: '0',borderRadius: '4px',marginLeft: '4px',overflow: 'hidden'}} backgroundColor="black" onClick={()=>{onForthCardSelect(1)}} >
                    <span  style={{border: "none",backgroundColor: 'transparent',backdropFilter: 'none'}} className="item material-symbols-outlined">chevron_right</span>
                </Button>
            </ButtonsCover>
        </div>}
        {selectedCard !== -3 && <LoreCardTutorailJSX />}
        </div>
    </>;
}
//  <h2 className="heading__secondary">Lore Card</h2>

// <span className="description__programming__card__icon--1">
//     {dataItem.name}
// </span>

os.unregisterApp("quitGame");
os.registerApp("quitGame");

const QuitGame = () => {
    return <>
        <style>{thisBot.tags['google-icon.css']}</style>
        <div 
            style={{
                position: "fixed",
                top: '20px',
                right: "20px",
                zIndex: '99'
            }}
        >
            <Button 
                backgroundColor="black"
                onClick={()=>{
                    os.unregisterApp("loreCard");
                    os.unregisterApp("quitGame");
                    SetShowDonateButton(true);
                    shout("initUi");
                }}
            >
                ➲ Quit
            </Button>
        </div>
    </>

}

os.compileApp("loreCard",<LoreCard />);
os.compileApp("quitGame",<QuitGame/>);


