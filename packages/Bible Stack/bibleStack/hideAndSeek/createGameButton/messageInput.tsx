os.unregisterApp("showSelectedBook");
os.unregisterApp("messageInput");
os.registerApp("messageInput");

const {useState} = os.appHooks;
const { Modal, ButtonsCover, Input, Button } = Components;




// const onBackClick = () => {
//     os.unregisterApp("messageInput");
//     thisBot.showSelectBookMessage();
// }
// <Button onClick={onBackClick} backgroundColor="black">
//     Back
// </Button>

const MessageInput = () => {

    const [message,setMessage] = useState("");
    const [name,setName] = useState("");

    const onSkipClick = () => {
        whisper(thisBot,"createGame",{winMessage: message , creatorName: name});
        os.unregisterApp("messageInput");
    }


    const onNextClick = () => {
        if(!name){
            return os.toast("Your Name is Required!")
        }
        onSkipClick();
    }


    return <Modal onClose={()=>{}} >
           <div>
                <p>Would you like to include a message to be revealed at the end of the game?</p>
                <Input value={name} onChangeListener={setName} placeholder="Please Enter your name"  />
                <Input value={message} onChangeListener={setMessage} placeholder="Your message here"  />
                <ButtonsCover>
                   
                    <Button onClick={onSkipClick} backgroundColor="black">
                        Skip
                    </Button>
                    <Button onClick={onNextClick} backgroundColor="black">
                        Next ➤
                    </Button>
                </ButtonsCover>
           </div>
    </Modal>
}

os.compileApp("messageInput",<MessageInput/>);

