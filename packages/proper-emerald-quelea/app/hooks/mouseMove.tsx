const { createContext, useContext, useState, useEffect } = os.appHooks;

const MyContext = createContext();
export function MouseMoveProvider({ children }) {
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [Element, setElement] = useState(null)
    const [isAbleToRightClick, setIsAbleToRightClick] = useState(false)
    globalThis.SetElement = setElement
    globalThis.SetIsDragging = setIsDragging
    // useEffect(() => {
    //     return () => {
    //         globalThis.SetElement = null
    //     }
    // }, [])
    // to be able to access it outside react elements
    globalThis.isAbleToRightClick = isAbleToRightClick
    return (
        <MyContext.Provider value={{ position, setPosition, setIsAbleToRightClick, isDragging, setIsDragging, Element, setElement }}>
            {isDragging && <div style={{ position: 'fixed', left: position.x, top: position.y, zIndex: '10000', 'pointer-events': 'none' }}>
                {Element.App}
            </div>}
            <div style={{ width: '100%', height: '100%', 'pointer-events': isAbleToRightClick ? 'none' : '' }}>
                {children}
            </div>
        </MyContext.Provider>
    );
}
export function useMouseMove() {
    return useContext(MyContext);
}

