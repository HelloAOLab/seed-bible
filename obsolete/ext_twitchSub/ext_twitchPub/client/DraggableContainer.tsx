const { useState, useRef, useEffect } = os.appHooks;

const DraggableContainer = (props: { children: HTMLElement }) => {
  const { children } = props;
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(
    masks?.position || {
      x: window.innerWidth / 2 - 175,
      y: window.innerHeight / 2 - 175,
    }
  );
  const [windowSize, setWindowSize] = useState(window.innerWidth);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: MouseEvent) => {
    if (!dragRef.current) return;
    const target = e.target as HTMLElement;
    const tag = target.tagName.toLowerCase();
    if (
      tag === "select" ||
      tag === "option" ||
      tag === "input" ||
      tag === "textarea" ||
      tag === "button" ||
      tag === "path" ||
      tag === "svg"
    )
      return;
    setIsDragging(true);
    const rect = dragRef.current.getBoundingClientRect();
    setOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    e.preventDefault();
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (!dragRef.current) return;
    const target = e.target as HTMLElement;
    const tag = target.tagName.toLowerCase();
    if (
      tag === "select" ||
      tag === "option" ||
      tag === "input" ||
      tag === "textarea" ||
      tag === "button" ||
      tag === "path" ||
      tag === "svg"
    )
      return;
    setIsDragging(true);
    const rect = dragRef.current.getBoundingClientRect();
    setOffset({
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    });
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    });
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    if (e.touches.length > 1) return;
    if (!dragRef.current) return;
    if (e.touches[0]) {
      setPosition({
        x: e.touches[0].clientX - offset.x,
        y: e.touches[0].clientY - offset.y,
      });
    }
  };

  const handleMouseUp = (e: MouseEvent) => {
    setIsDragging(false);
    setTagMask(
      thisBot,
      "position",
      {
        x: e.clientX - offset.x,
        y: e.clientY - offset.y,
      },
      "local"
    );
  };

  const handleTouchEnd = (e: TouchEvent) => {
    setIsDragging(false);
    if (e.changedTouches[0]) {
      setTagMask(
        thisBot,
        "position",
        {
          x: e.changedTouches[0].clientX - offset.x,
          y: e.changedTouches[0].clientY - offset.y,
        },
        "local"
      );
    }
  };

  const onESC = (evt: Event) => {
    let isEscape = false;
    if ("key" in evt) {
      isEscape = evt.key === "Escape" || evt.key === "Esc";
    } else {
      isEscape = (evt as KeyboardEvent).code === "Escape";
    }
    if (isEscape) {
      whisper(thisBot, "closeInterface");
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("touchend", handleTouchEnd);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [isDragging]);

  useEffect(() => {
    document.addEventListener("keydown", onESC);
    return () => {
      document.removeEventListener("keydown", onESC);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize(window.innerWidth);
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (windowSize < 700) {
      setPosition({
        x: window.innerWidth / 2 - 175,
        y: window.innerHeight / 2 - 175,
      });
    }
  }, [windowSize]);

  return (
    <div
      ref={dragRef}
      className="draggable"
      style={{
        cursor: isDragging ? "grabbing" : "grab",
        position: "fixed",
        top: position.y,
        left: position.x,
        zIndex: 10,
      }}
      onMouseDown={(e) => {
        if (windowSize < 768) return;
        handleMouseDown(e);
      }}
      onTouchStart={(e) => {
        if (windowSize < 768) return;
        handleTouchStart(e);
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
      }}
      id="draggable-container"
    >
      {children}
    </div>
  );
};

export default DraggableContainer;
