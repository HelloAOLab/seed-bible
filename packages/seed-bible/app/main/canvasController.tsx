await os.unregisterApp("CanvasController");
os.registerApp("CanvasController", thisBot);

const { useState, useMemo, useEffect } = os.appHooks;

const jsonToCss = (json) => {
  return Object.entries(json)
    .map(([key, value]) => {
      const kebabKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      let val = value;

      // If it's a number, assume pixels
      if (typeof value === "number") {
        val = `${value}px`;
      }
      // If it's a string without any unit, also assume pixels
      else if (typeof value === "string" && !/[a-z%]+$/i.test(value)) {
        val = `${value}px`;
      }

      return `${kebabKey}: ${val} !important;`;
    })
    .join(" ");
};

const CanvasController = () => {
  // Only keep left, top, width, height
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    width: 600,
    height: 600,
  });
  const combinedStyle = useMemo(() => {
    const posCss = jsonToCss(position);
    return `
            #app-game-container, .main-content {
                position: fixed !important;
                ${posCss}
                z-index: 5;
                border-radius: 0px !important;
            }
        `;
  }, [position]);

  globalThis.SetCanvasPositions = setPosition;

  return (
    <>
      <style>{combinedStyle}</style>
    </>
  );
};

os.compileApp("CanvasController", <CanvasController />);
