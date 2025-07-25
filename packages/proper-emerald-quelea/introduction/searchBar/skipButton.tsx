os.unregisterApp("skipAnimation");
os.registerApp("skipAnimation");

const { Button } = Components;

const SkipAnimation = () => {
    return <>
        <style>{thisBot.tags['google-icon.css']}</style>
        <div 
            style={{
                position: "fixed",
                bottom: '20px',
                right: "20px",
                zIndex: '99'
            }}
        >
            <Button 
                backgroundColor="black"
                onClick={()=>{
                    
                    globalThis.skipAnimation = true;
                    os.unregisterApp("skipAnimation");
                }}
            >
                Skip
            </Button>
        </div>
    </>
}

os.compileApp("skipAnimation",<SkipAnimation/>);