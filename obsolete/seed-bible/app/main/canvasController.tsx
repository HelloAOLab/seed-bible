import { globalAPI } from "app.controller.controllerBuilder";

const { useEffect, useMemo, useState } = os.appHooks;

export interface ExpectedCanvasStylePosition extends Record<
  string,
  string | number
> {
  left: 0;
  top: 0;
  width: 600;
  height: 600;
}

export const CanvasStyle = () => {
  const [position, setPosition] = useState<ExpectedCanvasStylePosition>({
    left: 0,
    top: 0,
    width: 600,
    height: 600,
  });

  useEffect(() => {
    return CanvasStyleRegisterGlobalHook((newPosition) => {
      setPosition(newPosition);
    });
  }, []);

  const combinedStyle = useMemo(
    () => calcPositionNicheCombinedStyleFromObject(position),
    [position]
  );

  return (
    <>
      <style>{combinedStyle}</style>
    </>
  );
};

/**
 * Register a global hook to listen for canvas style position updates. This allows any part of the app to emit new positions for the canvas, and this component will update accordingly.
 */
function CanvasStyleRegisterGlobalHook(setterFn: (...args: any[]) => void) {
  globalAPI.hooks.on("setCanvasStylePositions", setterFn);
  return () => {
    globalAPI.hooks.off("setCanvasStylePositions", setterFn);
  };
}

/**
 * Convert a JSON object to CSS string. If the value is a number, assume pixels. If it's a string without any unit, also assume pixels.
 * TODO: Refactor to be more efficient and robust, and move to a utility file.
 * @param json
 * @returns
 */
function refactorme_jsonToCss(json: Record<string, string | number>) {
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
}

/**
 * Calculate the style string to be injected into the page for positioning the main content.
 */
function calcPositionNicheCombinedStyle(posCss: string) {
  return `
    #app-game-container, .main-content {
        position: fixed !important;
        ${posCss}
        z-index: 5;
        border-radius: 0px !important;
    }
`;
}

/**
 * Convenience function to convert a position object to combined CSS string.
 */
function calcPositionNicheCombinedStyleFromObject(
  styleObject: Record<string, string | number>
) {
  return calcPositionNicheCombinedStyle(refactorme_jsonToCss(styleObject));
}
