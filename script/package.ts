import { minifyAll } from "./lib/minify.js";
import { packageAll } from "./lib/package.js";

await packageAll();
await minifyAll();
