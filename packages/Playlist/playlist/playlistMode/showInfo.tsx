const message = that || "Playlist Mode";
const G = globalThis;
const { FloatingBanner } = G.Components;

os.unregisterApp("message");
os.registerApp("message", thisBot);

const InfoMessage = () => (
  <FloatingBanner>
    <b>{message}</b>
  </FloatingBanner>
);

os.compileApp("message", <InfoMessage />);
