const { useRef, useState, useLayoutEffect } = os.appHooks;

const useDragRef = (props: any) => {
  const { onUploadFiles } = props;
  const dragRef = useRef<any>(null);
  const [dragState, setDragState] = useState<any>({
    isDragOver: false,
  });
  const dragCounter = useRef(0);

  useLayoutEffect(() => {
    const handleDragEnter = (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current += 1;
      if (dragCounter.current === 1) {
        setDragState({ isDragOver: true });
      }
    };

    const handleDragLeave = (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current -= 1;
      if (dragCounter.current === 0) {
        setDragState({ isDragOver: false });
      }
    };

    const handleDragOver = (e: any) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = async (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;

      const files = Array.from(e.dataTransfer.files);

      onUploadFiles({
        files,
      });

      setDragState({
        isDragOver: false,
      });
    };

    dragRef.current.addEventListener("dragenter", handleDragEnter);
    dragRef.current.addEventListener("dragleave", handleDragLeave);
    dragRef.current.addEventListener("dragover", handleDragOver);
    dragRef.current.addEventListener("drop", handleDrop);

    return () => {
      dragCounter.current = 0;
      dragRef.current.removeEventListener("dragenter", handleDragEnter);
      dragRef.current.removeEventListener("dragleave", handleDragLeave);
      dragRef.current.removeEventListener("dragover", handleDragOver);
      dragRef.current.removeEventListener("drop", handleDrop);
    };
  }, []);

  return { dragRef, dragState, setDragState };
};

export { useDragRef };
