os.unregisterApp("showSelectedBook");
os.unregisterApp("hideAndSeekSideBar");
os.unregisterApp("hotseatStartScreen");
os.registerApp("hotseatStartScreen");

const dimension = os.getCurrentDimension();
const focusOnRotation = {x: 1.01229, y:0.5};


const { Modal, ButtonsCover, Input, Button } = Components;

const middleBot = getBot("isCrossHorizontalLine",true);
os.focusOn(
    {
        x: middleBot.tags[dimension + "X"] + 4, 
        y: middleBot.tags[dimension + "Y"] ,
        z: middleBot.tags[dimension + "Z"] ,
    }, 
    {
        duration: 0.5,
        rotation: focusOnRotation,
        zoom: 6,
        easing: {
            type: "sinusoidal",
            mode: "inout"
        }
    }
);

const onPlayClick = ()=>{
    os.unregisterApp("hotseatStartScreen");
     thisBot.showGameTimer(that);
}

const HotSeatStartMessage = () => {

    return <Modal onClose={()=>{}} >
           <div>
                <p style={{fontSize: '16px'}}><b>Which book</b> of the Bible was picked?</p>
                <p style={{fontSize: '16px'}}>See if you can <b>find it!</b></p>
                <ButtonsCover>
                    <p>{" "}</p>
                    <Button onClick={onPlayClick} backgroundColor="black">
                        Start ➤
                    </Button>
                </ButtonsCover>
           </div>
    </Modal>
}

os.compileApp("hotseatStartScreen",<HotSeatStartMessage />);

