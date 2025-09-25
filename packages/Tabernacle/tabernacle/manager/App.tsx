const {useEffect} = os.appHooks;

import { useMouseMove } from 'app.hooks.mouseMove'


const App = () => {
    
    const { floatingApps } = useMouseMove()

    useEffect(() => {
        shout("OnMouseMoveContextChanged", { floatingApps })
    }, [ floatingApps ])

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