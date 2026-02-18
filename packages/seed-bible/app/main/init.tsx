import { Root } from "app.main.root";
import { allTheInitFluff } from "app.main.tempFluff";

await allTheInitFluff();

os.appHooks.render(<Root />, document.body);
