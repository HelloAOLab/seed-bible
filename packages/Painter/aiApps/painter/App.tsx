import DraggableContainer from 'aiApps.painter.DraggableContainer';

const style = tags["App.css"]

const { useState, useEffect, useRef, render, useCallback } = os.appHooks;

let painterStorageApp = bot.CreatePainterStorage();

const App = () => {
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const [drawingEnabled, setDrawingEnabled] = useState(false);
    const [currentColor, setCurrentColor] = useState(null);
    const [availableColor, setAvailableColor] = useState([
        '#000000',
        '#FF5252',
        '#7C4DFF',
        '#448AFF',
        '#18FFFF',
        '#69F0AE',
        '#FFFF00',
        '#FFAB40'
    ])
    const [brushSize, setBrushSize] = useState(5);
    const isDrawing = useRef(false);
    const lastPosition = useRef({ x: 0, y: 0 });
    const lastUserInputTO = useRef(null);
    const [customText, setCustomText] = useState(null);
    const [drawingData, setDrawingData] = useState([]);
    const isSyncing = useRef(false);
    const currentStroke = useRef(null);

    const saveDrawingDebounced = useCallback((newDrawingData) => {
        setTagMask(painterStorageApp, 'drawingData', JSON.stringify(newDrawingData), 'shared');
    }, []);

    useEffect(() => {
        const initializeCanvas = async () => {
            const canvas = canvasRef.current;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const ctx = await canvas.getContext('2d');
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = 1;
            ctxRef.current = ctx;

            // Load existing drawing data
            const savedData = getBot('system', 'aiApps.painterStorage').masks.drawingData;
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                setDrawingData(parsedData);
                redrawCanvas(parsedData);
            }
        };

        initializeCanvas();

        // Listen for storage events from other tabs
        const handleStorageChange = (e) => {
            if (e.newValue) {
                console.log("syncing")
                isSyncing.current = true;
                const newData = JSON.parse(e.newValue);

                // Merge and sort by timestamp to resolve conflicts
                const mergedData = mergeDrawingData(drawingData, newData);
                setDrawingData(mergedData);
                redrawCanvas(mergedData);

                setTimeout(() => {
                    isSyncing.current = false;
                }, 100);
            }
        };

        globalThis.HandleStorageChange = handleStorageChange;

        // window.addEventListener('storage', handleStorageChange);

        const resizeCanvas = () => {
            if (!ctxRef.current) return;
            const canvas = canvasRef.current;
            const ctx = ctxRef.current;
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            ctx.putImageData(imageData, 0, 0);
        };

        window.addEventListener('resize', resizeCanvas);

        return () => {
            // window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('resize', resizeCanvas);
            saveDrawingDebounced.cancel();
            globalThis.HandleStorageChange = null;
        };
    }, []);

    const mergeDrawingData = (currentData, newData) => {
        const allStrokes = [...currentData, ...newData];

        // Remove duplicates by ID (using timestamp + points hash)
        const uniqueStrokes = allStrokes.reduce((acc, stroke) => {
            const strokeId = `${stroke.timestamp}-${JSON.stringify(stroke.points.slice(0, 3))}`;
            if (!acc.has(strokeId)) {
                acc.set(strokeId, stroke);
            }
            return acc;
        }, new Map());

        // Convert back to array and sort by timestamp
        return Array.from(uniqueStrokes.values())
            .sort((a, b) => a.timestamp - b.timestamp);
    };

    const redrawCanvas = (data) => {
        if (!ctxRef.current) return;

        const ctx = ctxRef.current;
        const canvas = canvasRef.current;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Redraw all strokes in chronological order
        data.forEach(stroke => {
            if (stroke.points.length < 2) return;

            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

            for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }

            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.size;
            ctx.stroke();
        });
    };

    const saveDrawing = (strokeData) => {
        if (isSyncing.current) return;

        let timestamp = Date.now();

        const strokeWithTimestamp = {
            ...strokeData,
            timestamp
        };

        const newDrawingData = [...drawingData, strokeWithTimestamp];

        setDrawingData(newDrawingData);

        saveDrawingDebounced(newDrawingData);

        setTimeout(() => {
            const savedData = getBot('system', 'aiApps.painterStorage').masks.drawingData;
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                const newData = [...parsedData.filter(item => item.timestamp > Date.now() - 5000)]
                setDrawingData(newData);
                redrawCanvas(newData);
                saveDrawingDebounced(newData);
            }
        }, 5500)
    };

    const startDrawing = (e) => {
        if (!drawingEnabled) return;

        isDrawing.current = true;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        lastPosition.current = { x, y };

        // Initialize new stroke
        currentStroke.current = {
            color: currentColor,
            size: brushSize,
            points: [{ x, y }],
            timestamp: Date.now()
        };
    };

    const draw = (e) => {
        if (!isDrawing.current || !drawingEnabled || !ctxRef.current) return;

        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        const rect = canvas.getBoundingClientRect();

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(lastPosition.current.x, lastPosition.current.y);
        ctx.lineTo(x, y);

        ctx.strokeStyle = currentColor;
        ctx.lineWidth = brushSize;
        ctx.stroke();

        // Add point to current stroke
        if (currentStroke.current) {
            currentStroke.current.points.push({ x, y });
        }

        lastPosition.current = { x, y };
    };

    const stopDrawing = () => {
        if (isDrawing.current && currentStroke.current && currentStroke.current.points.length > 1) {
            // Save the completed stroke
            saveDrawing(currentStroke.current);
            currentStroke.current = null;
        }
        isDrawing.current = false;
    };

    const clearCanvas = () => {
        if (!ctxRef.current) return;
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Clear stored data and notify other tabs
        const emptyData = [];
        setDrawingData(emptyData);
        setTagMask(painterStorageApp, 'drawingData', JSON.stringify(emptyData), 'shared');
    };

    const toggleDrawing = () => {
        setDrawingEnabled(!drawingEnabled);
    };

    const handleTouchStart = (e) => {
        if (!drawingEnabled) return;

        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvasRef.current.dispatchEvent(mouseEvent);
    };

    const handleTouchMove = (e) => {
        if (!drawingEnabled) return;

        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvasRef.current.dispatchEvent(mouseEvent);
    };

    const handleTouchEnd = () => {
        const mouseEvent = new MouseEvent('mouseup');
        canvasRef.current.dispatchEvent(mouseEvent);
    };

    const handleColorChange = (color) => {
        if (color === currentColor) {
            setDrawingEnabled(false);
            setCurrentColor(null);
        } else {
            setDrawingEnabled(true);
            setCurrentColor(color);
        }
    }

    const [value, setValue] = useState(50);
    const sliderRef = useRef(null);

    const handleInput = (e) => {
        setValue(parseInt(e.target.value));
    };

    const handleTrackClick = (e) => {
        if (!sliderRef.current) return;

        const track = sliderRef.current;
        const rect = track.getBoundingClientRect();
        const clickY = rect.bottom - e.clientY; // Calculate from bottom
        const percentage = (clickY / rect.height) * 100;
        const newValue = Math.max(1, Math.min(100, Math.round(percentage)));

        setValue(newValue);
    };

    const thumbSize = 10 + (value / 100) * 30;

    useEffect(() => {
        setBrushSize(Math.floor(value / 5))
    }, [value])

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('touchend', handleTouchEnd);

        return () => {
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
        };
    }, [drawingEnabled]);

    return (
        <>
            <style>{style}</style>
            <div onContextMenu={e => {
                e.stopPropagation()
            }} className="app" style={{ pointerEvents: drawingEnabled ? "all" : "none" }}>
                <canvas
                    ref={canvasRef}
                    className={`drawing-canvas ${!drawingEnabled ? 'canvas-disabled' : ''}`}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                />
                <DraggableContainer>
                    <div className="toolbar">
                        <button className="doneBtn" onClick={() => whisper(thisBot, "closePainter")}>Done</button>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            <div className="tool-section">
                                <div className="color-options">
                                    {
                                        availableColor.map(color => {
                                            return <div
                                                onMouseDown={e => e.stopPropagation()}
                                                className={`color-option ${currentColor === color ? 'active' : ''}`}
                                                style={{ backgroundColor: color }}
                                                onClick={() => handleColorChange(color)}
                                            ></div>
                                        })
                                    }
                                </div>
                            </div>
                            <div className="tool-section">
                                <div className="container" onMouseDown={e => e.stopPropagation()}>
                                    <div
                                        ref={sliderRef}
                                        className="sliderTrack"
                                        onClick={handleTrackClick}
                                    >
                                        <div className="trackBackground" style={{
                                            background: `linear-gradient(to right, rgba(255, 255, 255, 0.1) 0%, ${currentColor || 'rgba(0,0,0,0.5)'} 50%)`
                                        }}></div>
                                        <div
                                            className="sliderThumb"
                                            style={{
                                                left: `${value < 93 ? value < 3 ? 3 : value : 93}%`,
                                                width: `${thumbSize}px`,
                                                height: `${thumbSize}px`,
                                                border: `1px solid ${currentColor}`
                                            }}
                                        ></div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="100"
                                            value={value}
                                            onChange={handleInput}
                                            class="sliderInput"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </DraggableContainer >
            </div >

        </>
    );
};

export default App;
