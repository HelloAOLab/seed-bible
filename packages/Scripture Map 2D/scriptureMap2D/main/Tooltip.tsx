const {useRef, useState, useEffect} = os.appHooks

export const Tooltip = ({ content, anchor }) => {
    const ref = useRef(null);
    const [style, setStyle] = useState({ top: anchor.y, left: anchor.x, "--arrowLeft": "50%" });
    const [direction, setDirection] = useState("up");

    useEffect(() => {
        if (!ref.current) return;

        const rect = ref.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth
        const offset = 8;

        let newDirection = "up";

        if (anchor.y - rect.height - offset < 0) 
        {
            newDirection = "down";
        }

        let newLeft = anchor.x;
        const halfWidth = rect.width / 2;
        let newArrowLeft = "50%"
        
        if (anchor.x - halfWidth < 0) 
        {
            newLeft = halfWidth;
        } 
        else if (anchor.x + halfWidth > viewportWidth) 
        {
            newLeft = viewportWidth - halfWidth;
        }

        const leftDiff = newLeft - anchor.x;
        if(leftDiff !== 0)
        {
            const leftDiffPercent = Math.round((leftDiff / rect.width) * 100);
            newArrowLeft = `${50 - leftDiffPercent}%`
        }

        setDirection(newDirection);
        setStyle({ top: anchor.y, left: newLeft, "--arrowLeft": newArrowLeft });
    }, [anchor]);

    return (
        <span ref={ref} className={`tooltip tooltip-${direction}`} style={style}>
            {content}
        </span>
    );
};