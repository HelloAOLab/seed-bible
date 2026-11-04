import { SHARED_CONTENT_TYPES } from "@packages/seed-bible/seed-bible/managers/DiscoverSharedContentTypes";

/** This extension's id, which is also its i18n namespace. */
export const THEOGRAPHIC_EXTENSION_ID = "theographic-extension";

/**
 * Core's shared sections, which other providers' people, places and events
 * land in too. `init.tsx` holds them while the extension is installed.
 */
export const PERSON_CONTENT_TYPE = SHARED_CONTENT_TYPES.person;
export const PLACE_CONTENT_TYPE = SHARED_CONTENT_TYPES.place;
export const EVENT_CONTENT_TYPE = SHARED_CONTENT_TYPES.event;
