import { registerDiscoverExtension } from "ext_discover.app.bootstrap";
import { definePlaylistGlobals } from "ext_discover.helper.definePlaylistGlobals";

if (that === "discover-extension") {
  definePlaylistGlobals();
  registerDiscoverExtension();
}
