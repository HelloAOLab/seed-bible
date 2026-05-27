import { useTestamentContext } from "managers.MapsManager.TestamentContext"
const { useMemo, useCallback, useState } = os.appHooks;

export const TestamentLine = ({ toggleshowContent }) => {

    const { testament } = useTestamentContext()
    const [nameHovered, setNameHovered] = useState(false);

    const fixedTestamentColor = useMemo(() => {
        return testament.color ?? "#000000"
    }, [])

    const handlePointerEnter = useCallback(() => {
        setNameHovered(true)
    }, [])

    const handlePointerLeave = useCallback(() => {
        setNameHovered(false)
    }, [])

    const textColor = useMemo(() => {
        return GetTextColorBasedOnBackground(fixedTestamentColor)
    }, [])

    return (
        <div className="testamentLineContainer">
            <div style={{ backgroundColor: fixedTestamentColor }}></div>
            <span
                onPointerEnter={handlePointerEnter}
                onPointerLeave={handlePointerLeave}
                onClick={toggleshowContent}
                style={{
                    borderColor: fixedTestamentColor,
                    backgroundColor: nameHovered ? textColor : fixedTestamentColor,
                    color: nameHovered ? fixedTestamentColor : textColor,
                }}
            >
                {testament.name}
            </span>
            <div style={{ backgroundColor: fixedTestamentColor }}></div>
        </div>
    )
}