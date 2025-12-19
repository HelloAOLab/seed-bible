const { Button } = Components;
const { useState, useLayoutEffect, useRef, useEffect } = os.appHooks;

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

  // ⭐ Add event listeners for video and iframe tags
  useEffect(() => {
    if (!containerRef.current) return;

    // Function to add overlays to iframes
    const addOverlaysToIframes = () => {
      if (!containerRef.current) return;
      const iframes = containerRef.current.querySelectorAll("iframe");
      iframes.forEach((iframe) => {
        // Skip if already wrapped or has overlay
        if (iframe.parentElement?.classList.contains("iframe-wrapper") || 
            iframe.parentElement?.querySelector(".iframe-click-overlay")) {
          return;
        }
        
        // Create wrapper
        const wrapper = document.createElement("div");
        wrapper.style.position = "relative";
        wrapper.style.display = "inline-block";
        wrapper.className = "iframe-wrapper";
        
        // Create overlay
        const overlay = document.createElement("div");
        overlay.className = "iframe-click-overlay";
        overlay.style.position = "absolute";
        overlay.style.inset = "0";
        overlay.style.zIndex = "10";
        overlay.style.cursor = "pointer";
        overlay.style.background = "transparent";
        overlay.style.pointerEvents = "auto";
        
        // Wrap iframe
        iframe.parentNode?.insertBefore(wrapper, iframe);
        wrapper.appendChild(iframe);
        wrapper.appendChild(overlay);
      });
    };

    // Function to handle video clicks
    const handleVideoClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const src = e.target.getAttribute("src");
      if (!src) return;
      
      thisBot.VideoPlayer({
        src: src,
      });
    };

    // Function to handle iframe overlay clicks
    const handleIframeOverlayClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const iframe = e.target.parentElement?.querySelector("iframe");
      if (!iframe) return;
      const src = iframe.getAttribute("src");
      if (!src) return;
      
      const linkDetails = validateUrl(src);
      
      if(linkDetails.isValid && linkDetails.type === "youtube") {
        thisBot.VideoPlayer({
          src: src,
          isYoutube: true,
          videoID: linkDetails.videoId,
        });
        return;
      }

      if(linkDetails.isValid && linkDetails.type === "video") {
        thisBot.VideoPlayer({
          src: src,
        });
        return;
      }

      if(linkDetails.isValid && linkDetails.type === "externalLink") {
        os.openURL(src);
        return;
      }
    };

    // Add overlays to iframes after DOM updates
    const timeoutId = setTimeout(() => {
      addOverlaysToIframes();
    }, 100);

    // Add click listeners to all video elements
    const videos = containerRef.current.querySelectorAll("video");
    videos.forEach((video) => {
      video.addEventListener("click", handleVideoClick);
    });

    // Add click listeners to all iframe overlays (using event delegation)
    const handleContainerClick = (e) => {
      if (e.target.classList && e.target.classList.contains("iframe-click-overlay")) {
        handleIframeOverlayClick(e);
      }
    };
    containerRef.current.addEventListener("click", handleContainerClick);

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      videos.forEach((video) => {
        video.removeEventListener("click", handleVideoClick);
      });
      if (containerRef.current) {
        containerRef.current.removeEventListener("click", handleContainerClick);
      }
    };
  }, [htmlContent, shouldRender, open]);


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
