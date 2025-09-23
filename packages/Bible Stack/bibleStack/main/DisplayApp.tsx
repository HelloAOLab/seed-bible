const App = await thisBot.App();
await thisBot.ClearStacks()


const id = uuid();
const appConfig = {
    id,
    App: <App />,
    // to: 'panel',
    minWidth: '40rem',
}
if(thisBot.vars.appId)
{
    globalThis.ReplaceApplication(thisBot.vars.appId, appConfig)
}
else
{
    globalThis.AddApplication(appConfig);
}

thisBot.vars.appId = id;

await os.sleep(500);

const RecenterButton = () => {
    return (
        <button style={{position: "absolute", top: "8px", right: "8px"}} onClick={() => {console.log(`[Debug] Button clicked`)}}>Click me!</button>
    )
}

const appName = "stackUI"
await os.unregisterApp(appName);
await os.registerApp(appName, thisBot);
os.compileApp(appName, <RecenterButton />);

if(thisBot.vars.appId === id)
{
    setTagMask(thisBot, "isBibleAnimating", true);
    thisBot.CreateNewBible({position: {x: 0, y: 0}});
}