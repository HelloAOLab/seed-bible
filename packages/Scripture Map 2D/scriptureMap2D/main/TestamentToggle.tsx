import { useTestamentContext } from "scriptureMap2D.main.TestamentContext"
// const { useMemo, useCallback, useState } = os.appHooks;

export const TestamentToggle = ({ toggleshowContent, showingContent }) => {

    const { testament } = useTestamentContext()

    // const fixedTestamentColor = useMemo(() => {
    //     return testament.color ?? "#000000"
    // }, [])

    // const textColor = useMemo(() => {
    //     return GetTextColorBasedOnBackground(fixedTestamentColor)
    // }, [])

    return (
        <div className="toggle testamentToggle" onClick={toggleshowContent} >
            <span>{testament.name}</span>
            <span className="material-symbols-outlined">{showingContent ? "keyboard_arrow_up" : "keyboard_arrow_down"}</span>
        </div>
    )
}