let icon = that?.icon || "rebase";
os.unregisterApp('mouseCursor')
await os.registerApp('mouseCursor', thisBot)
const { useEffect, useState } = os.appHooks

let MouseCursor = () => {
    let [pointer, setPointer] = useState(gridPortalBot.tags.pointerPixel);

    useEffect(() => {
        const interval = setInterval(() => {
            setPointer(gridPortalBot.tags.pointerPixel);
        }, 20);
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
            <div style={{ position: 'absolute', left: pointer.x + 5, top: pointer.y - 15, 'background-color': 'transparent', zIndex: "200002" }}>
                <div style={{ width: 'fit-content', zIndex: 200002, 'user-select': 'none', color: 'black', background: 'transparent' }}>
                    <span class="material-symbols-outlined unfollow"> {icon} </span>
                    <span style={{ fontSize: "10px" }}>
                        Drop To Link
                    </span>
                </div>
            </div>
            <style>{tags['Styles.css']}</style>
            <style>{tags['panal.css']}</style>
        </>
    )
}
os.compileApp('mouseCursor', <MouseCursor />)