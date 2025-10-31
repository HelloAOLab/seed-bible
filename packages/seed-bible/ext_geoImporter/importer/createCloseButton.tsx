
await os.unregisterApp('userPresent');
await os.unregisterApp("userOptions");
// os.appHooks.render(<></>, document.body);

const dim = os.getCurrentDimension();
os.unregisterApp('closeButton')
await os.registerApp('closeButton', thisBot);

const { useEffect,useState, useRef, useCallback } = os.appHooks;

function App() {
    const close = useCallback(() => {
      that?.close ? that.close() : null;
      os.unregisterApp('showTutorial');
      shout("initUi")
      shout("closeMiniMapPortal");
    }, [])

    const reset = useCallback(() => {
      const currElements = getBots(byTag(tags.targetDim, true))
      if (currElements.length > 0) {
          destroy(currElements);
      }
    }, [])

  return (
    <>
      <style>{
        `
          .DonationStackButton {
            display: "none"
          }
        `
      }</style>
        <button onClick={close} class={`custom-button-1 chaism-close-btn ${masks.blinkClose ? "close-blink" : ""}`} style={{zIndex: 10005}}>
            ➲ Quit   
        </button>
        <style>{tags["Close.css"]}</style>
    </>
  );
}

os.compileApp('closeButton',<App />)