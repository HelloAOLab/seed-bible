import { bootstrapExtension } from "tabernacle.infrastructure.di.bootstrap";

console.log(`[Debug] Tabernacle onExtensionInstalled`, that);
if (that === "tabernacle") {
  bootstrapExtension();
}
