import type {
  LoginManager,
  UserProfile,
} from "@packages/seed-bible/seed-bible/managers/LoginManager";
import type { TodayManager } from "@packages/seed-bible/seed-bible/managers/TodayManager";
import type { BibleTheme } from "@packages/seed-bible/seed-bible/managers/ThemeManager";
import type { TodayScreenProps } from "@packages/seed-bible/seed-bible/components/TodayPane/TodayPane";
import { signal } from "@preact/signals";

/**
 * Managers the Today screen takes as props, stubbed down to the members a given
 * test actually exercises.
 *
 * The casts live here rather than at every call site: a test that names five of
 * `TodayManager`'s twenty members is being deliberately narrow, and spelling out
 * the other fifteen would obscure which ones the behaviour under test depends
 * on. Passing a member the code needs but the stub omits fails loudly with an
 * "undefined is not a function", which is the failure you want.
 */
export function todayStub(parts: Partial<TodayManager>): TodayManager {
  return parts as unknown as TodayManager;
}

export function loginStub(parts: Partial<LoginManager>): LoginManager {
  return parts as unknown as LoginManager;
}

/** A `LoginManager` whose profile carries just a display name. */
export function loginWithName(name: string | undefined): LoginManager {
  return loginStub({
    userId: signal(name === undefined ? null : "user-1"),
    profile: signal(name === undefined ? null : ({ name } as UserProfile)),
  });
}

/**
 * A full `TodayScreenProps` for the two layout components, which pass the whole
 * bundle through. Component tests stub the hook they render with, so these
 * values only need to exist, not to be meaningful.
 */
export function todayScreenPropsStub(
  overrides: Partial<TodayScreenProps> = {}
): TodayScreenProps {
  return {
    today: todayStub({}),
    login: loginWithName("Tester"),
    bookmarks: signal([]),
    theme: signal({ variables: {} } as unknown as BibleTheme),
    isMobile: signal(false),
    onOpenPassage: vi.fn(),
    onOpenBookSelector: vi.fn(),
    onShowBookmarksList: vi.fn(),
    ...overrides,
  };
}
