const { useState, useRef, useLayoutEffect } = os.appHooks;

const sizes = [{
    size: '8px',
    value: 's'
},
{
    size: '12px',
    value: 'm'
},
{
    size: '16px',
    value: 'l'
}]

// Create a Map: size => value
const sizeToValueMap = new Map(sizes.map(item => [item.size, item.value]));

const VideoOverlay = () => {

    const [size, setSize] = useState('s');

    const [position, setPosition] = useState({ x: 50, y: 50 }); // px from top/left
    const draggingRef = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const initialPos = useRef({ x: 0, y: 0 });
    const lastPosBeforeFullScreen = useRef({ x: 0, y: 0 });
    const lastSizeBeforeFullScreen = useRef('s');


    const videoRef = useRef(null);

    const StartVideo = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            } else {
                console.warn('videoRef.current is still null!');
            }
        } catch (err) {
            console.error('Error starting video:', err);
        }
    }

    useLayoutEffect(() => {
        StartVideo();
        return async () => {
            if (videoRef.current) {
                videoRef.current.srcObject?.getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
        }
    }, [])

    // ✅ Real-time drag handlers
    const handleMouseDown = (e) => {
        if (`${position.x}`.endsWith('w')) return;
        draggingRef.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY };
        initialPos.current = { ...position };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
        if (!draggingRef.current) return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setPosition({
            x: initialPos.current.x + dx,
            y: initialPos.current.y + dy,
        });
    };

    const handleMouseUp = () => {
        draggingRef.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

    return <>
        <style>{thisBot.tags['ShowPersonVideoOverlay.css']}</style>
        <div
            onMouseDown={handleMouseDown}
            style={{
                top: `${position.y}${`${position.y}`.endsWith('h') ? '' : 'px'}`,
                left: `${position.x}${`${position.x}`.endsWith('w') ? '' : 'px'}`,
                transition: '0.01s linear all'
            }}
            className={`person-video-overlay ${size}`}
        >
            <video poster={`https://dummyimage.com/240x240/000/fff&text=Preview`} className={`size-${size}`} autoPlay={true} muted={true} controls={false} ref={videoRef} playsInline />
            <div className="control-overlay">
                <span class="material-symbols-outlined" onClick={() => globalThis.ToggleVideoLayout()}>
                    close
                </span>
                {sizes.map(ele => {
                    return <div className={`person-video-size ${size === ele.value ? 'active' : ''}`} onClick={() => setSize(ele.value)} style={{ height: ele.size, width: ele.size, backgroundColor: 'black' }} />
                })}
                <span class="material-symbols-outlined" onClick={() => {
                    // console.log("lastSizeBeforeFullScreen.current", lastPosBeforeFullScreen.current, lastSizeBeforeFullScreen.current, size);
                    if (size === 'full') {
                        setSize(lastSizeBeforeFullScreen.current);
                        setPosition({
                            ...lastPosBeforeFullScreen.current
                        });
                    } else {
                        setTimeout(() => {
                            lastPosBeforeFullScreen.current = {
                                x: position.x,
                                y: position.y
                            }
                            lastSizeBeforeFullScreen.current = size;
                            setSize('full');
                            setPosition({
                                x: '5dvw',
                                y: '10dvh'
                            });
                        }, 50);
                    }
                }}>
                    {size === 'full' ? 'fullscreen_exit' : 'fullscreen'}
                </span>
            </div>
        </div >
    </>
};


return VideoOverlay;

