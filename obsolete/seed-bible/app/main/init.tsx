import { Root } from "app.main.root";
import { allTheInitFluff } from "app.main.tempFluff";
import { CanvasStyle } from "app.main.canvasController";

const canvasStyleName = "CanvasStyle";
await os.unregisterApp(canvasStyleName);
os.registerApp(canvasStyleName, thisBot);

await allTheInitFluff();

os.appHooks.render(<Root />, document.body);

os.compileApp(canvasStyleName, <CanvasStyle />);
