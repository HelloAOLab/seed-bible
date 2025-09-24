const {useEffect} = os.appHooks;

import { useTabsContext } from 'app.hooks.tabs';
import { useBibleContext } from 'app.hooks.bibleVariables'

const App = () => {

    const { tabs, activeTab } = useTabsContext();

    useEffect(() => {
        shout("OnTabsContextChanged", { tabs, activeTab })
    }, [ tabs, activeTab ])

    return <div style={{width: "100%", height: "100%"}}>
        <div
            className="mainCanvas"
            style={{
                width: "100%",
                height: "100%",
                border: "1px solid black",
                overflow: "auto"
            }}
        >
        </div>
    </div>
}

return App;