const {useRef, useState, useLayoutEffect } = os.appHooks;

const LowerCaseBookMapping = thisBot.tags.LowerCaseBookMapping;

const splitBookAndVerse = (text) => {
  if (!text) return { book: text, verse: "" };

  const match = text.match(/^(.*?)(\s+\d+:\d+)$/);

  if (!match) {
    return { book: text, verse: "" };
  }

  return {
    book: match[1].trim(),   // "Genesis"
    verse: match[2].trim(),  // "1:2"
  };
};

const GetLabel = ({ value, currentOpenedBook, widthCompare = 176 }) => {
    const containerRef = useRef(null);
    const [isMobile, setIsMobile] = useState(false);

  
    const { book, verse } = splitBookAndVerse(currentOpenedBook?.book);
  
    useLayoutEffect(() => {
      // Go up 3 levels
      const targetElement = containerRef.current.parentElement?.parentElement;
  
      if (!targetElement) {
        console.warn("GetLabel: Could not find 3rd parent");
        return;
      }
  
      const observer = new ResizeObserver((entries) => {
        const width = entries[0].contentRect.width;
        setIsMobile(width < widthCompare);
      });
  
      observer.observe(targetElement);
  
      return () => observer.disconnect();
    }, []);
  
    return (
      <span ref={containerRef}>
        {value === "discover"
          ? `${
              !isMobile
                ? book
                : LowerCaseBookMapping[
                  book?.toLocaleLowerCase()
                  ]
            } ${currentOpenedBook?.chapter ? `- ${currentOpenedBook?.chapter}` : ''}${verse}`
          : ""}
      </span>
    );
  };
  
  
  globalThis.GetLabel = GetLabel;