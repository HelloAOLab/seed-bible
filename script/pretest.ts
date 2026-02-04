import { minifyAll } from "./lib/minify";
import { packageAll } from "./lib/package";

await packageAll("ignore");
await minifyAll("ignore");
