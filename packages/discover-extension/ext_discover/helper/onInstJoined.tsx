import { definePlaylistGlobals } from "ext_discover.helper.definePlaylistGlobals";

export function onInstJoined(_that: any, _thisBot: any) {
  definePlaylistGlobals();
}
