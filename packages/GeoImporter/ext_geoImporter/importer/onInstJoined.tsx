import * as opentypeJs from 'https://esm.run/opentype.js';
globalThis.GlobalBaseMap = "satellite"
globalThis.OpentypeJs = opentypeJs;
if (configBot.tags.systemPortal) return;

const focusOnWithCatch = async ({bot, position, options}) => {
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