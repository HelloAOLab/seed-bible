const { Button } = Components;
const { useState, useEffect, useRef } = os.appHooks;

const RenderHTMLContent = ({ htmlContent }) => {
    const [shouldRender, setShouldRender] = useState(false);
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const height = containerRef.current?.offsetHeight || 0;
        if (height > 60) {
            setShouldRender(true);
        }
    }, [htmlContent]);

    return (
        <div>
            <div
                ref={containerRef}
                style={{ height: shouldRender ? open ? 'auto' : '60px' : 'auto', overflow: 'hidden', transition: 'all 0.2s linear' }}
                dangerouslySetInnerHTML={{ __html: htmlContent }}
            />

            {shouldRender && (
                <Button secondaryAlt style={{ width: '100%', textAlign: 'center', marginTop: '0.25rem' }} onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
                    {open ? 'Show Less' : 'Show All'}
                </Button>
            )}
        </div>
    );
};

return RenderHTMLContent;