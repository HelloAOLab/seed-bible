if (configBot.tags.systemPortal) return;

const focusOnWithCatch = async ({bot, position, options}) => {
    console.log({bot, position, options})
    if(bot){
        try{
            await os.focusOn(bot, {
                ...options
            });
        }catch{ () => {
            os.log("Focus inturrupted by user");
        }
        }
    }else{
        try{
            await os.focusOn({...position}, {
                ...options
            });
        }catch{ () => {
            os.log("Focus inturrupted by user");
        }
        }
    }
}

globalThis.focusOnWithCatch = focusOnWithCatch;
// whisper(thisBot, "initialize");