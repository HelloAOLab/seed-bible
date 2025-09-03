const {useEffect} = os.appHooks;

import { useTabsContext } from 'app.hooks.tabs';

const App = () => {

    const { spaces, activeSpace, tabs, activeTab } = useTabsContext();

    useEffect(() => {
        shout("OnTabsContextChanged", {spaces, activeSpace, tabs, activeTab})
    }, [spaces, activeSpace, tabs, activeTab])

    return <div style={{width: "100%", height: "100%"}}>
        <div
            className="mainCanvas"
            style={{
                width: "100%",
                height: "100%",
                border: "1px solid black",
                overflow: "auto"
            }}
        ></div>
    </div>
}

return App;