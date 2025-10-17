os.unregisterApp("showSelectedBook");
os.unregisterApp("startGameTimer");
await os.registerApp("startGameTimer",thisBot);

const {useState , useEffect} = os.appHooks;
const { Modal, ButtonsCover, Input, Button } = Components;

const onPlayGame = async ()=>{
    await os.sleep(700)
    os.unregisterApp("startGameTimer");
    whisper(thisBot,"createGame",{winMessage: "" , creatorName: "", verse: that?.verse, refer: that?.refer});
}

const HotSeatStartMessage = () => {

    const [startTime,setStartTime] = useState(3);

    useEffect(()=>{
        let timer;

        if(thisBot.tags.isActive){
            if(startTime === 0){
                onPlayGame();
            } else {
                shout("playSound",{soundName: "ReceivingSignal"});
            }
            setTimeout(()=>{
                setStartTime(p=>p-1);
            },1500);
        }

        return ()=>{
            timer && clearTimeout(timer);
        }
    },[startTime])

    return <>
        <style>{thisBot.tags["index.css"]}</style>
        <Modal showIcon={false} styles={{backgroundColor: "transparent"}} >
           <div className="division">
               <p>{startTime > 0 ? startTime : "Go!"}</p>
           </div>
        </Modal>
    </>
}

os.compileApp("startGameTimer",<HotSeatStartMessage />);

