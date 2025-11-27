const { Button } = Components;
const { useState, useLayoutEffect, useRef } = os.appHooks;

const RenderHTMLContent = ({ htmlContent }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    // If html content contains image, video , iframe, audio, etc. then set shouldRender to true
    const hasMedia = htmlContent.includes("img") || htmlContent.includes("video") || htmlContent.includes("iframe") || htmlContent.includes("audio");
    if (hasMedia) {
      setShouldRender(true);
    } else {
      const height = containerRef.current?.offsetHeight || 0;
      console.log(height,containerRef.current,htmlContent);
      if (height > 60 && !shouldRender) {
        setShouldRender(true);
      }
    }
  }, [htmlContent]);

  return (
    <div>
      <div
        ref={containerRef}
        style={{
          overflow: "hidden",
          height: shouldRender ? (open ? "auto" : "60px") : "auto",
          textTransform: "none",
          transition: "all 0.2s linear",
          paddingRight: "1.25rem",
        }}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      {shouldRender && (
        <span
          style={{
            textAlign: "center",
            cursor: "pointer",
            fontSize: "12px",
            color: "#D36433",
            marginTop: "0.25rem",
          }}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
        >
          {open ? "Show Less" : "Show more"}
        </span>
      )}
    </div>
  );
};

return RenderHTMLContent;
