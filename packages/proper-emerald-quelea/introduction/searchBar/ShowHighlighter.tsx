os.unregisterApp("highlighter");
os.registerApp("highlighter");

const { Highlighter } = Components;
const { useEffect } = os.appHooks;

const onClose = () => {
    os.unregisterApp("highlighter");
}

const HighLighter = ()=> {
    useEffect(()=>{ setTimeout(()=>{
        shout("playSound",{soundName: "AbsorbRawLight"});
    },50) },[]);
    return <Highlighter positionX="4px" positionY='45px'  clipPath="polygon(0% 0%, 0% 100%, calc(100% - 56px) 100%, calc(100% - 56px) calc(100% - 56px), 100% calc(100% - 56px), 100% 100%, calc(100% - 56px) 100%, calc(100% - 56px) 100%, 100% 100%, 100% 0%)" onClose={onClose}>
        <img style={{height: '300px',display: 'block',margin: 'auto'}} alt="search_demo" src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/05d37359b7dad43248fec5d9fca644b43dc0e54a0faded7c99abe91a74df923e.gif" />
        <p style={{fontWeight: "700"}} >Search here for quick navigation!</p>
    </Highlighter>
}

os.compileApp("highlighter",<HighLighter/>);