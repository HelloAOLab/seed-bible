const message = that || "Playlist Mode";
const { FloatingBanner } = Components;

os.unregisterApp("message");
os.registerApp("message");

const InfoMessage = ()=> <FloatingBanner>
        <b>{message}</b>
    </FloatingBanner>;

os.compileApp("message",<InfoMessage/>);