// shout("clearUi")
os.unregisterApp('shareButton');
await os.unregisterApp('eventTimeLine');
await os.registerApp('eventTimeLine', thisBot);
const css = thisBot.tags["App.css"];
const { Button } = Components;
const {useState, useEffect, useMemo, useCallback, useRef} = os.appHooks;

const App = () => {
    const handleClose = async () => {
        os.goToDimension("home");
        setOpenSidebar(false);
        await os.focusOn({x: 0, y: 0}, {
            duration: 1,
            rotation: {x: 1.01229, y:0.5},
            zoomValue: 7
        })
        shout("initUi")
        destroy(getBots("eventTimeLine"));
        thisBot.tags.eventBotIds = [];
        thisBot.tags.dataSlitsManager = {
            "dataList": [],
            "selectedIndex": null,
            "state": ""
        };
        await os.unregisterApp('slider')
        await os.unregisterApp('eventTimeLine');
    }

    const openSideBar = () => {
        setCurrentExperience(9);
        setOpenSidebar(true);
    }

    useEffect(() => {
        setTimeout(() => {
            shout("userOptions");
        }, 500)
    }, [])

    useEffect(() => {
        globalThis.eventTLActive = true;
        return () => {
            globalThis.eventTLActive = null;
        }
    }, [])

    return (
        <>
        <style>{css}</style>
        <style>{`
            .DonationStackButton{
                opacity: 0;
                display: none;
            }
        `}</style>
        <Button onClick={handleClose} varient="white-background" style={{ zIndex: 10005, position: "fixed", top: "20px", right: "20px", width: "80px", height: "40px"}}>
            ➲ Quit
        </Button>
        </>
    )
}
 
os.compileApp('eventTimeLine',<App />);