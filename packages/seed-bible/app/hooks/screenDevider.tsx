const { useEffect, useState, useRef, useMemo, createContext, useContext } = os.appHooks;

import { useBibleContext } from 'app.hooks.bibleVariables'


const DivSpliter = ({
    children,
    otherTab,
    split = true,
    stop,
    initialWidth = 600,
    initialHeight = 400,
    containerWidth = 800, // Maximum container width
    containerHeight = 600, // Maximum container height
    appWidth,
    onResize = () => { }, // Callback for parent to track resizing
}) => {
    const [width, setWidth] = useState(300);
    const [height, setHeight] = useState(initialHeight);
    const [isDragging, setIsDragging] = useState(false);
    const { screens } = useBibleContext();

    useEffect(() => {
        setWidth(300)
    }, [screens])

    const handleDragStart = () => setIsDragging(true);

    const handleDragMove = (e) => {
        if (!isDragging) return;

        if (split) {
            const newWidth = Math.max(100, Math.min(width + e.movementX, containerWidth - 100));
            setWidth(newWidth);
            onResize(newWidth, height);
        } else {
            const newHeight = Math.max(100, Math.min(height + e.movementY, containerHeight - 100));
            setHeight(newHeight);
            onResize(width, newHeight);
        }
    };

    const handleDragEnd = () => setIsDragging(false);

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: split ? 'row' : 'column',
                width: isDragging ? `${containerWidth}px` : '100%',
                height: `100dvh`,
                position: 'relative',
                overflow: 'hidden',
                transition: isDragging ? 'none' : 'width 0.3s', // Only animate when not dragging
            }}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
        >
            <div
                style={{
                    flex: 'none',
                    width: split ? `${width}px` : '100%',
                    backgroundColor: '',
                }}
            >
                {children}
            </div>
            {split && (
                <div
                    style={{
                        width: '2px',
                        cursor: 'col-resize',
                        backgroundColor: 'black',
                        position: 'absolute',
                        bottom: 0,
                        left: `${width}px`,
                        height: '98%',
                    }}
                    onMouseDown={handleDragStart}
                />
            )}
            {split && <div style={{ height: '100%', width: '100%', background: 'white', padding: '10px', }}>{otherTab}</div>}
        </div>
    );
};

// // Parent Component with Nested DivSpliter
// const App = () => {
//     const handleResize = (newWidth, newHeight) => {
//         console.log('Parent resized:', newWidth, newHeight);
//     };

//     return (
//         <div class="theTest">
//             <DivSpliter
//                 split={true}
//                 initialWidth={300}
//                 containerWidth={gridPortalBot.tags.pixelWidth}
//                 containerHeight={gridPortalBot.tags.pixelHeight}
//                 onResize={handleResize}
//                 otherTab={
//                     <div style={{ height: '100%' }}>Nested Tab</div>
//                 }
//             >
//                 <div style={{ height: '100%' }}>Main Content</div>
//             </DivSpliter>
//         </div>
//     );
// };

export { DivSpliter }