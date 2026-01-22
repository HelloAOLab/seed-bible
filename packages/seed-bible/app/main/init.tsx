import { Root } from "app.main.root";
import { allTheInitFluff } from "app.main.tempFluff";

os.appHooks.render(<Root />, document.body);

await allTheInitFluff();
