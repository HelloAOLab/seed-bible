// whisper this function with tutorialName and saveStateTag arguments i.e {tutorialName: "bible-location", saveStateTag: "initMap"}

// tutorialname is the argument for the tutorial you are trying to define in getTutorial.tutorials

// saveStateString is the name of the masks by which the app will know whether the tutorial has happened or not

await os.unregisterApp('showTutorial');
await os.registerApp('showTutorial', thisBot);

const dim = os.getCurrentDimension();
const {useState, useEffect, useMemo, useCallback} = os.appHooks;

const { Modal, Button } = Components;

const endTutorial = async () => {
    setTagMask(thisBot, that.saveStateTag, true, "tempLocal");
    await os.unregisterApp('showTutorial');
}

const App = () => {

    const [tutorialStep, setTutorialStep] = useState(0);
    const [modalOpacity, setModalOpacity] = useState(1);
    const steps = useMemo(() => {
        return getTutorial({tutorialName: that.tutorialName, setModalOpacity, tutorialStep, setTutorialStep})
    }, [tutorialStep, that.tutorialName])

    globalThis.setModalOpacity = setModalOpacity;

    return <>
        <style>
            {`
                .backdrop {
                    z-index: 1001;
                }
            `}
        </style>
        <Modal styles={{opacity: modalOpacity, transition: "0.5s linear opacity", zIndex: 10000}}>
            {
                gridPortalBot.tags.pixelWidth < 720 ?
                    steps[tutorialStep]?.imageUrl && <video playsinline style={{height: '300px',display: 'block',margin: 'auto'}} alt="loaction-tutorial" src={steps[tutorialStep].imageUrl.mobile} loop autoplay /> :
                    steps[tutorialStep]?.imageUrl && <video playsinline style={{height: '300px',display: 'block',margin: 'auto'}} alt="loaction-tutorial" src={steps[tutorialStep].imageUrl.web} loop autoplay />
            }
            {
                Object.values(steps[tutorialStep].strings).map(message => {
                    return message
                })
            }
            <div className="buttons" style={{width: "100%"}}>
                {
                    tutorialStep === 0 ? <Button onClick={() => endTutorial()} backgroundColor="black">
                        Skip ➤
                    </Button> : <div></div>
                }
                <Button onClick={() => steps[tutorialStep].action()} backgroundColor="black">
                    {steps[tutorialStep].btnName} ➤
                </Button>
            </div>
        </Modal>
    </>
};

