/**
 * Renders a video player modal that allows users to view YouTube videos based on provided parameters.
 * 
 * @param {Object} that - Configuration parameters for the video renderer.
 * @param {string} that.botType - The type of bot.
 * @param {number} that.botRank - The rank of the bot.
 * @param {Object} that.lerpedObject - An optional lerped object for transitions.
 * @param {string} that.width - The width of the video player (default is "100%").
 * @param {string} that.height - The height of the video player (default is "206").
 *
 * @example
 * InstanceManager.RenderVideo({
 *     botType: 'exampleType',
 *     botRank: 1,
 *     lerpedObject: someLerpedObject,
 *     width: '100%',
 *     height: '206'
 * });
 */

const { Modal, Button, ButtonsCover, Tabs } = Components;
const { useMemo, useState } = os.appHooks;
os.unregisterApp("videoRenderer");
os.registerApp("videoRenderer");
globalThis.videoBeingRendered = true;
globalThis.CLEARABLE_LERPING = false;
const closeClick = () => {
    os.unregisterApp("videoRenderer");
    globalThis.videoBeingRendered = false;
};

const width = that?.width || "100%";
const height = that.height || "206";
const AOLABSRC = "https://helloaolab.my.canva.site/images/508bf8e3a36b2a0124d06a721f99f284.png";

const botType = that.botType;
const rank = that.botRank;

const lerpedObject = that.lerpedObject;

if(lerpedObject) {
    setTimeout(()=>{
        lerpedObject.TryToUnlerp();
    },200)
}

const VideoRenderer  = () => {

    const [srcParams,setSrcParams] = useState({
        botType,
        rank,
        index: 0
    });

    const [transition,setTransition] = useState(false);

    const setSelectPart = (id: number)=>{
        if(id === srcParams.index) return;
        if(globalThis.IFRAME_YT_TRANSITION) {
            clearTimeout(globalThis.IFRAME_YT_TRANSITION);
        }
        setTransition(true);
        setSrcParams(prev=>({
            ...prev,
            index: id
        }));

        globalThis.IFRAME_YT_TRANSITION = setTimeout(()=>{
            setTransition(false);
        },500);
    };

    const srcIDs = useMemo(()=> thisBot.tags.bibleVideoIDs[srcParams.botType][srcParams.rank],[srcParams.rank,srcParams.botType]);
    
    return <>
        <style>{thisBot.tags["videoRenderer.css"]}</style>
        <Modal showIcon={false}  styles={{padding: 0, width: 'auto', borderRadius: '16px'}}>
            <div>
                <div className="video-container-modal">
                    <iframe
                        src={`${globalThis.CONSTANTS.YT_PREFIX}/${srcIDs[srcParams.index]}`}
                        style={{ borderRadius: "16px",width,height }}
                        title="YouTube video player"
                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; autoplay;"
                        allowFullScreen
                        className={`video-iframe ${transition ? "transition" : "" }`}
                    />
                    <div className="img-loader-container" style={{display: "grid", placeItems: 'center', height: '100%',width: '100%'}}>
                        <img src={AOLABSRC} alt="AO" className="img-loader" />
                    </div>
                    <ButtonsCover>
                        <Button onClick={closeClick} >Close</Button>
                        {srcIDs.length > 1 && <Tabs 
                            options={srcIDs.map((_,index)=>({value: index, label: `Part ${index+1}`}))}
                            setSelectedOptions={setSelectPart}
                            selectedIndex={srcParams.index}
                        />}
                    </ButtonsCover>
                </div>
            </div>
        </Modal>
    </>
}

os.compileApp("videoRenderer",<VideoRenderer />);


// Can be used Later with animations

//   const onClickNav = (order = 1)=>{
//         const typeNavOptions = Object.keys(thisBot.tags.bibleVideoIDs);
//         let typeNavSubOptions = Object.keys(thisBot.tags.bibleVideoIDs[srcParams.botType]);
//         const currentOptionIndex = typeNavOptions.findIndex(ele=>ele == srcParams.botType);
//         let newType = srcParams.botType;
//         let newRank = srcParams.rank;
//         if(srcParams.rank == typeNavSubOptions[typeNavSubOptions.length -1] && order === 1) {
//             newType = typeNavOptions[((currentOptionIndex + order) + typeNavOptions.length) % typeNavOptions.length];
//             newRank = 0;
//         } else if(srcParams.rank == 0 && order === -1) {
//             newType = typeNavOptions[((currentOptionIndex + order) + typeNavOptions.length) % typeNavOptions.length];
//             typeNavSubOptions = Object.keys(thisBot.tags.bibleVideoIDs[newType]);
//             newRank = typeNavSubOptions.length - 1; 
//         } else {
//             newRank = srcParams.rank + order;
//         }
//         console.log(newType,newRank);
//         setSrcParams({
//             botType: newType,
//             rank: newRank,
//             index: 0
//         })
//     };

//      <div style={{width: '200px', display: 'flex', justifyContent: "space-between" }}>
//                             <Button onClick={()=>onClickNav(-1)} backgroundColor="black">
//                                 Prev
//                             </Button>
//                             <Button onClick={()=>onClickNav(1)} backgroundColor="black">
//                                 Next
//                             </Button>
//                         </div>