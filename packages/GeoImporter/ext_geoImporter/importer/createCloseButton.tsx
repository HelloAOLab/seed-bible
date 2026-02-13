os.unregisterApp("closeButton");
await os.registerApp("closeButton", thisBot);

const { useCallback } = os.appHooks;

function App() {
  const close = useCallback(() => {
    if (that?.close) {
      that.close();
    }
    if (that?.action) {
      that.action();
    }
    shout("closeMiniMapPortal");
  }, []);

  return (
    <>
      <button
        onClick={close}
        class={`custom-button-1 canvas-bound chaism-close-btn ${masks.blinkClose ? "close-blink" : ""}`}
        style={{ zIndex: 10005 }}
      >
        {that?.closeBtnTitle ? that.closeBtnTitle : "➲ Quit"}
      </button>
      <style>{tags["Close.css"]}</style>
    </>
  );
}

os.compileApp("closeButton", <App />);
