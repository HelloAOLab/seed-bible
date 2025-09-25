let { type } = that

if (!type) {
    return
}
await os.unregisterApp('mouseCursor')
await os.registerApp('mouseCursor', thisBot)
const { useEffect, useState } = os.appHooks

setTagMask(thisBot, "pointer", true, "tempLocal")

let MouseCursor = () => {
    let [pointer, setPointer] = useState(gridPortalBot.tags.pointerPixel)

    // useEffect(() => {
    //     let it = setInterval(() => {
    //         setPointer(gridPortalBot.tags.pointerPixel)
    //     }, 50)
    //     return () => {
    //         clearInterval(it)
    //     }
    // }, [])

    const recurPointer = async () => {
        setPointer(gridPortalBot.tags.pointerPixel)
        await os.sleep(50);
        if(masks.pointer){
            recurPointer()
        }
    }

    recurPointer();

    return (
        <>
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
            <div class='followCursor' style={{ position: 'absolute', left: pointer.x + 10, top: pointer.y - 30, 'background-color': 'transparent', zIndex: "100" }}>
                <div style={{ with: 'fit-content', 'z-index': 100, 'user-select': 'none', color: 'black', background: 'transparent' }} class="tool landmark">
                    {type === "text_tool" ? <span class="material-symbols-outlined"> title </span> :
                        type === "mind_map" ? <span class="material-symbols-outlined"> mindfulness </span> :
                            type === "eraser" ? <span class="material-symbols-outlined">ink_eraser_off</span> :
                                type === "animation" ? <span class="material-symbols-outlined">animation</span> :
                                    type === "annotation" ? <span class="material-symbols-outlined">publish</span> :
                                        type === "newAnnot" ? <span class="material-symbols-outlined">content_copy</span> :
                                            type === "loading" ? <span class="material-symbols-outlined">hourglass_empty</span> :
                                                type === "timeLine" ? <span class="material-symbols-outlined">account_tree</span> :
                                                    type === "bible-stack" ? <span class="material-symbols-outlined">book_5</span> :
                                                        type === "bible_map" ? <span class="material-symbols-outlined">map</span> :
                                                            type === "loading" ? <span class="material-symbols-outlined">hourglass_empty</span> :
                                                                <span class="material-symbols-outlined">mindfulness</span>
                    }
                </div>
            </div>
            <style>{tags['Styles.css']}</style>
            <style>{tags['panal.css']}</style>
        </>
    )
}
os.compileApp('mouseCursor', <MouseCursor />)