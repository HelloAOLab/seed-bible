const appName = "platformerLoadingScreen";
await os.unregisterApp(appName);
await os.registerApp(appName, thisBot);
const css = thisBot.tags["platformerLoadingScreen.css"];

const App = () => {
    return <>
        <style>{css}</style>
        <div id="background">
            <div id="loader">
                <div id="box"></div>
                <div id="hill"></div>
            </div>
        </div>
    </>
}

os.compileApp(appName, <App />);