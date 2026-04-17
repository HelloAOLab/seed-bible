const { useState, useRef, useEffect } = os.appHooks;

const DraggableContainer = (props: { children: HTMLElement }) => {
  const { children } = props;
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(
    masks?.position || {
      x: 180,
      y: window.innerHeight / 2,
    }
  );
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
      tag === "button"
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

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    });
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
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging]);

  useEffect(() => {
    document.addEventListener("keydown", onESC);
    return () => {
      document.removeEventListener("keydown", onESC);
    };
  }, []);

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
      onMouseDown={handleMouseDown}
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
