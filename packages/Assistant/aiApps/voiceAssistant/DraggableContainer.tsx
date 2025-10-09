const { useState, useRef, useEffect } = os.appHooks;

const DraggableContainer = ({ children, isFullScreen }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({
        x: window.innerWidth - 300,
        y: 20
    });
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const dragRef = useRef(null);

    const handleMouseDown = (e) => {
        setIsDragging(true);
        const rect = dragRef.current.getBoundingClientRect();
        setOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
        e.preventDefault();
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - offset.x,
            y: e.clientY - offset.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging]);

    const modelStyle = {
        cursor: isDragging ? 'grabbing' : 'grab',
        position: 'fixed',
        top: position.y,
        left: position.x
    }

    const fullscreenStyle = {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100dvw",
        height: "100dvh",
    }

    return (
        <div
            ref={dragRef}
            className="draggable ai-container"
            style={isFullScreen ? fullscreenStyle : modelStyle}
            onMouseDown={handleMouseDown}
            onContextMenu={e => e.stopPropagation()}
        >
            {children}
        </div>
    );
};

export default DraggableContainer;