const getTutorial = ({tutorialName, setModalOpacity, tutorialStep, setTutorialStep}) => {
    let tutorials = [
        {
            tutorialName: "bible-location",
            tutorialSteps: [
                {
                    imageUrl: {
                        web: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox1/15677051c2dc92d40538b6212cdc9883faea980914c007745460af901905293f.mp4",
                        mobile: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/5bc71d44be4e0e65a786206bf173bb676b1eb8b04824ff6154eba5d9626afc4f.mp4"
                    },
                    strings: {
                        0: <p style={{color: "black"}}>Here you can explore <span className="text-blue text-heavy">locations in the Bible</span>!</p>
                    },
                    action: async () => {
                        setModalOpacity(0);
                        setCurrentExperience(2);
                        setOpenSidebar(true);
                        try{
                            for(let i = 0; i < 7; i ++){
                                setLocationPage(locationPage + 1);
                                shout("playSound",{soundName: "DialogClick"});
                                await os.sleep(1000);
                            }
                        }catch{
                            setTutorialStep(tutorialStep + 1);
                            setModalOpacity(1);
                        }
                        setTutorialStep(tutorialStep + 1);
                        setModalOpacity(1);
                    },
                    btnName: "Show me"
                },
                {
                    imageUrl: {
                        web: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox1/fe9b21cb5d0a2d6af9757130575e2321a88a711e2292532bfc9c4cb725f98cad.mp4",
                        mobile: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox1/26ef881821790389488e31e1ba129a61abf25091b6276ae8a02499364f0f0ab9.mp4"
                    },
                    strings: {
                        0: <p style={{color: "black"}}>Select a location to pull it up on the map!</p>,
                        1: <p style={{color: "black"}}>Let's check out Jesusalem!</p>
                    },
                    action: async () => {
                        setModalOpacity(0);
                        await os.sleep(1000);
                        let searchArr = ["j", "e", "r", "u"];
                        for(let i = 0; i < searchArr.length; i++){
                            setLocationSearch(locationSearch + searchArr[i]);
                            shout("playSound",{soundName: "DialogClick"});
                            await os.sleep(1000)
                        }
                        await os.sleep(1500);
                        setOpenSidebar(false);
                        setCurrentExperience(1);
                        shout("closeShareButton");
                        whisper(thisBot, "handleGeoJsonSearch", {
                            "place": {
                                "place": "Jerusalem",
                                "geojson": "m66c5b8"
                            }
                        });
                        setTutorialStep(tutorialStep + 1);
                    },
                    btnName: "Show me"
                },
                {
                    imageUrl: {
                        web: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox1/1fa0f74906767dece60bd1eb7ce9555447bfc61dfa0b60dbac109bc4e48c6243.mp4",
                        mobile: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/7c54bac0cd1cc705099237cfdeb9e69fa4850cc61f680dc5ad39cbecfdb4425d.mp4"
                    },
                    strings: {
                        0: <p style={{color: "black"}}>Scroll or pinch to <b>zoom in</b> or <b>out</b>.</p>
                    },
                    action: async () => {
                        setModalOpacity(0);
                        let JerusalemBot = getBot(byTag('label', 'Jerusalem'), byTag('form', 'nothing'), byTag('labelColor', 'black'));
                        await os.focusOn(JerusalemBot, {
                            duration: 2,
                            zoom: JerusalemBot.tags.zoom * 0.5
                        });
                        await os.sleep(1500);
                        await os.focusOn(JerusalemBot, {
                            duration: 2,
                            zoom: JerusalemBot.tags.zoom * 2
                        });
                        await os.focusOn(JerusalemBot, {
                            duration: 2,
                            zoom: JerusalemBot.tags.zoom
                        });
                        setTutorialStep(tutorialStep + 1);
                        setModalOpacity(1);
                    },
                    btnName: "Show me"
                },
                {
                    imageUrl: {
                        web: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox1/110460d8c5e012016c691e9f5746ef781830ab66e94d4dfb79bca33df9d7d837.mp4",
                        mobile: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/99009ca92d5b126fe17df3d02c0c2751867efe0d87d3e1fdd26e6e613179981b.mp4"
                    },
                    strings: {
                        0: <p style={{color: "black"}}>Twist with two fingers on the screen or right click to <b>rotate</b>.</p>
                    },
                    action: async () => {
                        setModalOpacity(0);
                        await os.sleep(2000);
                        let JerusalemBot = getBot(byTag('label', 'Jerusalem'), byTag('form', 'nothing'), byTag('labelColor', 'black'));
                        await os.focusOn(JerusalemBot, {
                            duration: 2,
                            rotation: {
                                x: Math.PI * 0.4,
                                y: Math.PI * 0.4,
                                normalize: false
                            }
                        })
                        await os.sleep(1000);
                        await os.focusOn(JerusalemBot, {
                            duration: 2,
                            rotation: {
                                x: 0,
                                y: 0,
                                normalize: false
                            }
                        })
                        await os.sleep(2000);
                        setTutorialStep(tutorialStep + 1);
                        setModalOpacity(1);
                    },
                    btnName: "Show me"
                },
                {
                    strings: {
                        0: <p style={{color: "black"}}>We hope to add many more locations and paths through the Bible in the future!</p>,
                        1: <p style={{color: "black"}}><b>You're ready to go! Enjoy!</b></p>
                    },
                    action: async () => {
                        endTutorial();
                    },
                    btnName: "Continue"
                }
            ]
        },
        {
            tutorialName: "chaism-tutorial",
            tutorialSteps: [
                {
                    strings: {
                        0: <p style={{color: "black"}}>Did you know the Bible is a kind of <b>mountain range?</b></p>
                    },
                    action: async () => {
                        setModalOpacity(0);
                        await os.sleep(1000);
                        setTutorialStep(tutorialStep + 1);
                        setModalOpacity(1);
                    },
                    btnName: "Next"
                },
                {
                    strings: {
                        0: <p style={{color: "black"}}>Really! In English we put the most important ideas in the beginning or end of something written.</p>,
                        1: <p style={{color: "black"}}>But that's <b>not</b> how Biblical authors usually do it!</p>
                    },
                    action: async () => {
                        setModalOpacity(0);
                        await os.sleep(1000);
                        setTutorialStep(tutorialStep + 1);
                        setModalOpacity(1);
                    },
                    btnName: "Next"
                },
                {
                    strings: {
                        0: <p style={{color: "black"}}>When they want to <b>show us something important</b> they often put it in the <b>middle!</b></p>
                    },
                    action: async () => {
                        setModalOpacity(0);
                        await os.sleep(1000);
                        setTutorialStep(tutorialStep + 1);
                        setModalOpacity(1);
                    },
                    btnName: "Next"
                },
                {
                    strings: {
                        0: <p style={{color: "black"}}>Take a moment to read these verses!</p>
                    },
                    action: async () => {
                        setModalOpacity(0);
                        await os.sleep(10000);
                        setTutorialStep(tutorialStep + 1);
                        setModalOpacity(1);
                    },
                    btnName: "Next"
                },
                {
                    strings: {
                        0: <p style={{color: "black"}}>In this passage we see Jesus <b>heal</b> a leper.</p>
                    },
                    action: async () => {
                        setModalOpacity(0);
                        await os.sleep(1000);
                        setTutorialStep(tutorialStep + 1);
                        setModalOpacity(1);
                    },
                    btnName: "Next"
                },
                {
                    strings: {
                        0: <p style={{color: "black"}}>Look how the ideas of <b style={{color: "blue"}}>lepers</b>, <b style={{color: "green"}}>willingness</b>, and <b style={{color: "#E65100"}}>being clean</b> <b>repeat!</b></p>
                    },
                    action: async () => {
                        setModalOpacity(0);
                        await that.handleMakeMountain();
                        await os.sleep(3000);
                        setTutorialStep(tutorialStep + 1);
                        setModalOpacity(1);
                    },
                    btnName: "Next"
                },
                {
                    strings: {
                        0: <p style={{color: "black"}}>The height of this text is not that Jesus healed a man but rather that he <b>touched him!</b></p>
                    },
                    action: async () => {
                        setModalOpacity(0);
                        await os.sleep(1000);
                        setTutorialStep(tutorialStep + 1);
                        setModalOpacity(1);
                    },
                    btnName: "Next"
                },
                {
                    strings: {
                        0: <p style={{color: "black"}}>This structure is called a chiasm, and they are all over Bible!</p>
                    },
                    action: async () => {
                        setModalOpacity(0);
                        await os.sleep(1000);
                        setTutorialStep(tutorialStep + 1);
                        setModalOpacity(1);
                    },
                    btnName: "Next"
                },
                {
                    strings: {
                        0: <p style={{color: "black"}}>We want to make many tools like this to help people make and share all sorts of Biblical ideas!</p>
                    },
                    action: async () => {
                        endTutorial();
                    },
                    btnName: "Let's explore!"
                },
            ]
        }
    ]
    for(let i = 0; i < tutorials.length; i++){
        if(tutorials[i].tutorialName === tutorialName){
            return [...tutorials[i].tutorialSteps];
        }
    }
}

os.compileApp('showTutorial',<App />);